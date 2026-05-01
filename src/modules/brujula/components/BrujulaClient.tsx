'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BrujulaData, Asset, Liability, Business, FreedomGoal } from '../types'
import type { LiquidityAccount } from '@/types/liquidity'
import { ASSET_TYPE_LABELS, BUSINESS_MODEL_LABELS, BUSINESS_STATUS_LABELS, LIABILITY_TYPE_LABELS, PROGRESS_LEVEL_LABELS } from '../types'
import { deleteAsset, deleteLiability, deleteBusiness, deleteFreedomGoal, updateFreedomGoal, payOffCreditCard } from '../actions'
import { AssetModal } from './AssetModal'
import { LiabilityModal } from './LiabilityModal'
import { BusinessModal } from './BusinessModal'
import { FreedomGoalModal } from './FreedomGoalModal'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  if (Math.abs(n) >= 1_000_000) {
    return `${new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n / 1_000_000)}M`
  }
  if (Math.abs(n) >= 1_000) {
    return `${new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n / 1_000)}k`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtFull(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtDias(d: number) {
  if (d >= 365) return `${(d / 365).toFixed(1)}a`
  if (d >= 30)  return `${(d / 30).toFixed(1)}m`
  return `${d.toFixed(0)}d`
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, level_label, level_percentage }: { score: number; level_label: string; level_percentage: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative flex items-center justify-center w-[96px] h-[96px]">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} strokeWidth="6" stroke="rgba(255,255,255,0.08)" fill="none" />
        <circle cx="48" cy="48" r={r} strokeWidth="6" stroke="#5DCAA5" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[22px] font-bold text-white leading-none">{score.toFixed(0)}</span>
        <span className="text-[8px] text-white/40 mt-0.5">{level_label}</span>
      </div>
    </div>
  )
}

// ─── Dimension Pill ───────────────────────────────────────────────────────────

function DimPill({ label, score, description }: { label: string; score: number; description: string }) {
  return (
    <div className="min-w-0 bg-white/[6%] rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="min-w-0 text-[10px] uppercase tracking-widest text-[#5DCAA5]/70">{label}</span>
        <span className="font-mono text-[13px] text-white">{score.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#5DCAA5] rounded-full transition-all" style={{ width: `${score}%` }} />
      </div>
      <p className="text-[9px] text-white/30 mt-1.5 leading-tight">{description}</p>
    </div>
  )
}

// ─── Inline Confirm ───────────────────────────────────────────────────────────

function DeleteBtn({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <button type="button" onClick={onConfirm} disabled={pending}
        className="text-[11px] font-medium text-white bg-[#E84434] rounded-lg px-2.5 py-1 transition-colors disabled:opacity-60">
        ¿Eliminar?
      </button>
    )
  }
  return (
    <button type="button" onClick={() => setConfirming(true)}
      className="text-[#7A9A8A] hover:text-[#E84434] transition-colors text-[16px] leading-none p-1">
      ×
    </button>
  )
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onEdit, onDelete, pending }: {
  asset: Asset
  onEdit: () => void
  onDelete: () => void
  pending: boolean
}) {
  return (
    <div className="glass rounded-xl p-3.5 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{asset.name}</span>
          <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
            {ASSET_TYPE_LABELS[asset.asset_type]}
          </span>
          {asset.is_liquid && (
            <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)' }}>Líquido</span>
          )}
          {asset.liquidity_kind && (
            <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)' }}>
              {asset.liquidity_kind === 'cash' ? 'Cash' : asset.institution ?? 'Banco'}
            </span>
          )}
          {asset.account_ownership === 'joint' && (
            <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)' }}>Mancomunada</span>
          )}
        </div>
        <p className="font-mono text-[20px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {fmtFull(asset.current_value, asset.currency)}
        </p>
        {asset.monthly_yield != null && asset.monthly_yield > 0 && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            +{fmtFull(asset.monthly_yield, asset.currency)}/mes
            {asset.annual_rate_pct != null && ` · ${asset.annual_rate_pct}% anual`}
          </p>
        )}
        {asset.notes && <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{asset.notes}</p>}
        {asset.registered_by_name && <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>Registró {asset.registered_by_name}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="text-[12px] transition-colors px-1" style={{ color: 'var(--text-secondary)' }}>
          Editar
        </button>
        <DeleteBtn onConfirm={onDelete} pending={pending} />
      </div>
    </div>
  )
}

// ─── Business Card ────────────────────────────────────────────────────────────

