'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HeroCard } from './HeroCard'
import { RecurringBanner } from './RecurringBanner'
import { TransactionSlider } from './TransactionSlider'
import { AddTransactionModal } from './AddTransactionModal'
import { ChartModal } from './ChartModal'
import { createLiabilityPaymentTemplate, registerLiabilityPayment, transferBetweenLiquidityAccounts } from '../actions'
import type { DashboardData, LiabilityPaymentOption, RecurringFrequency, Transaction } from '../types'
import type { LiquidityAccount } from '@/types/liquidity'

interface DashboardClientProps {
  data: DashboardData
}

type Modal =
  | { type: 'add' }
  | { type: 'edit'; transaction: Transaction }
  | { type: 'chart' }
  | { type: 'pay_liability' }
  | { type: 'transfer' }
  | null

// ─── PayLiabilityModal ────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

const LIABILITY_LABELS: Record<string, string> = {
  mortgage: 'Hipoteca',
  car: 'Auto',
  credit_card: 'Tarjeta',
  student_loan: 'Estudiantil',
  personal_loan: 'Préstamo',
  other: 'Otra deuda',
}

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'manual', label: 'Sin frecuencia fija' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
]

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' }, { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

const MONTH_OPTIONS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function PayLiabilityModal({ liabilities, liquidityAccounts, periodId, onClose, onSaved }: {
  liabilities: LiabilityPaymentOption[]
  liquidityAccounts: LiquidityAccount[]
  periodId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [liabilityId, setLiabilityId] = useState(liabilities[0]?.id ?? '')
  const bankAccounts = liquidityAccounts.filter(account => account.liquidity_kind === 'bank')
  const [liquidityAssetId, setLiquidityAssetId] = useState(bankAccounts[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [registerToday, setRegisterToday] = useState(true)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate().toString())
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [monthOfYear, setMonthOfYear] = useState(new Date().getMonth() + 1)
  const [customDays, setCustomDays] = useState('30')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedLiability = liabilities.find(liability => liability.id === liabilityId)
  const selectedAccount = bankAccounts.find(account => account.id === liquidityAssetId)
  const parsedAmount = parseFloat(amount)
  const remainingDebt = selectedLiability && !isNaN(parsedAmount) && parsedAmount > 0
    ? Math.max(0, selectedLiability.current_balance - parsedAmount)
    : selectedLiability?.current_balance ?? 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLiability) return setError('Seleccioná una deuda')
    if (!selectedAccount) return setError('Seleccioná una cuenta bancaria')
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Ingresá un monto válido')
    if (parsedAmount > selectedLiability.current_balance) return setError(`Supera la deuda actual (${fmt(selectedLiability.current_balance, selectedLiability.currency)})`)
    if (parsedAmount > selectedAccount.current_value) return setError(`Saldo insuficiente en ${selectedAccount.name}`)
    setError(null)
    startTransition(async () => {
      if (!isRecurring || registerToday) {
        const res = await registerLiabilityPayment({
          liability_id: liabilityId,
          liquidity_asset_id: liquidityAssetId,
          amount: parsedAmount,
          currency: selectedLiability.currency,
          transaction_date: date,
          period_id: periodId,
          notes: notes || null,
        })
        if (res.error) return setError(res.error)
      }
      if (isRecurring) {
        const dayRef = (frequency === 'weekly' || frequency === 'biweekly')
          ? dayOfWeek
          : parseInt(dayOfMonth) || new Date().getDate()
        const tplRes = await createLiabilityPaymentTemplate({
          liability_id: liabilityId,
          liquidity_asset_id: liquidityAssetId,
          name: notes || `Pago de deuda: ${selectedLiability.name}`,
          amount: parsedAmount,
          currency: selectedLiability.currency,
          frequency,
          day_of_month: frequency === 'manual' ? 1 : dayRef,
          month_of_year: frequency === 'annual' ? monthOfYear : null,
          custom_interval_days: frequency === 'custom' ? (parseInt(customDays) || 30) : null,
        })
        if (tplRes.error) return setError(tplRes.error)
      }
      onSaved()
    })
  }

  return (
    <div className="dashboard-paycc-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="dashboard-paycc-card w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="dashboard-paycc-header flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#141F19]">Pagar deuda</h2>
            <p className="text-[11px] text-[#7A9A8A] mt-0.5">
              Registra o programa un pago desde una cuenta bancaria.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#7A9A8A] hover:text-[#141F19] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="dashboard-paycc-form space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Monto a pagar {selectedLiability ? `(${selectedLiability.currency})` : ''}
            </label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(null) }}
              placeholder="0.00" step="0.01" min="0.01" autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[20px] font-mono text-center text-[#E84434] focus:outline-none focus:border-[#2E7D52] bg-white" />
            {selectedLiability && (
              <div className="dashboard-paycc-quick-actions">
                <button type="button" onClick={() => { setAmount((selectedLiability.current_balance / 2).toFixed(2)); setError(null) }}>
                  50%
                </button>
                <button type="button" onClick={() => { setAmount(selectedLiability.current_balance.toFixed(2)); setError(null) }}>
                  Total
                </button>
                {selectedAccount && (
                  <button type="button" onClick={() => { setAmount(Math.min(selectedLiability.current_balance, selectedAccount.current_value).toFixed(2)); setError(null) }}>
                    Máx. disponible
                  </button>
                )}
              </div>
            )}
            {selectedLiability && !isNaN(parsedAmount) && parsedAmount > 0 && (
              <p className="text-[10px] text-[#7A9A8A] mt-1.5 font-mono">
                Deuda restante: {fmt(remainingDebt, selectedLiability.currency)}
              </p>
            )}
          </div>

          {/* Selector de deuda */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Deuda</label>
            <select value={liabilityId} onChange={e => { setLiabilityId(e.target.value); setAmount(''); setError(null) }}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
              {liabilities.map(liability => (
                <option key={liability.id} value={liability.id}>
                  {liability.name} · {LIABILITY_LABELS[liability.liability_type] ?? 'Deuda'}{liability.owner_name ? ` (${liability.owner_name})` : ''}
                </option>
              ))}
            </select>
            {selectedLiability && (
              <div className="dashboard-paycc-summary mt-2 rounded-xl border border-[#E8443430] bg-[#FFF0EF] px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
                <p className="font-mono text-[20px] font-semibold leading-tight text-[#E84434]">
                  {fmt(selectedLiability.current_balance, selectedLiability.currency)}
                </p>
                {selectedLiability.monthly_payment != null && (
                  <p className="text-[10px] text-[#7A9A8A] mt-1">
                    Pago mensual registrado: {fmt(selectedLiability.monthly_payment, selectedLiability.currency)}
                  </p>
                )}
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
                  Crea un activo líquido tipo banco en Brújula para pagar deudas.
                </p>
              </div>
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

          {/* Recurrente */}
          <div className="rounded-xl border border-[#D0DDD6] bg-[#EAF0EC] p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              <span className="text-[12px] font-medium text-[#141F19]">Programar como pago habitual</span>
            </label>
            {isRecurring && (
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={registerToday} onChange={e => setRegisterToday(e.target.checked)} />
                  <span className="text-[11px] text-[#7A9A8A]">También registrar este pago hoy</span>
                </label>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Frecuencia</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FREQ_OPTIONS.map(option => (
                      <button key={option.value} type="button" onClick={() => setFrequency(option.value)}
                        className="px-2.5 py-1.5 rounded-md border text-[11px]"
                        style={{
                          borderColor: frequency === option.value ? '#2E7D52' : '#D0DDD6',
                          backgroundColor: frequency === option.value ? '#2E7D5218' : 'white',
                          color: frequency === option.value ? '#2E7D52' : '#7A9A8A',
                        }}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(frequency === 'weekly' || frequency === 'biweekly') && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Día de la semana</label>
                    <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] bg-white">
                      {DAY_OPTIONS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                  </div>
                )}
                {frequency === 'monthly' && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Día del mes</label>
                    <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31"
                      className="w-24 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] font-mono text-[#141F19] bg-white" />
                  </div>
                )}
                {frequency === 'annual' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Mes</label>
                      <select value={monthOfYear} onChange={e => setMonthOfYear(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] bg-white">
                        {MONTH_OPTIONS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Día</label>
                      <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] font-mono text-[#141F19] bg-white" />
                    </div>
                  </div>
                )}
                {frequency === 'custom' && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Cada cuántos días</label>
                    <input type="number" value={customDays} onChange={e => setCustomDays(e.target.value)} min="1"
                      className="w-24 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] font-mono text-[#141F19] bg-white" />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="dashboard-paycc-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A]">
              Cancelar
            </button>
            <button type="submit" disabled={pending || !amount || bankAccounts.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Guardando…' : isRecurring && !registerToday ? 'Programar pago' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── TransferModal ────────────────────────────────────────────────────────────

function TransferModal({ accounts, onClose, onSaved }: {
  accounts: LiquidityAccount[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [toId, setToId] = useState(accounts.length > 1 ? accounts[1].id : '')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const fromAccount = accounts.find(a => a.id === fromId)
  const toAccount = accounts.find(a => a.id === toId)
  const parsedAmount = parseFloat(amount)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromId || !toId) return setError('Seleccioná ambas cuentas')
    if (fromId === toId) return setError('Las cuentas deben ser diferentes')
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Ingresá un monto válido')
    if (fromAccount && parsedAmount > fromAccount.current_value) return setError(`Saldo insuficiente en ${fromAccount.name}`)
    setError(null)
    startTransition(async () => {
      const res = await transferBetweenLiquidityAccounts({
        fromAssetId: fromId,
        toAssetId: toId,
        amount: parsedAmount,
        currency: fromAccount?.currency ?? 'USD',
        notes: notes.trim() || null,
      })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="dashboard-paycc-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="dashboard-paycc-card w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2E7D52' }}>
            Transferir entre cuentas
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A9A8A', fontSize: '18px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Monto */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A', display: 'block', marginBottom: '4px' }}>Monto</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            style={{ width: '100%', padding: '8px 10px', fontSize: '18px', textAlign: 'center', borderRadius: '6px', border: '1px solid #D6E2DA', backgroundColor: '#F2F7F4', marginBottom: '10px', fontFamily: 'var(--font-mono)', color: '#2E7D52', fontWeight: 600 }} />

          {/* Desde */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A', display: 'block', marginBottom: '4px' }}>Desde</label>
          <select value={fromId} onChange={e => { setFromId(e.target.value); if (e.target.value === toId) setToId('') }}
            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D6E2DA', backgroundColor: '#F2F7F4', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} · {fmt(a.current_value, a.currency)}</option>
            ))}
          </select>

          {/* Hacia */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A', display: 'block', marginBottom: '4px' }}>Hacia</label>
          <select value={toId} onChange={e => setToId(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D6E2DA', backgroundColor: '#F2F7F4', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
            {accounts.filter(a => a.id !== fromId).map(a => (
              <option key={a.id} value={a.id}>{a.name} · {fmt(a.current_value, a.currency)}</option>
            ))}
          </select>

          {/* Notas */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A', display: 'block', marginBottom: '4px' }}>Notas (opcional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Ahorro para x"
            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D6E2DA', backgroundColor: '#F2F7F4', marginBottom: '12px', fontFamily: 'var(--font-mono)' }} />

          {error && <p style={{ color: '#E84434', fontSize: '11px', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>{error}</p>}

          <button type="submit" disabled={pending}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              backgroundColor: pending ? '#B0C8BA' : '#2E7D52', color: 'white',
              fontSize: '13px', fontWeight: 600, cursor: pending ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)',
            }}>
            {pending ? 'Transfiriendo…' : 'Transferir'}
          </button>
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
    liability_options,
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
          {/* Transferir entre cuentas */}
          {liquidity_accounts.length >= 2 && (
            <button
              onClick={() => setModal({ type: 'transfer' })}
              title="Transferir entre cuentas"
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#C69B30', border: 'none', color: 'white',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(198,155,48,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                <path d="M7 17l10-10" /><path d="M7 7h10v10" />
              </svg>
            </button>
          )}
          {/* Pagar deuda — solo si hay liabilities registradas */}
          {liability_options.length > 0 && (
            <button
              onClick={() => setModal({ type: 'pay_liability' })}
              title="Pagar deuda"
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
      {modal?.type === 'transfer' && liquidity_accounts.length >= 2 && (
        <TransferModal
          accounts={liquidity_accounts}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
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
      {modal?.type === 'pay_liability' && periodo_activo && liability_options.length > 0 && (
        <PayLiabilityModal
          liabilities={liability_options}
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
