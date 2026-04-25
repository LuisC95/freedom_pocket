'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HeroCard } from './HeroCard'
import { RecurringBanner } from './RecurringBanner'
import { TransactionSlider } from './TransactionSlider'
import { AddTransactionModal } from './AddTransactionModal'
import { ChartModal } from './ChartModal'
import { registerCCPayment } from '../actions'
import type { DashboardData, Transaction, CreditCardOption } from '../types'

interface DashboardClientProps {
  data: DashboardData
}

type Modal =
  | { type: 'add' }
  | { type: 'edit'; transaction: Transaction }
  | { type: 'chart' }
  | { type: 'pay_cc' }
  | null

// ─── PayCCModal ───────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

function PayCCModal({ cards, periodId, onClose, onSaved }: {
  cards: CreditCardOption[]
  periodId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedCard = cards.find(c => c.id === cardId)
  const parsedAmount = parseFloat(amount)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCard) return setError('Seleccioná una tarjeta')
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Ingresá un monto válido')
    if (parsedAmount > selectedCard.current_balance) return setError(`Supera la deuda actual (${fmt(selectedCard.current_balance, selectedCard.currency)})`)
    setError(null)
    startTransition(async () => {
      const res = await registerCCPayment({
        liability_id: cardId,
        amount: parsedAmount,
        currency: selectedCard.currency,
        transaction_date: date,
        period_id: periodId,
        notes: notes || null,
      })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#141F19]">Pagar tarjeta de crédito</h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de tarjeta */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Tarjeta</label>
            <select value={cardId} onChange={e => { setCardId(e.target.value); setAmount(''); setError(null) }}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
              {cards.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.owner_name ? ` (${c.owner_name})` : ''}
                </option>
              ))}
            </select>
            {selectedCard && (
              <p className="text-[10px] text-[#E84434] mt-1.5 font-mono">
                Deuda actual: {fmt(selectedCard.current_balance, selectedCard.currency)}
              </p>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Monto a pagar {selectedCard ? `(${selectedCard.currency})` : ''}
            </label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(null) }}
              placeholder="0.00" step="0.01" min="0.01" autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[16px] font-mono text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white" />
            {selectedCard && !isNaN(parsedAmount) && parsedAmount > 0 && (
              <p className="text-[10px] text-[#7A9A8A] mt-1.5 font-mono">
                Deuda restante: {fmt(Math.max(0, selectedCard.current_balance - parsedAmount), selectedCard.currency)}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white" />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Pago mínimo, Pago total..."
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white" />
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A]">
              Cancelar
            </button>
            <button type="submit" disabled={pending || !amount}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Registrando…' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal>(null)

  const {
    periodo_activo,
    metrics,
    transaction_groups,
    monthly_history,
    budgets,
    recurring_templates,
    pending_recurring,
    categories,
    credit_card_options,
    user_settings,
  } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  const periodoLabel = periodo_activo
    ? `Desde ${new Date(periodo_activo.start_date + 'T12:00:00').toLocaleDateString('es', { month: 'long', year: 'numeric' })}`
    : undefined

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroCard
        metrics={metrics}
        monthly_history={monthly_history}
        periodo_label={periodoLabel}
        onExpand={() => setModal({ type: 'chart' })}
      />

      {/* Banner recurrentes pendientes */}
      <RecurringBanner
        pending={pending_recurring}
        onApproved={refresh}
      />

      {/* Slider 3 tabs */}
      {periodo_activo ? (
        <TransactionSlider
          transaction_groups={transaction_groups}
          budgets={budgets}
          recurring_templates={recurring_templates}
          categories={categories}
          gasto_diario={metrics.gasto_diario}
          onEditTransaction={tx => setModal({ type: 'edit', transaction: tx })}
          onDataChanged={refresh}
        />
      ) : (
        <div style={{ backgroundColor: '#EAF0EC', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#7A9A8A' }}>
            Sin período activo. Configura uno en Mi Realidad.
          </p>
        </div>
      )}

      {/* FABs */}
      {periodo_activo && (
        <div style={{ position: 'fixed', bottom: '96px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 30 }}>
          {/* Pagar CC — solo si hay tarjetas registradas */}
          {credit_card_options.length > 0 && (
            <button
              onClick={() => setModal({ type: 'pay_cc' })}
              title="Pagar tarjeta de crédito"
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#E84434', border: 'none', color: 'white',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,68,52,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </button>
          )}
          {/* Agregar transacción */}
          <button
            onClick={() => setModal({ type: 'add' })}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#2E7D52', border: 'none', color: 'white',
              fontSize: '26px', lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(46,125,82,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Modales */}
      {modal?.type === 'chart' && (
        <ChartModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'add' && periodo_activo && (
        <AddTransactionModal
          periodId={periodo_activo.id}
          pricePerHour={metrics.price_per_hour}
          categories={categories}
          creditCardOptions={credit_card_options}
          defaultPaymentSource={user_settings.default_payment_source}
          defaultLiabilityId={user_settings.default_liability_id}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'pay_cc' && periodo_activo && credit_card_options.length > 0 && (
        <PayCCModal
          cards={credit_card_options}
          periodId={periodo_activo.id}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'edit' && periodo_activo && (
        <AddTransactionModal
          periodId={periodo_activo.id}
          pricePerHour={metrics.price_per_hour}
          categories={categories}
          creditCardOptions={credit_card_options}
          defaultPaymentSource={user_settings.default_payment_source}
          defaultLiabilityId={user_settings.default_liability_id}
          transaction={modal.transaction}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
