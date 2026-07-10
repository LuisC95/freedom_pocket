'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BrujulaData, Asset, Liability, Business, FreedomGoal, CreditCardExpenseHistoryItem, AssetMovementHistoryItem, LiabilityPaymentHistoryItem } from '../types'
import type { LiquidityAccount } from '@/types/liquidity'
import { ASSET_TYPE_LABELS, BUSINESS_MODEL_LABELS, BUSINESS_STATUS_LABELS, LIABILITY_TYPE_LABELS } from '../types'
import { deleteAsset, deleteLiability, deleteBusiness, deleteFreedomGoal, updateFreedomGoal, payOffCreditCard, getCreditCardExpenseHistory, getAssetMovementHistory, getLiabilityPaymentHistory } from '../actions'
import { AssetModal } from './AssetModal'
import { LiabilityModal } from './LiabilityModal'
import { BusinessModal } from './BusinessModal'
import { FreedomGoalModal } from './FreedomGoalModal'
import { ScanBalancesModal } from './ScanBalancesModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOVEMENT_LABELS: Record<string, string> = {
  income_deposit: 'Ingreso depositado',
  expense_payment: 'Gasto pagado',
  credit_card_payment: 'Pago de tarjeta',
  cash_deposit: 'Depósito / Transferencia',
  manual_adjustment: 'Ajuste',
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtFull(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtDias(d: number) {
  if (d >= 365) return `${(d / 365).toFixed(1)}a`
  if (d >= 30)  return `${(d / 30).toFixed(1)}m`
  return `${d.toFixed(0)}d`
}

function fmtDate(date: string) {
  return new Intl.DateTimeFormat('es-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function fmtIsoDate(isoStr: string) {
  return new Intl.DateTimeFormat('es-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(isoStr))
}

function creditUsage(balance: number, limit: number | null) {
  if (!limit || limit <= 0) return null
  return {
    pct: Math.min((balance / limit) * 100, 999),
    available: Math.max(limit - balance, 0),
  }
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, level_label }: { score: number; level_label: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="score-wrap" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96"
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2E7D52" />
            <stop offset="100%" stopColor="#5DCAA5" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r={r} strokeWidth="6" stroke="rgba(255,255,255,0.08)" fill="none" />
        <circle cx="48" cy="48" r={r} strokeWidth="6" stroke="url(#scoreGrad)" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="mono glow-green" style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-bright)', lineHeight: 1 }}>{score.toFixed(0)}</span>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{level_label}</span>
      </div>
    </div>
  )
}

// ─── Dimension Pill ───────────────────────────────────────────────────────────

function DimPill({ label, score, description }: { label: string; score: number; description: string }) {
  return (
    <div className="min-w-0 bg-white/[6%] rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="min-w-0 truncate text-[10px] uppercase tracking-widest text-[#5DCAA5]/70">{label}</span>
        <span className="font-mono text-[13px] text-white">{score.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#5DCAA5] rounded-full transition-all" style={{ width: `${score}%` }} />
      </div>
      <p className="text-[9px] text-white/30 mt-1.5 leading-tight">{description}</p>
    </div>
  )
}

// ─── Debt Meter ───────────────────────────────────────────────────────────────

function DebtMeter({ totalLiabilities, totalAssets }: { totalLiabilities: number; totalAssets: number }) {
  const ratio = totalAssets > 0 ? Math.min(totalLiabilities / totalAssets, 1) : 0
  const pct = ratio * 100
  const label = pct < 30 ? 'Saludable' : pct < 60 ? 'Moderado' : 'Alto'
  const color = pct < 30 ? 'var(--green-bright)' : pct < 60 ? 'var(--text-gold)' : 'var(--text-red)'
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="section-label">Ratio de deuda</span>
        <span className="mono" style={{ fontSize: 10, color }}>{label} · {pct.toFixed(0)}%</span>
      </div>
      <div className="meter-track">
        <div className="meter-marker" style={{ left: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  )
}

// ─── Asset Bp Item ────────────────────────────────────────────────────────────

function AssetBpItem({ asset, precioHora, isSelected, onToggle, onEdit, onDelete, onViewDetail, deletePending }: {
  asset: Asset
  precioHora: number | null
  isSelected: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onViewDetail: () => void
  deletePending: boolean
}) {
  const usdVal = asset.value_in_usd ?? asset.current_value
  const hrs = precioHora && precioHora > 0 ? Math.round(usdVal / precioHora) : null

  return (
    <div className="bp-item-group">
      <div className="bp-item" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        style={{ borderBottom: 'none' }}>
        <div className="bp-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            {asset.is_liquid ? (
              <>
                <rect x="1" y="3.5" width="11" height="7.5" rx="1.5" stroke="var(--green-bright)" strokeWidth="1.2"/>
                <path d="M4 3.5V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1" stroke="var(--green-bright)" strokeWidth="1.2"/>
              </>
            ) : (
              <path d="M1.5 11L3.5 5.5L6.5 8L9.5 3.5L11.5 11" stroke="var(--green-bright)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.name}
          </p>
          {hrs !== null && !isSelected && (
            <span className="section-label" style={{ marginTop: 2 }}>{hrs.toLocaleString()} hrs vida</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {!isSelected && (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-bright)' }}>
              {fmt(asset.current_value, asset.currency)}
            </span>
          )}
          <span style={{ fontSize: 9, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'none', display: 'block' }}>▾</span>
        </div>
      </div>

      {isSelected && (
        <div className="bp-expand">
          <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--green-bright)', marginBottom: 2, lineHeight: 1 }}>
            {fmt(asset.current_value, asset.currency)}
          </div>
          <span className="section-label" style={{ display: 'block', marginBottom: hrs !== null ? 2 : 6 }}>
            {ASSET_TYPE_LABELS[asset.asset_type]}{asset.institution ? ` · ${asset.institution}` : ''}
          </span>
          {hrs !== null && (
            <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>
              {hrs.toLocaleString()} hrs de vida
            </span>
          )}
          {asset.monthly_yield != null && asset.monthly_yield > 0 && (
            <span className="section-label" style={{ display: 'block', color: 'rgba(93,202,165,0.7)', marginBottom: 6 }}>
              +{fmt(asset.monthly_yield, asset.currency)}/mes
              {asset.annual_rate_pct != null && ` · ${asset.annual_rate_pct}% anual`}
            </span>
          )}
          <div className="bp-expand-actions">
            <button onClick={e => { e.stopPropagation(); onViewDetail() }} className="bp-expand-btn">Historial</button>
            <button onClick={e => { e.stopPropagation(); onEdit() }} className="bp-expand-btn bp-expand-btn--green">Editar</button>
            <DeleteBtn onConfirm={onDelete} pending={deletePending} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Liability Bp Item ────────────────────────────────────────────────────────

function LiabilityBpItem({ liability, precioHora, isSelected, onToggle, onEdit, onDelete, onPay, onViewDetail, deletePending }: {
  liability: Liability
  precioHora: number | null
  isSelected: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
  onViewDetail: () => void
  deletePending: boolean
}) {
  const isCC = liability.liability_type === 'credit_card'
  const usage = creditUsage(liability.current_balance, liability.credit_limit)
  const usdVal = liability.balance_in_usd ?? liability.current_balance
  const hrs = precioHora && precioHora > 0 ? Math.round(usdVal / precioHora) : null

  return (
    <div className="bp-item-group">
      <div className="bp-item" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        style={{ borderBottom: 'none' }}>
        <div className="bp-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <path d="M3 6.5h7M3 4h4a2.5 2.5 0 0 1 0 5H3V2" stroke="var(--text-red)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {liability.name}
          </p>
          {hrs !== null && !isSelected && (
            <span className="section-label" style={{ marginTop: 2, color: 'rgba(242,103,90,0.6)' }}>{hrs.toLocaleString()} hrs vida</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {!isSelected && (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-red)' }}>
              {fmt(liability.current_balance, liability.currency)}
            </span>
          )}
          <span style={{ fontSize: 9, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'none', display: 'block' }}>▾</span>
        </div>
      </div>

      {isSelected && (
        <div className="bp-expand">
          <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-red)', marginBottom: 2, lineHeight: 1 }}>
            {fmt(liability.current_balance, liability.currency)}
          </div>
          <span className="section-label" style={{ display: 'block', marginBottom: hrs !== null ? 2 : 6 }}>
            {LIABILITY_TYPE_LABELS[liability.liability_type]}
          </span>
          {hrs !== null && (
            <span className="section-label" style={{ display: 'block', marginBottom: 6, color: 'rgba(242,103,90,0.55)' }}>
              {hrs.toLocaleString()} hrs de vida
            </span>
          )}
          {usage && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span className="section-label">Límite {fmt(liability.credit_limit ?? 0, liability.currency)}</span>
                <span className="mono section-label">{usage.pct.toFixed(0)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(usage.pct, 100)}%`, borderRadius: 2, background: 'var(--text-red)', transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
          {(liability.interest_rate_pct != null || liability.monthly_payment != null) && (
            <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>
              {liability.interest_rate_pct != null && `${liability.interest_rate_pct}% interés`}
              {liability.monthly_payment != null && ` · ${fmt(liability.monthly_payment, liability.currency)}/mes`}
            </span>
          )}
          <div className="bp-expand-actions">
            {isCC && <button onClick={e => { e.stopPropagation(); onPay() }} className="bp-expand-btn bp-expand-btn--pay">Pagar</button>}
            <button onClick={e => { e.stopPropagation(); onViewDetail() }} className="bp-expand-btn">Historial</button>
            <button onClick={e => { e.stopPropagation(); onEdit() }} className="bp-expand-btn">Editar</button>
            <DeleteBtn onConfirm={onDelete} pending={deletePending} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inline Confirm Delete ────────────────────────────────────────────────────

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

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron() {
  return (
    <div className="shrink-0 self-center opacity-25 ml-1">
      <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
        <path d="M1 1L5 5L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onClick }: {
  asset: Asset
  onClick: () => void
}) {
  return (
    <div
      className="brujula-list-card glass rounded-xl p-3.5 cursor-pointer transition-colors hover:bg-white/[4%] active:bg-white/[6%] select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <div className="brujula-card-badges flex items-center gap-2 mb-1 flex-wrap">
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
        <Chevron />
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
    <div className="brujula-list-card bg-white border border-[#EAF0EC] rounded-xl p-3.5 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="brujula-card-badges flex items-center gap-2 mb-1 flex-wrap">
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
      <div className="brujula-card-actions flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="text-[12px] text-[#7A9A8A] hover:text-[#2E7D52] transition-colors px-1">
          Editar
        </button>
        <DeleteBtn onConfirm={onDelete} pending={pending} />
      </div>
    </div>
  )
}

// ─── Liability Card ───────────────────────────────────────────────────────────

function LiabilityCard({ liability, onClick }: {
  liability: Liability
  onClick: () => void
}) {
  const usage = liability.liability_type === 'credit_card'
    ? creditUsage(liability.current_balance, liability.credit_limit)
    : null

  return (
    <div
      className="brujula-list-card glass rounded-xl p-3.5 cursor-pointer transition-colors hover:bg-white/[4%] active:bg-white/[6%] select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <div className="brujula-card-badges flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{liability.name}</span>
            <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(232,68,52,0.15)', color: 'var(--text-red)' }}>
              {LIABILITY_TYPE_LABELS[liability.liability_type]}
            </span>
          </div>
          <p className="font-mono text-[20px] font-semibold leading-tight" style={{ color: 'var(--text-red)' }}>
            {fmtFull(liability.current_balance, liability.currency)}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {liability.interest_rate_pct != null && `${liability.interest_rate_pct}% interés`}
            {liability.monthly_payment != null && ` · ${fmtFull(liability.monthly_payment, liability.currency)}/mes`}
          </p>
          {liability.notes && <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{liability.notes}</p>}
          {liability.registered_by_name && <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>Registró {liability.registered_by_name}</p>}
          {usage && (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Uso {fmtFull(liability.current_balance, liability.currency)} de {fmtFull(liability.credit_limit ?? 0, liability.currency)}
                </span>
                <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--text-red)' }}>{usage.pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#E84434] transition-all" style={{ width: `${Math.min(usage.pct, 100)}%` }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>Disponible: {fmtFull(usage.available, liability.currency)}</p>
            </div>
          )}
          {liability.liability_type === 'credit_card' && !usage && (
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>Sin límite registrado · toca para editar</p>
          )}
        </div>
        <Chevron />
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
    <div className="glass card"
      style={{ borderColor: goal.is_completed ? 'rgba(46,125,82,0.3)' : 'rgba(255,255,255,0.09)' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onToggle} disabled={pending} style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
          border: `2px solid ${goal.is_completed ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
          background: goal.is_completed ? 'var(--green)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: pending ? 'default' : 'pointer', padding: 0,
        }}>
          {goal.is_completed && (
            <svg width={10} height={8} viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: goal.is_completed ? 'var(--text-muted)' : 'var(--text-primary)', margin: 0, textDecoration: goal.is_completed ? 'line-through' : 'none', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal.label}
            </p>
            {goal.target_days != null && (
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: goal.is_completed ? 'var(--text-muted)' : 'var(--green)', flexShrink: 0 }}>
                {goal.target_days}d
              </span>
            )}
          </div>

          {progreso !== null && (
            <div className="prog-track" style={{ marginBottom: 8 }}>
              <div className="prog-fill" style={{ width: `${progreso}%`, background: 'var(--green)' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <button onClick={onEdit} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontFamily: 'var(--font-sans)' }}>
              Editar
            </button>
            <DeleteBtn onConfirm={onDelete} pending={pending} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Asset Detail Modal ───────────────────────────────────────────────────────

function AssetDetailModal({ asset, onClose, onEdit, onSaved }: {
  asset: Asset
  onClose: () => void
  onEdit: () => void
  onSaved: () => void
}) {
  const [items, setItems] = useState<AssetMovementHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [histError, setHistError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const isLiquid = asset.liquidity_kind != null

  useEffect(() => {
    if (!isLiquid) return
    setLoading(true)
    getAssetMovementHistory(asset.id).then(res => {
      setItems(res.data)
      setHistError(res.error)
      setLoading(false)
    })
  }, [asset.id, isLiquid])

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteAsset(asset.id)
      onSaved()
    })
  }

  return (
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4 backdrop-blur-sm">
      <div className="brujula-modal-card w-full sm:max-w-md bg-[#0D1A12] sm:rounded-2xl shadow-xl border border-white/10 max-h-[90dvh] flex flex-col">

        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* ── Header ── */}
        <div className="shrink-0 p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-[15px] font-semibold text-white truncate">{asset.name}</h2>
                <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  {ASSET_TYPE_LABELS[asset.asset_type]}
                </span>
                {asset.is_liquid && (
                  <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)' }}>Líquido</span>
                )}
                {asset.account_ownership === 'joint' && (
                  <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)' }}>Mancomunada</span>
                )}
              </div>
              {asset.institution && (
                <p className="text-[11px] text-[#7A9A8A]">{asset.institution}</p>
              )}
            </div>
            <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-full text-[#7A9A8A] hover:text-white transition-colors text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>×</button>
          </div>

          {/* Valor */}
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(93,202,165,0.10)', border: '1px solid rgba(93,202,165,0.20)' }}>
            <p className="text-[10px] uppercase tracking-widest text-[#5DCAA5] mb-0.5">Valor actual</p>
            <p className="font-mono text-[24px] font-semibold text-white leading-tight">{fmtFull(asset.current_value, asset.currency)}</p>
            {asset.monthly_yield != null && asset.monthly_yield > 0 && (
              <p className="text-[11px] text-[#5DCAA5] mt-1">
                +{fmtFull(asset.monthly_yield, asset.currency)}/mes
                {asset.annual_rate_pct != null && ` · ${asset.annual_rate_pct}% anual`}
              </p>
            )}
          </div>

          {/* Detalles extras */}
          {(asset.ticker_symbol || asset.quantity != null || asset.notes || asset.registered_by_name) && (
            <div className="space-y-1 mb-4 text-[11px] text-[#7A9A8A]">
              {asset.ticker_symbol && asset.quantity != null && (
                <p>{asset.quantity} unidades · {asset.ticker_symbol}</p>
              )}
              {asset.notes && <p>{asset.notes}</p>}
              {asset.registered_by_name && <p>Registró {asset.registered_by_name}</p>}
            </div>
          )}

          {isLiquid && (
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--green-bright)', opacity: 0.7 }}>Movimientos</p>
          )}
        </div>

        {/* ── Movimientos (solo cuentas líquidas) ── */}
        {isLiquid ? (
          <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 min-h-0">
            {loading && <p className="text-[13px] text-[#7A9A8A] py-6 text-center">Cargando movimientos…</p>}
            {!loading && histError && <p className="text-[13px] text-[#E84434] py-6 text-center">{histError}</p>}
            {!loading && !histError && items.length === 0 && (
              <p className="text-[13px] text-[#7A9A8A] py-6 text-center">Sin movimientos registrados.</p>
            )}
            {!loading && !histError && items.length > 0 && (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[3%] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white">
                          {MOVEMENT_LABELS[item.movement_type] ?? item.movement_type}
                        </p>
                        <p className="text-[11px] text-[#7A9A8A]">
                          {fmtIsoDate(item.created_at)}
                          {item.registered_by_name && ` · ${item.registered_by_name}`}
                        </p>
                        {item.notes && <p className="text-[11px] text-[#7A9A8A] mt-0.5 truncate">{item.notes}</p>}
                      </div>
                      <p className={`font-mono text-[14px] font-semibold shrink-0 ${item.amount >= 0 ? 'text-[#3A9E6A]' : ''}`}
                        style={item.amount < 0 ? { color: 'var(--text-red)' } : undefined}>
                        {item.amount >= 0 ? '+' : ''}{fmtFull(item.amount, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* ── Footer ── */}
        <div className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-4 flex gap-2 items-center border-t border-white/[6%]"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          {confirming ? (
            <button type="button" onClick={handleDelete} disabled={deletePending}
              className="py-2.5 px-4 rounded-xl bg-[#E84434] text-white text-[13px] font-medium disabled:opacity-60 transition-colors">
              {deletePending ? 'Eliminando…' : '¿Confirmar?'}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="py-2.5 px-4 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-[#E84434] transition-colors">
              Eliminar
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onEdit}
            className="py-2.5 px-5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors">
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Liability Detail Modal ───────────────────────────────────────────────────

function LiabilityDetailModal({ liability, liquidityAccounts, onClose, onEdit, onSaved }: {
  liability: Liability
  liquidityAccounts: LiquidityAccount[]
  onClose: () => void
  onEdit: () => void
  onSaved: () => void
}) {
  const isCC = liability.liability_type === 'credit_card'
  const bankAccounts = liquidityAccounts.filter(a => a.liquidity_kind === 'bank')

  const [ccItems, setCcItems] = useState<CreditCardExpenseHistoryItem[]>([])
  const [payItems, setPayItems] = useState<LiabilityPaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [histError, setHistError] = useState<string | null>(null)

  // Inline pay form
  const [view, setView] = useState<'history' | 'paying'>('history')
  const [paySplits, setPaySplits] = useState<{ asset_id: string; amount: string }[]>([
    { asset_id: bankAccounts[0]?.id ?? '', amount: '' },
  ])
  const [payError, setPayError] = useState<string | null>(null)
  const [payPending, startPayTransition] = useTransition()

  const payTotal      = paySplits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const isMultiPay    = paySplits.length > 1
  const addPaySplit    = () => setPaySplits(prev => [...prev, { asset_id: bankAccounts[0]?.id ?? '', amount: '' }])
  const removePaySplit = (i: number) => setPaySplits(prev => prev.filter((_, idx) => idx !== i))
  const updatePaySplit = (i: number, field: 'asset_id' | 'amount', val: string) =>
    setPaySplits(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  // Delete confirm
  const [confirming, setConfirming] = useState(false)
  const [deletePending, startDeleteTransition] = useTransition()

  const usage = creditUsage(liability.current_balance, liability.credit_limit)
  const expenseTotal = ccItems.filter(i => i.kind === 'expense').reduce((s, i) => s + i.amount, 0)
  const paymentTotal = ccItems.filter(i => i.kind === 'payment').reduce((s, i) => s + i.amount, 0)

  useEffect(() => {
    if (isCC) {
      getCreditCardExpenseHistory(liability.id).then(res => {
        setCcItems(res.data)
        setHistError(res.error)
        setLoading(false)
      })
    } else {
      getLiabilityPaymentHistory(liability.id).then(res => {
        setPayItems(res.data)
        setHistError(res.error)
        setLoading(false)
      })
    }
  }, [liability.id, isCC])

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteLiability(liability.id)
      onSaved()
    })
  }

  function handlePay() {
    if (payTotal <= 0) return setPayError('Ingresá un monto válido')
    if (payTotal > liability.current_balance) return setPayError(`El monto supera la deuda (${fmtFull(liability.current_balance, liability.currency)})`)
    for (const split of paySplits) {
      const acc = bankAccounts.find(a => a.id === split.asset_id)
      const n = parseFloat(split.amount) || 0
      if (!acc) return setPayError('Selecciona una cuenta bancaria válida')
      if (n <= 0) return setPayError(`Ingresá un monto para ${acc.name}`)
      if (n > acc.current_value) return setPayError(`Saldo insuficiente en ${acc.name} (${fmtFull(acc.current_value, acc.currency)})`)
    }
    setPayError(null)
    const splits = paySplits.map(s => ({ asset_id: s.asset_id, amount: parseFloat(s.amount) || 0 }))
    startPayTransition(async () => {
      const res = await payOffCreditCard({ liability_id: liability.id, splits })
      if (res.error) return setPayError(res.error)
      onSaved()
    })
  }

  return (
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4 backdrop-blur-sm">
      <div className="brujula-modal-card w-full sm:max-w-md bg-[#0D1A12] sm:rounded-2xl shadow-xl border border-white/10 max-h-[90dvh] flex flex-col">

        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* ── Header ── */}
        <div className="shrink-0 p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {view === 'paying' && (
                  <button onClick={() => { setView('history'); setPayError(null); setPaySplits([{ asset_id: bankAccounts[0]?.id ?? '', amount: '' }]) }}
                    className="flex items-center justify-center w-9 h-9 rounded-full text-[#7A9A8A] hover:text-white transition-colors shrink-0 mr-1" style={{ background: 'rgba(255,255,255,0.06)' }}>←</button>
                )}
                <h2 className="text-[15px] font-semibold text-white truncate">
                  {view === 'paying' ? 'Pagar deuda' : liability.name}
                </h2>
                {view === 'history' && (
                  <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(232,68,52,0.15)', color: 'var(--text-red)' }}>
                    {LIABILITY_TYPE_LABELS[liability.liability_type]}
                  </span>
                )}
              </div>
              {view === 'paying' && (
                <p className="text-[11px] text-[#7A9A8A] mt-0.5 truncate">{liability.name}</p>
              )}
              {view === 'history' && liability.registered_by_name && (
                <p className="text-[11px] text-[#7A9A8A]">Registró {liability.registered_by_name}</p>
              )}
            </div>
            <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-full text-[#7A9A8A] hover:text-white transition-colors text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>×</button>
          </div>

          {/* CC Summary */}
          {isCC && view === 'history' && (
            <>
              <div className="grid grid-cols-1 gap-2 mb-3 min-[380px]:grid-cols-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(232,68,52,0.15)', border: '1px solid rgba(232,68,52,0.20)' }}>
                  <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
                  <p className="font-mono text-[16px] font-semibold leading-tight" style={{ color: 'var(--text-red)' }}>
                    {fmtFull(liability.current_balance, liability.currency)}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(232,68,52,0.15)', border: '1px solid rgba(232,68,52,0.20)' }}>
                  <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Gastos</p>
                  <p className="font-mono text-[16px] font-semibold leading-tight" style={{ color: 'var(--text-red)' }}>
                    {fmtFull(expenseTotal, liability.currency)}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(46,125,82,0.15)', border: '1px solid rgba(46,125,82,0.25)' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--green-bright)' }}>Pagos</p>
                  <p className="font-mono text-[16px] font-semibold leading-tight text-white">
                    {fmtFull(paymentTotal, liability.currency)}
                  </p>
                </div>
              </div>
              {usage ? (
                <div className="rounded-xl border border-white/10 bg-white/[4%] p-3 mb-3">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-[#7A9A8A]">Uso del límite</p>
                    <p className="font-mono text-[13px] font-semibold text-[#E84434]">{usage.pct.toFixed(0)}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-[#E84434] transition-all" style={{ width: `${Math.min(usage.pct, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#7A9A8A]">
                    <span>Límite {fmtFull(liability.credit_limit ?? 0, liability.currency)}</span>
                    <span>Disponible {fmtFull(usage.available, liability.currency)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[4%] p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#7A9A8A]">Límite no registrado</p>
                  <p className="text-[11px] text-white/50 mt-1">Editá el pasivo para agregar el límite y ver el porcentaje de uso.</p>
                </div>
              )}
              <p className="text-[10px] uppercase tracking-widest text-[#7A9A8A] mb-2">Historial</p>
            </>
          )}

          {/* Non-CC balance */}
          {!isCC && view === 'history' && (
            <>
              <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(232,68,52,0.10)', border: '1px solid rgba(232,68,52,0.20)' }}>
                <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
                <p className="font-mono text-[24px] font-semibold leading-tight" style={{ color: 'var(--text-red)' }}>
                  {fmtFull(liability.current_balance, liability.currency)}
                </p>
                {(liability.interest_rate_pct != null || liability.monthly_payment != null) && (
                  <p className="text-[11px] text-[#7A9A8A] mt-1">
                    {liability.interest_rate_pct != null && `${liability.interest_rate_pct}% interés`}
                    {liability.monthly_payment != null && ` · ${fmtFull(liability.monthly_payment, liability.currency)}/mes`}
                  </p>
                )}
              </div>
              {liability.notes && <p className="text-[11px] text-[#7A9A8A] mb-3">{liability.notes}</p>}
              <p className="text-[10px] uppercase tracking-widest text-[#7A9A8A] mb-2">Pagos registrados</p>
            </>
          )}

          {/* Pay form: deuda actual pill */}
          {view === 'paying' && (
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(232,68,52,0.15)', border: '1px solid rgba(232,68,52,0.25)' }}>
              <p className="text-[10px] uppercase tracking-widest text-[#E84434] mb-0.5">Deuda actual</p>
              <p className="font-mono text-[22px] font-semibold" style={{ color: 'var(--text-red)' }}>
                {fmtFull(liability.current_balance, liability.currency)}
              </p>
            </div>
          )}
        </div>

        {/* ── Contenido scrolleable ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 min-h-0">
          {view === 'history' ? (
            <>
              {loading && <p className="text-[13px] text-[#7A9A8A] py-6 text-center">Cargando historial…</p>}
              {!loading && histError && <p className="text-[13px] text-[#E84434] py-6 text-center">{histError}</p>}

              {/* CC history */}
              {isCC && !loading && !histError && ccItems.length === 0 && (
                <p className="text-[13px] text-[#7A9A8A] py-6 text-center">Sin gastos registrados con esta tarjeta.</p>
              )}
              {isCC && !loading && !histError && ccItems.length > 0 && (
                <div className="space-y-2">
                  {ccItems.map(item => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[3%] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.kind === 'expense' ? (
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.category_color ?? '#7A9A8A' }} />
                            ) : (
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.kind === 'adjustment' ? '#C69B30' : '#3A9E6A' }} />
                            )}
                            <p className="text-[13px] font-medium text-white truncate">
                              {item.kind === 'expense' ? (item.category_name ?? 'Sin categoría') : item.kind === 'adjustment' ? 'Ajuste de saldo' : 'Pago realizado'}
                            </p>
                            {item.kind === 'payment' && (
                              <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(46,125,82,0.25)', color: '#3A9E6A' }}>Pago</span>
                            )}
                            {item.kind === 'adjustment' && (
                              <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5" style={{ background: 'rgba(198,155,48,0.20)', color: '#C69B30' }}>Ajuste</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A9A8A]">
                            {fmtDate(item.transaction_date)}
                            {item.registered_by_name ? ` · ${item.registered_by_name}` : ''}
                            {item.kind === 'payment' && item.source_account_name && ` · desde ${item.source_account_name}`}
                          </p>
                          {item.notes && <p className="text-[11px] text-[#7A9A8A] mt-1 truncate">{item.notes}</p>}
                        </div>
                        <p className={`font-mono text-[14px] font-semibold shrink-0 ${item.kind === 'payment' ? 'text-[#3A9E6A]' : item.kind === 'adjustment' ? 'text-[#C69B30]' : ''}`}
                          style={item.kind === 'expense' ? { color: 'var(--text-red)' } : undefined}>
                          {item.kind === 'payment' ? `-${fmtFull(item.amount, item.currency)}` : fmtFull(item.amount, item.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Non-CC payment history */}
              {!isCC && !loading && !histError && payItems.length === 0 && (
                <p className="text-[13px] text-[#7A9A8A] py-6 text-center">Sin pagos registrados.</p>
              )}
              {!isCC && !loading && !histError && payItems.length > 0 && (
                <div className="space-y-2">
                  {payItems.map(item => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[3%] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white">Pago realizado</p>
                          <p className="text-[11px] text-[#7A9A8A]">
                            {fmtIsoDate(item.created_at)}
                            {item.source_account_name && ` · desde ${item.source_account_name}`}
                            {item.registered_by_name && ` · ${item.registered_by_name}`}
                          </p>
                          {item.notes && <p className="text-[11px] text-[#7A9A8A] mt-0.5 truncate">{item.notes}</p>}
                        </div>
                        <p className="font-mono text-[14px] font-semibold shrink-0 text-[#3A9E6A]">
                          -{fmtFull(item.amount, item.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Pay form */
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-2">Pagar desde</label>
                <div className="space-y-2">
                  {paySplits.map((split, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={split.asset_id}
                        onChange={e => { updatePaySplit(i, 'asset_id', e.target.value); setPayError(null) }}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#3A9E6A] bg-white/[6%]"
                      >
                        {bankAccounts.map(acc => (
                          <option key={acc.id} value={acc.id} className="bg-[#1A2520]">
                            {acc.name} ({fmtFull(acc.current_value, acc.currency)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={split.amount}
                        onChange={e => { updatePaySplit(i, 'amount', e.target.value); setPayError(null) }}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        autoFocus={i === 0}
                        className="w-[96px] px-3 py-2.5 rounded-lg border border-white/10 text-[14px] font-mono text-white text-right focus:outline-none focus:border-[#3A9E6A] bg-white/[6%]"
                      />
                      {isMultiPay && (
                        <button type="button" onClick={() => removePaySplit(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#E84434] shrink-0"
                          style={{ background: 'rgba(232,68,52,0.1)', border: '1px solid rgba(232,68,52,0.2)' }}>
                          −
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addPaySplit}
                  className="mt-2 text-[12px] text-[#3A9E6A] hover:text-white transition-colors">
                  + Agregar cuenta
                </button>
                {payTotal > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[11px] rounded-lg px-2.5 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {isMultiPay ? 'Total asignado' : 'Deuda restante'}
                    </span>
                    <span className="font-mono font-medium" style={{
                      color: isMultiPay
                        ? (payTotal <= liability.current_balance ? '#3A9E6A' : '#E84434')
                        : 'var(--text-secondary)',
                    }}>
                      {isMultiPay
                        ? fmtFull(payTotal, liability.currency)
                        : fmtFull(Math.max(0, liability.current_balance - payTotal), liability.currency)}
                    </span>
                  </div>
                )}
              </div>
              {payError && <p className="text-[#E84434] text-[12px]">{payError}</p>}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-4 border-t border-white/[6%]"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          {view === 'paying' ? (
            <div className="brujula-modal-actions flex gap-3">
              <button type="button" onClick={() => { setView('history'); setPayError(null); setPaySplits([{ asset_id: bankAccounts[0]?.id ?? '', amount: '' }]) }} disabled={payPending}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handlePay} disabled={payPending || payTotal <= 0}
                className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
                {payPending ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              {confirming ? (
                <button type="button" onClick={handleDelete} disabled={deletePending}
                  className="py-2.5 px-4 rounded-xl bg-[#E84434] text-white text-[13px] font-medium disabled:opacity-60 transition-colors">
                  {deletePending ? 'Eliminando…' : '¿Confirmar?'}
                </button>
              ) : (
                <button type="button" onClick={() => setConfirming(true)}
                  className="py-2.5 px-4 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-[#E84434] transition-colors">
                  Eliminar
                </button>
              )}
              <div className="flex-1" />
              <button type="button" onClick={onEdit}
                className="py-2.5 px-4 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-white transition-colors">
                Editar
              </button>
              {bankAccounts.length > 0 && (
                <button type="button" onClick={() => setView('paying')}
                  className="py-2.5 px-4 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors">
                  Pagar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Modal =
  | { type: 'asset_new' }
  | { type: 'asset_edit'; asset: Asset }
  | { type: 'asset_detail'; asset: Asset }
  | { type: 'liability_new' }
  | { type: 'liability_edit'; liability: Liability }
  | { type: 'liability_detail'; liability: Liability }
  | { type: 'business_new' }
  | { type: 'business_edit'; business: Business }
  | { type: 'goal_new' }
  | { type: 'goal_edit'; goal: FreedomGoal }
  | { type: 'scan_balances' }
  | null

interface BrujulaClientProps {
  data: BrujulaData
}

export function BrujulaClient({ data }: BrujulaClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null)
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

  const totalAssets      = fastlane.total_assets_usd
  const totalLiabilities = fastlane.total_liabilities_usd
  const netWorth         = fastlane.net_worth_usd
  const diasLibertad     = dias_de_libertad.dias_libertad
  const ingresoPasivo    = dias_de_libertad.ingreso_pasivo_mensual

  return (
    <>
      {/* ── Hero Card ── */}
      <div className="glass-hero" style={{ padding: 20, marginBottom: 20 }}>

        {/* ScoreRing + DimPills 2×2 */}
        <div className="brujula-hero-ring-row">
          <ScoreRing score={score.total_score} level_label={score.level_label} />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
            <DimPill label="Tiempo" score={score.d1_time_decoupling}
              description={precio_real_hora != null ? `$${precio_real_hora.toFixed(0)}/hr` : 'sin datos'} />
            <DimPill label="Riqueza" score={score.d2_asset_health}
              description={`${assets.length} activos`} />
            <DimPill label="Libertad" score={score.d3_financial_freedom}
              description={`${diasLibertad.toFixed(0)} días`} />
            <DimPill label="Impulso" score={score.d4_momentum}
              description={data.retention_rate_m2 != null ? `${data.retention_rate_m2.toFixed(0)}% ret.` : 'sin datos'} />
          </div>
        </div>

        {/* Patrimonio neto */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div className="section-label">Patrimonio neto</div>
          <div className="mono glow-green" style={{ fontSize: 'clamp(20px, 7.5vw, 30px)', fontWeight: 700, color: netWorth >= 0 ? 'var(--green-bright)' : 'var(--text-red)', lineHeight: 1.1, marginTop: 3 }}>
            {netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth))}
          </div>
        </div>

        {/* Activos vs Pasivos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="section-label">Activos</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{fmt(totalAssets)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="section-label">Libertad</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-bright)', marginTop: 2 }}>{fmtDias(diasLibertad)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="section-label">Pasivos</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-red)', marginTop: 2 }}>{fmt(totalLiabilities)}</div>
          </div>
        </div>

        <DebtMeter totalLiabilities={totalLiabilities} totalAssets={totalAssets} />
      </div>

      {/* ── Actualizar saldos con captura ── */}
      <button
        type="button"
        onClick={() => setModal({ type: 'scan_balances' })}
        style={{
          width: '100%', marginBottom: 20,
          background: 'transparent',
          border: '1px dashed rgba(58,158,106,0.35)',
          borderRadius: 10, padding: '9px 12px',
          color: 'var(--green-bright)',
          fontFamily: 'var(--font-sans)', fontSize: 11,
          cursor: 'pointer', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M5 3.5V2.5A.5.5 0 0 1 5.5 2h3a.5.5 0 0 1 .5.5v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Actualizar saldos con captura
      </button>

      {/* ── Balance Columns: Activos | Pasivos ── */}
      <div className="balance-cols">
        {/* Activos */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 className="section-title">Activos</h2>
            <button className="ghost-btn" onClick={() => setModal({ type: 'asset_new' })}>+</button>
          </div>
          {assets.length === 0 ? (
            <div className="glass" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Sin activos</p>
            </div>
          ) : (
            <div className="glass balance-col-list" style={{ padding: '4px 12px' }}>
              {assets.map(a => (
                <AssetBpItem
                  key={a.id}
                  asset={a}
                  precioHora={precio_real_hora}
                  isSelected={selectedAssetId === a.id}
                  onToggle={() => setSelectedAssetId(prev => prev === a.id ? null : a.id)}
                  onEdit={() => setModal({ type: 'asset_edit', asset: a })}
                  onDelete={() => startTransition(async () => { await deleteAsset(a.id); setSelectedAssetId(null); router.refresh() })}
                  onViewDetail={() => setModal({ type: 'asset_detail', asset: a })}
                  deletePending={pending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pasivos */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 className="section-title">Pasivos</h2>
            <button className="ghost-btn" onClick={() => setModal({ type: 'liability_new' })}>+</button>
          </div>
          {liabilities.length === 0 ? (
            <div className="glass" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Sin pasivos</p>
            </div>
          ) : (
            <div className="glass balance-col-list" style={{ padding: '4px 12px' }}>
              {liabilities.map(l => (
                <LiabilityBpItem
                  key={l.id}
                  liability={l}
                  precioHora={precio_real_hora}
                  isSelected={selectedLiabilityId === l.id}
                  onToggle={() => setSelectedLiabilityId(prev => prev === l.id ? null : l.id)}
                  onEdit={() => setModal({ type: 'liability_edit', liability: l })}
                  onDelete={() => startTransition(async () => { await deleteLiability(l.id); setSelectedLiabilityId(null); router.refresh() })}
                  onPay={() => setModal({ type: 'liability_detail', liability: l })}
                  onViewDetail={() => setModal({ type: 'liability_detail', liability: l })}
                  deletePending={pending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Negocios ── */}
      <section style={{ marginBottom: 20 }}>
        {businesses.length === 0 ? (
          <button onClick={() => setModal({ type: 'business_new' })} style={{
            width: '100%', background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '9px',
            color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer',
          }}>
            + Registrar negocio
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 className="section-title">Negocios</h2>
              <button className="ghost-btn" onClick={() => setModal({ type: 'business_new' })}>+</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {businesses.map(b => (
                <BusinessCard key={b.id} business={b}
                  onEdit={() => setModal({ type: 'business_edit', business: b })}
                  onDelete={() => handleDelete(() => deleteBusiness(b.id))}
                  pending={pending} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Metas de Libertad ── */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="section-title">Metas de libertad</h2>
          <button className="ghost-btn" onClick={() => setModal({ type: 'goal_new' })}>+ Agregar</button>
        </div>

        {diasLibertad > 0 && (
          <div className="glass" style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-bright)', lineHeight: 1, margin: 0 }}>{fmtDias(diasLibertad)}</p>
              <div className="section-label" style={{ marginTop: 3 }}>días actuales</div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {fmt(ingresoPasivo)}/mes cubre {diasLibertad.toFixed(0)} días sin trabajar
            </p>
          </div>
        )}

        {freedom_goals.length === 0 ? (
          <div className="glass" style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>Sin metas definidas</p>
            <button className="ghost-btn" onClick={() => setModal({ type: 'goal_new' })}>+ Agregar meta</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {freedom_goals.map(g => (
              <FreedomGoalRow key={g.id} goal={g} diasActuales={diasLibertad}
                onEdit={() => setModal({ type: 'goal_edit', goal: g })}
                onDelete={() => handleDelete(() => deleteFreedomGoal(g.id))}
                onToggle={() => handleToggleGoal(g)}
                pending={pending} />
            ))}
          </div>
        )}
      </section>

      {/* ── Modales ── */}
      {modal?.type === 'asset_new' && (
        <AssetModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'asset_edit' && (
        <AssetModal asset={modal.asset} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'asset_detail' && (
        <AssetDetailModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'asset_edit', asset: (modal as { type: 'asset_detail'; asset: Asset }).asset })}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'liability_new' && (
        <LiabilityModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'liability_edit' && (
        <LiabilityModal liability={modal.liability} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'liability_detail' && (
        <LiabilityDetailModal
          liability={modal.liability}
          liquidityAccounts={liquidity_accounts}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'liability_edit', liability: (modal as { type: 'liability_detail'; liability: Liability }).liability })}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'business_new' && (
        <BusinessModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'business_edit' && (
        <BusinessModal business={modal.business} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'scan_balances' && (
        <ScanBalancesModal onClose={() => setModal(null)} onSaved={refresh} />
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