function BusinessCard({ business, onEdit, onDelete, pending }: {
  business: Business
  onEdit: () => void
  onDelete: () => void
  pending: boolean
}) {
  const statusColor = business.status === 'active' ? 'text-[#2E7D52] bg-[#EAF0EC]' : 'text-[#7A9A8A] bg-[#F5F7F6]'
  return (
    <div className="bg-white border border-[#EAF0EC] rounded-xl p-3.5 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[13px] font-medium text-[#141F19] truncate">{business.name}</span>
          <span className="shrink-0 text-[10px] bg-[#EAF0EC] text-[#7A9A8A] rounded-md px-1.5 py-0.5">
            {BUSINESS_MODEL_LABELS[business.business_model]}
          </span>
          <span className={`shrink-0 text-[10px] rounded-md px-1.5 py-0.5 ${statusColor}`}>
            {BUSINESS_STATUS_LABELS[business.status]}
          </span>
          {business.is_passive && (
            <span className="shrink-0 text-[10px] bg-[#EAF0EC] text-[#2E7D52] rounded-md px-1.5 py-0.5">Pasivo</span>
          )}
        </div>
        <p className="font-mono text-[20px] font-semibold text-[#141F19] leading-tight">
          {fmtFull(business.monthly_net_profit, business.currency)}<span className="text-[12px] text-[#7A9A8A] font-normal">/mes</span>
        </p>
        <p className="text-[11px] text-[#7A9A8A] mt-0.5">
          Reinv. {business.reinvestment_percentage}% · ×{business.sector_multiplier} sector
          {business.started_at && ` · desde ${business.started_at.slice(0, 7)}`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="text-[12px] text-[#7A9A8A] hover:text-[#2E7D52] transition-colors px-1">
          Editar
        </button>
        <DeleteBtn onConfirm={onDelete} pending={pending} />
      </div>
    </div>
  )
}

// ─── Liability Card ───────────────────────────────────────────────────────────

function LiabilityCard({ liability, onEdit, onDelete, onPayCC, pending }: {
  liability: Liability
  onEdit: () => void
  onDelete: () => void
  onPayCC: () => void
  pending: boolean
}) {
  return (
    <div className="bg-white border border-[#EAF0EC] rounded-xl p-3.5 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-medium text-[#141F19] truncate">{liability.name}</span>
          <span className="shrink-0 text-[10px] bg-[#FFF0EF] text-[#E84434] rounded-md px-1.5 py-0.5">
            {LIABILITY_TYPE_LABELS[liability.liability_type]}
          </span>
        </div>
        <p className="font-mono text-[20px] font-semibold text-[#E84434] leading-tight">
          {fmtFull(liability.current_balance, liability.currency)}
        </p>
        <p className="text-[11px] text-[#7A9A8A] mt-0.5">
          {liability.interest_rate_pct != null && `${liability.interest_rate_pct}% interés`}
          {liability.monthly_payment != null && ` · ${fmtFull(liability.monthly_payment, liability.currency)}/mes`}
        </p>
        {liability.notes && <p className="text-[10px] text-[#7A9A8A] mt-1 truncate">{liability.notes}</p>}
        {liability.registered_by_name && <p className="text-[10px] text-[#7A9A8A] mt-1 truncate">Registró {liability.registered_by_name}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {liability.liability_type === 'credit_card' && (
          <button onClick={onPayCC}
            className="text-[11px] font-medium text-white bg-[#2E7D52] hover:bg-[#3A9E6A] rounded-lg px-2.5 py-1 transition-colors">
            Pagar
          </button>
        )}
        <button onClick={onEdit} className="text-[12px] text-[#7A9A8A] hover:text-[#2E7D52] transition-colors px-1">
          Editar
        </button>
        <DeleteBtn onConfirm={onDelete} pending={pending} />
      </div>
    </div>
  )
}

// ─── Freedom Goal Row ─────────────────────────────────────────────────────────

function FreedomGoalRow({ goal, diasActuales, onEdit, onDelete, onToggle, pending }: {
  goal: FreedomGoal
  diasActuales: number
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  pending: boolean
}) {
  const progreso = goal.target_days && goal.target_days > 0
    ? Math.min((diasActuales / goal.target_days) * 100, 100)
    : null

  return (
    <div
      className="glass rounded-xl p-3.5 transition-colors"
      style={goal.is_completed ? { borderColor: 'rgba(46,125,82,0.30)', background: 'rgba(46,125,82,0.08)' } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button onClick={onToggle} disabled={pending}
          className="mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-colors"
          style={{
            border: goal.is_completed ? '2px solid #3A9E6A' : '2px solid rgba(255,255,255,0.20)',
            background: goal.is_completed ? '#2E7D52' : 'rgba(255,255,255,0.08)',
          }}>
          {goal.is_completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[13px] font-medium truncate ${goal.is_completed ? 'text-[#7A9A8A] line-through' : 'text-[#141F19]'}`}>
              {goal.label}
            </span>
            {goal.is_system_suggested && (
              <span className="shrink-0 text-[10px] bg-[#EAF0EC] text-[#7A9A8A] rounded-md px-1.5 py-0.5">Sugerida</span>
            )}
          </div>

          {goal.target_days != null && (
            <p className="text-[11px] text-[#7A9A8A] mb-2">
              Meta: {goal.target_days} días · Actual: {diasActuales.toFixed(0)} días
            </p>
          )}

          {progreso !== null && (
            <div className="h-1.5 bg-[#EAF0EC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2E7D52] rounded-full transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="text-[12px] text-[#7A9A8A] hover:text-[#2E7D52] transition-colors px-1">
            Editar
          </button>
          <DeleteBtn onConfirm={onDelete} pending={pending} />
        </div>
      </div>
    </div>
  )
}

// ─── Pay CC Modal ─────────────────────────────────────────────────────────────

function PayCCModal({ liability, liquidityAccounts, onClose, onSaved }: {
  liability: Liability
  liquidityAccounts: LiquidityAccount[]
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const bankAccounts = liquidityAccounts.filter(account => account.liquidity_kind === 'bank')
  const [liquidityAssetId, setLiquidityAssetId] = useState(bankAccounts[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount)
    const selectedAccount = bankAccounts.find(account => account.id === liquidityAssetId)
    if (isNaN(n) || n <= 0) return setError('Ingresá un monto válido')
    if (!selectedAccount) return setError('Selecciona una cuenta bancaria')
    if (n > liability.current_balance) return setError(`El monto supera la deuda actual (${fmtFull(liability.current_balance, liability.currency)})`)
    if (n > selectedAccount.current_value) return setError(`Saldo insuficiente en ${selectedAccount.name}`)
    setError(null)
    startTransition(async () => {
      const res = await payOffCreditCard({ liability_id: liability.id, liquidity_asset_id: liquidityAssetId, amount: n })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#141F19]">Pagar tarjeta</h2>
            <p className="text-[11px] text-[#7A9A8A] mt-0.5">{liability.name}</p>
          </div>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] text-xl leading-none">×</button>
        </div>

        <div className="bg-[#FFF0EF] rounded-xl p-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
          <p className="font-mono text-[22px] font-semibold text-[#E84434]">
            {fmtFull(liability.current_balance, liability.currency)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Pagar desde
            </label>
            <select
              value={liquidityAssetId}
              onChange={e => { setLiquidityAssetId(e.target.value); setError(null) }}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white"
            >
              {bankAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.institution} ({fmtFull(account.current_value, account.currency)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Monto a pagar ({liability.currency})
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(null) }}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[16px] font-mono text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white"
            />
            {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <p className="text-[10px] text-[#7A9A8A] mt-1.5">
                Deuda restante: {fmtFull(Math.max(0, liability.current_balance - parseFloat(amount)), liability.currency)}
              </p>
            )}
          </div>
          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}
          <div className="flex gap-3">
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

// ─── Main Component ───────────────────────────────────────────────────────────

type Modal =
  | { type: 'asset_new' }
  | { type: 'asset_edit'; asset: Asset }
  | { type: 'liability_new' }
  | { type: 'liability_edit'; liability: Liability }
  | { type: 'pay_cc'; liability: Liability }
  | { type: 'business_new' }
  | { type: 'business_edit'; business: Business }
  | { type: 'goal_new' }
  | { type: 'goal_edit'; goal: FreedomGoal }
  | null

type VehicleTab = 'activos' | 'negocios'

interface BrujulaClientProps {
  data: BrujulaData
}

export function BrujulaClient({ data }: BrujulaClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal>(null)
  const [vehicleTab, setVehicleTab] = useState<VehicleTab>('activos')
  const [pending, startTransition] = useTransition()

  const { assets, liabilities, businesses, freedom_goals, score, dias_de_libertad, fastlane, precio_real_hora, liquidity_accounts } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  function handleDelete(fn: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  function handleToggleGoal(goal: FreedomGoal) {
    startTransition(async () => {
      await updateFreedomGoal({
        id: goal.id,
        is_completed: !goal.is_completed,
        completed_at: !goal.is_completed ? new Date().toISOString() : null,
      })
      router.refresh()
    })
  }

  const totalAssets     = fastlane.total_assets_usd
  const totalLiabilities = fastlane.total_liabilities_usd
  const netWorth        = fastlane.net_worth_usd
  const diasLibertad    = dias_de_libertad.dias_libertad
  const ingresoPasivo   = dias_de_libertad.ingreso_pasivo_mensual

  return (
    <>
      {/* ── Hero Card ── */}
      <div className="bg-[#1A2520] rounded-xl px-4 py-4 mb-4 sm:px-[18px]">

        {/* Fila 1 — Score + métricas */}
        <div className="flex flex-col gap-4 border-b border-white/[8%] pb-4 mb-4 min-[460px]:flex-row">

          {/* Score ring */}
          <div className="flex shrink-0 items-center gap-3 min-[460px]:flex-col min-[460px]:gap-2">
            <ScoreRing
              score={score.total_score}
              level_label={score.level_label}
              level_percentage={score.level_percentage}
            />
            <div className="min-w-0 flex-1 min-[460px]:w-[84px] min-[460px]:flex-none">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#5DCAA5] rounded-full transition-all" style={{ width: `${score.level_percentage}%` }} />
              </div>
              <p className="mt-1.5 text-[8px] text-white/30 uppercase tracking-wider">{PROGRESS_LEVEL_LABELS[score.level]}</p>
            </div>
          </div>

          {/* Métricas derechas */}
          <div className="min-w-0 flex-1 flex flex-col gap-2.5 justify-center">

            {/* Días de libertad */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] uppercase tracking-widest text-[#5DCAA5]/70">Días de libertad</p>
              <p className="font-mono text-[22px] text-white leading-none shrink-0">{fmtDias(diasLibertad)}</p>
            </div>

            {/* Ingreso pasivo */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] text-white/30">Ingreso pasivo/mes</p>
              <p className="font-mono text-[16px] text-white/70 text-right break-words">{fmt(ingresoPasivo)}</p>
            </div>

            {/* Net worth */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] text-white/30">Patrimonio neto</p>
              <p className={`font-mono text-[16px] leading-none text-right break-words ${netWorth >= 0 ? 'text-[#5DCAA5]' : 'text-[#E84434]'}`}>
                {fmt(Math.abs(netWorth))}{netWorth < 0 ? ' neg.' : ''}
              </p>
            </div>

          </div>
        </div>

        {/* Fila 2 — 4 dimensiones */}
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 lg:grid-cols-4">
          <DimPill label="D1 · Tiempo" score={score.d1_time_decoupling}
            description={precio_real_hora != null ? `$${precio_real_hora.toFixed(0)}/hr real` : 'sin datos de horas'} />
          <DimPill label="D2 · Patrimonio" score={score.d2_asset_health}
            description={`${fmt(totalAssets)} activos · ${fmt(totalLiabilities)} pasivos`} />
          <DimPill label="D3 · Libertad" score={score.d3_financial_freedom}
            description={`${diasLibertad.toFixed(0)} días de autonomía`} />
          <DimPill label="D4 · Momentum" score={score.d4_momentum}
            description={data.retention_rate_m2 != null ? `${data.retention_rate_m2.toFixed(0)}% retención mensual` : 'sin transacciones'} />
        </div>

      </div>

      {/* ── Fastlane Summary Pills ── */}
      <div className="grid grid-cols-1 gap-2 mb-4 min-[430px]:grid-cols-3">
        {[
          { label: 'Activos',   val: fmt(totalAssets),   sub: `${assets.length} vehículos` },
          { label: 'Pasivos',   val: fmt(totalLiabilities), sub: `${liabilities.length} deudas`, red: true },
          { label: 'Valoración', val: fmt(fastlane.asset_value_estimado), sub: 'activos + negocios' },
        ].map(item => (
          <div key={item.label} className="min-w-0 bg-white border border-[#EAF0EC] rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-[#7A9A8A] mb-1">{item.label}</p>
            <p className={`font-mono text-[clamp(14px,4vw,16px)] font-semibold leading-tight break-words ${item.red ? 'text-[#E84434]' : 'text-[#141F19]'}`}>{item.val}</p>
            <p className="text-[9px] text-[#7A9A8A] mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Vehículos (Activos / Negocios) ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#141F19]">Vehículos de riqueza</h2>
          <button
            onClick={() => setModal(vehicleTab === 'activos' ? { type: 'asset_new' } : { type: 'business_new' })}
            className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors">
            + Agregar
          </button>
        </div>

        {/* Tabs */}
        <div className="fc-tabs mb-3">
          {(['activos', 'negocios'] as VehicleTab[]).map(tab => (
            <button key={tab} onClick={() => setVehicleTab(tab)}
              className={`fc-tab ${vehicleTab === tab ? 'active' : ''}`}>
              {tab === 'activos' ? `Activos (${assets.length})` : `Negocios (${businesses.length})`}
            </button>
          ))}
        </div>

        {vehicleTab === 'activos' && (
          <div className="space-y-2">
            {assets.length === 0 ? (
              <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
                <p className="text-[13px] text-[#7A9A8A]">Sin activos registrados</p>
                <button onClick={() => setModal({ type: 'asset_new' })}
                  className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]">
                  + Agregar activo
                </button>
              </div>
            ) : (
              assets.map(a => (
                <AssetCard key={a.id} asset={a}
                  onEdit={() => setModal({ type: 'asset_edit', asset: a })}
                  onDelete={() => handleDelete(() => deleteAsset(a.id))}
                  pending={pending} />
              ))
            )}
          </div>
        )}

        {vehicleTab === 'negocios' && (
          <div className="space-y-2">
            {businesses.length === 0 ? (
              <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
                <p className="text-[13px] text-[#7A9A8A]">Sin negocios registrados</p>
                <button onClick={() => setModal({ type: 'business_new' })}
                  className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]">
                  + Agregar negocio
                </button>
              </div>
            ) : (
              businesses.map(b => (
                <BusinessCard key={b.id} business={b}
                  onEdit={() => setModal({ type: 'business_edit', business: b })}
                  onDelete={() => handleDelete(() => deleteBusiness(b.id))}
                  pending={pending} />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Pasivos ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#141F19]">Pasivos</h2>
          <button onClick={() => setModal({ type: 'liability_new' })}
            className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors">
            + Agregar
          </button>
        </div>

        <div className="space-y-2">
          {liabilities.length === 0 ? (
            <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
              <p className="text-[13px] text-[#7A9A8A]">Sin pasivos registrados</p>
            </div>
          ) : (
            liabilities.map(l => (
              <LiabilityCard key={l.id} liability={l}
                onEdit={() => setModal({ type: 'liability_edit', liability: l })}
                onDelete={() => handleDelete(() => deleteLiability(l.id))}
                onPayCC={() => setModal({ type: 'pay_cc', liability: l })}
                pending={pending} />
            ))
          )}
        </div>
      </section>

      {/* ── Metas de Libertad ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#141F19]">Metas de libertad</h2>
          <button onClick={() => setModal({ type: 'goal_new' })}
            className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors">
            + Agregar
          </button>
        </div>

        {/* Días actuales resumen */}
        {diasLibertad > 0 && (
          <div className="bg-[#EAF0EC] rounded-xl p-3 mb-3 flex items-center gap-3">
            <div className="text-center shrink-0">
              <p className="font-mono text-[24px] font-bold text-[#2E7D52] leading-none">{fmtDias(diasLibertad)}</p>
              <p className="text-[9px] text-[#7A9A8A] mt-0.5">días actuales</p>
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-[#7A9A8A] leading-relaxed">
                Tu ingreso pasivo de {fmt(ingresoPasivo)}/mes puede cubrir {diasLibertad.toFixed(0)} días sin trabajar
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {freedom_goals.length === 0 ? (
            <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
              <p className="text-[13px] text-[#7A9A8A]">Sin metas definidas</p>
              <button onClick={() => setModal({ type: 'goal_new' })}
                className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]">
                + Agregar meta
              </button>
            </div>
          ) : (
            freedom_goals.map(g => (
              <FreedomGoalRow key={g.id} goal={g} diasActuales={diasLibertad}
                onEdit={() => setModal({ type: 'goal_edit', goal: g })}
                onDelete={() => handleDelete(() => deleteFreedomGoal(g.id))}
                onToggle={() => handleToggleGoal(g)}
                pending={pending} />
            ))
          )}
        </div>
      </section>

      {/* ── Modales ── */}
      {modal?.type === 'asset_new' && (
        <AssetModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'asset_edit' && (
        <AssetModal asset={modal.asset} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'liability_new' && (
        <LiabilityModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'liability_edit' && (
        <LiabilityModal liability={modal.liability} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'pay_cc' && (
        <PayCCModal liability={modal.liability} liquidityAccounts={liquidity_accounts} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'business_new' && (
        <BusinessModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'business_edit' && (
        <BusinessModal business={modal.business} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'goal_new' && (
        <FreedomGoalModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'goal_edit' && (
        <FreedomGoalModal goal={modal.goal} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </>
  )
}
