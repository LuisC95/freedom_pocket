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
import type { LiquidityAccount } from '@/types/liquidity'

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

function PayCCModal({ cards, liquidityAccounts, periodId, onClose, onSaved }: {
  cards: CreditCardOption[]
  liquidityAccounts: LiquidityAccount[]
  periodId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? '')
  const bankAccounts = liquidityAccounts.filter(account => account.liquidity_kind === 'bank')
  const [liquidityAssetId, setLiquidityAssetId] = useState(bankAccounts[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedCard = cards.find(c => c.id === cardId)
  const selectedAccount = bankAccounts.find(account => account.id === liquidityAssetId)
  const parsedAmount = parseFloat(amount)
  const remainingDebt = selectedCard && !isNaN(parsedAmount) && parsedAmount > 0
    ? Math.max(0, selectedCard.current_balance - parsedAmount)
    : selectedCard?.current_balance ?? 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCard) return setError('Seleccioná una tarjeta')
    if (!selectedAccount) return setError('Seleccioná una cuenta bancaria')
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Ingresá un monto válido')
    if (parsedAmount > selectedCard.current_balance) return setError(`Supera la deuda actual (${fmt(selectedCard.current_balance, selectedCard.currency)})`)
    if (parsedAmount > selectedAccount.current_value) return setError(`Saldo insuficiente en ${selectedAccount.name}`)
    setError(null)
    startTransition(async () => {
      const res = await registerCCPayment({
        liability_id: cardId,
        liquidity_asset_id: liquidityAssetId,
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
    <div className="dashboard-paycc-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="dashboard-paycc-card w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="dashboard-paycc-header flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#141F19]">Pagar tarjeta de crédito</h2>
            <p className="text-[11px] text-[#7A9A8A] mt-0.5">
              Registra un pago desde una cuenta bancaria.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#7A9A8A] hover:text-[#141F19] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="dashboard-paycc-form space-y-4">
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
              <div className="dashboard-paycc-summary mt-2 rounded-xl border border-[#E8443430] bg-[#FFF0EF] px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
                <p className="font-mono text-[20px] font-semibold leading-tight text-[#E84434]">
                  {fmt(selectedCard.current_balance, selectedCard.currency)}
                </p>
              </div>
            )}
          </div>

          {/* Cuenta */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Pagar desde</label>
            {bankAccounts.length > 0 ? (
              <>
                <select value={liquidityAssetId} onChange={e => { setLiquidityAssetId(e.target.value); setError(null) }}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.institution} ({fmt(account.current_value, account.currency)})
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <p className="text-[10px] text-[#7A9A8A] mt-1.5 font-mono">
                    Disponible: {fmt(selectedAccount.current_value, selectedAccount.currency)}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-[#C69B3040] bg-[#C69B3014] px-3 py-2.5">
                <p className="text-[12px] font-medium text-[#C69B30]">No hay cuentas bancarias disponibles</p>
                <p className="text-[10px] text-[#7A9A8A] mt-1">
                  Crea un activo líquido tipo banco en Brújula para pagar tarjetas.
                </p>
              </div>
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
            {selectedCard && (
              <div className="dashboard-paycc-quick-actions">
                <button type="button" onClick={() => { setAmount((selectedCard.current_balance / 2).toFixed(2)); setError(null) }}>
                  50%
                </button>
                <button type="button" onClick={() => { setAmount(selectedCard.current_balance.toFixed(2)); setError(null) }}>
                  Total
                </button>
                {selectedAccount && (
                  <button type="button" onClick={() => { setAmount(Math.min(selectedCard.current_balance, selectedAccount.current_value).toFixed(2)); setError(null) }}>
                    Máx. disponible
                  </button>
                )}
              </div>
            )}
            {selectedCard && !isNaN(parsedAmount) && parsedAmount > 0 && (
              <p className="text-[10px] text-[#7A9A8A] mt-1.5 font-mono">
                Deuda restante: {fmt(remainingDebt, selectedCard.currency)}
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

          <div className="dashboard-paycc-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A]">
              Cancelar
            </button>
            <button type="submit" disabled={pending || !amount || bankAccounts.length === 0}
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
    net_worth,
    transaction_groups,
    monthly_history,
    budgets,
    recurring_templates,
    pending_recurring,
    categories,
    credit_card_options,
    user_settings,
    liquidity_accounts,
  } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  const periodoLabel = periodo_activo
    ? `Desde ${new Date(periodo_activo.start_date + 'T12:00:00').toLocaleDateString('es', { month: 'long', year: 'numeric' })}`
    : undefined

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <HeroCard
        metrics={metrics}
        net_worth={net_worth}
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
        <div className="dashboard-fab-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 30 }}>
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
          liquidityAccounts={liquidity_accounts}
          defaultPaymentSource={user_settings.default_payment_source}
          defaultLiabilityId={user_settings.default_liability_id}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'pay_cc' && periodo_activo && credit_card_options.length > 0 && (
        <PayCCModal
          cards={credit_card_options}
          liquidityAccounts={liquidity_accounts}
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
          liquidityAccounts={liquidity_accounts}
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
