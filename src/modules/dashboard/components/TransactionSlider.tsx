'use client'

import { useState, useTransition } from 'react'
import { deleteTransaction, deleteRecurringTemplate, confirmRecurringTemplate, approveRecurringTransaction, upsertBudget } from '../actions'
import type { Transaction, TransactionGroup, Budget, RecurringTemplate, TransactionCategory } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtHours(h: number) {
  return h >= 1 ? `${h.toFixed(1)}h` : `${(h * 60).toFixed(0)}min`
}

function fmtAutonomy(days: number) {
  const abs = Math.abs(days)
  if (abs >= 1) return `${abs.toFixed(1)}d`
  return `${(abs * 24).toFixed(1)}h`
}

const DAY_NAMES: Record<number, string> = { 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb', 7:'Dom' }
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFrequency(t: RecurringTemplate): string {
  switch (t.frequency ?? 'monthly') {
    case 'daily':    return 'Diario'
    case 'weekly':   return `Semanal · ${DAY_NAMES[t.day_of_month] ?? ''}`
    case 'biweekly': return `Quincenal · ${DAY_NAMES[t.day_of_month] ?? ''}`
    case 'monthly':  return `Mensual · día ${t.day_of_month}`
    case 'annual':   return `Anual · ${t.month_of_year ? MONTH_NAMES[t.month_of_year - 1] : ''} ${t.day_of_month}`
    case 'custom':   return `Cada ${t.custom_interval_days ?? 30}d`
    case 'manual':   return 'Sin frecuencia fija'
    default:         return `Día ${t.day_of_month}`
  }
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'HOY'
  if (date.toDateString() === yesterday.toDateString()) return 'AYER'
  return date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5px', height: '18px', marginRight: '6px' }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: '5px',
            height: `${Math.max(2, (v / max) * 18)}px`,
            backgroundColor: '#EAF0EC',
            borderRadius: '1px 1px 0 0',
          }}
        />
      ))}
    </div>
  )
}

// ─── Transaction Detail Sheet ─────────────────────────────────────────────────

interface TxSheetProps {
  tx: Transaction
  onClose: () => void
  onEdit: (tx: Transaction) => void
  onDeleted: () => void
}

function TxSheet({ tx, onClose, onEdit, onDeleted }: TxSheetProps) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteTransaction(tx.id)
      onDeleted()
    })
  }

  const hrs = null // autonomía calculada a nivel de lista, no en detalle

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#141F19', marginBottom: '4px' }}>
        {tx.notes || tx.category?.name || 'Transacción'}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 600, color: tx.type === 'expense' ? '#E84434' : '#3A9E6A', marginBottom: '4px' }}>
        {tx.type === 'expense' ? '−' : '+'}{fmt(tx.amount, tx.currency)}
      </p>
      {hrs !== null && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#C69B30', marginBottom: '12px' }}>
          {fmtHours(hrs)} de vida
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <Row label="Categoría" value={tx.category?.name ?? '—'} />
        <Row label="Fecha" value={new Date(tx.transaction_date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} />
        <Row label="Estado" value={tx.status === 'confirmed' ? 'Confirmado' : 'Pendiente'} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <SheetBtn label="Editar" onClick={() => { onClose(); onEdit(tx) }} />
        <SheetBtn label={pending ? '…' : 'Eliminar'} onClick={handleDelete} danger disabled={pending} />
      </div>
    </Sheet>
  )
}

// ─── Budget Sheet ─────────────────────────────────────────────────────────────

function BudgetSheet({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: () => void }) {
  const [val, setVal] = useState(budget.suggested_amount?.toString() ?? '')
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const n = parseFloat(val)
    if (isNaN(n) || n <= 0) return
    startTransition(async () => {
      await upsertBudget(budget.category_id, n)
      onSaved()
    })
  }

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#141F19', marginBottom: '12px' }}>
        {budget.category?.name} — límite sugerido
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Monto sugerido / mes
      </p>
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={budget.avg_amount?.toFixed(0) ?? '0'}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D0DDD6', fontFamily: 'var(--font-mono)', fontSize: '16px', color: '#141F19', outline: 'none', marginBottom: '12px' }}
      />
      {budget.avg_amount && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A', marginBottom: '12px' }}>
          Promedio histórico: {fmt(budget.avg_amount)}
        </p>
      )}
      <SheetBtn label={pending ? '…' : 'Guardar'} onClick={handleSave} disabled={pending} />
    </Sheet>
  )
}

// ─── Recurring Sheet ──────────────────────────────────────────────────────────

function RecurringSheet({ template, onClose, onChanged }: { template: RecurringTemplate; onClose: () => void; onChanged: () => void }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteRecurringTemplate(template.id)
      onChanged()
    })
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmRecurringTemplate(template.id)
      onChanged()
    })
  }

  function handleApprove() {
    startTransition(async () => {
      await approveRecurringTransaction(template.id)
      onChanged()
    })
  }

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#141F19', marginBottom: '4px' }}>{template.name}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600, color: template.type === 'expense' ? '#E84434' : '#3A9E6A', marginBottom: '12px' }}>
        {fmt(template.amount, template.currency)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <Row label="Categoría" value={template.category?.name ?? '—'} />
        <Row label="Frecuencia" value={fmtFrequency(template)} />
        {template.last_confirmed_at && <Row label="Último registro" value={new Date(template.last_confirmed_at).toLocaleDateString('es')} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SheetBtn label={pending ? '…' : '✓ Registrar hoy'} onClick={handleApprove} disabled={pending} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <SheetBtn label={pending ? '…' : 'Marcar como activo'} onClick={handleConfirm} disabled={pending} />
          <SheetBtn label={pending ? '…' : 'Eliminar'} onClick={handleDelete} danger disabled={pending} />
        </div>
      </div>
    </Sheet>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.4)', padding: '0 16px' }} className="flex items-end justify-center sm:items-center">
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '440px' }} className="mb-4 sm:mb-0">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button onClick={onClose} style={{ color: '#7A9A8A', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#7A9A8A' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#141F19' }}>{value}</span>
    </div>
  )
}

function SheetBtn({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '10px', borderRadius: '10px',
        backgroundColor: danger ? '#E8443415' : '#EAF0EC',
        border: `0.5px solid ${danger ? '#E8443430' : '#D0DDD6'}`,
        fontFamily: 'var(--font-sans)', fontSize: '13px',
        color: danger ? '#E84434' : '#141F19',
        cursor: 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TransactionSliderProps {
  transaction_groups: TransactionGroup[]
  budgets: Budget[]
  recurring_templates: RecurringTemplate[]
  categories: TransactionCategory[]
  gasto_diario: number | null
  onEditTransaction: (tx: Transaction) => void
  onDataChanged: () => void
}

type Sheet =
  | { type: 'tx'; tx: Transaction }
  | { type: 'budget'; budget: Budget }
  | { type: 'recurring'; template: RecurringTemplate }
  | null

export function TransactionSlider({
  transaction_groups,
  budgets,
  recurring_templates,
  categories,
  gasto_diario,
  onEditTransaction,
  onDataChanged,
}: TransactionSliderProps) {
  const [tab, setTab] = useState(0)
  const [sheet, setSheet] = useState<Sheet>(null)

  const TABS = ['Gastos', 'Presupuestos', 'Habituales']

  // Compute weekly sparklines per category from transaction_groups
  const now = new Date()
  const weekSpend: Record<string, number[]> = {}
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (w + 1) * 7)
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - w * 7)
    for (const group of transaction_groups) {
      const d = new Date(group.date + 'T12:00:00')
      if (d >= weekStart && d < weekEnd) {
        for (const tx of group.transactions) {
          if (tx.type === 'expense') {
            if (!weekSpend[tx.category_id]) weekSpend[tx.category_id] = [0, 0, 0, 0]
            weekSpend[tx.category_id][3 - w] += tx.amount
          }
        }
      }
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', backgroundColor: '#EAF0EC', borderRadius: '9999px', padding: '4px', gap: '4px', marginBottom: '16px' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              flex: 1, textAlign: 'center', padding: '7px 4px',
              fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
              color: tab === i ? '#141F19' : '#7A9A8A',
              backgroundColor: tab === i ? '#FFFFFF' : 'transparent',
              border: 'none',
              borderRadius: '9999px',
              boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1 — Gastos */}
      {tab === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          {transaction_groups.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7A9A8A' }}>Sin transacciones este período</p>
            </div>
          ) : (
            transaction_groups.map(group => (
              <div key={group.date}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A', padding: '8px 14px 3px', backgroundColor: '#F2F7F4' }}>
                  {dayLabel(group.date)}
                </p>
                {group.transactions.map(tx => {
                  const dias_auto = gasto_diario && gasto_diario > 0
                    ? tx.amount / gasto_diario
                    : null
                  const dotColor = tx.category?.color ?? (tx.type === 'expense' ? '#E84434' : '#3A9E6A')

                  return (
                    <button
                      key={tx.id}
                      onClick={() => setSheet({ type: 'tx', tx })}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '0.5px solid #EAF0EC', backgroundColor: 'white', width: '100%', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#141F19', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.notes || tx.category?.name || '—'}
                          </p>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#7A9A8A' }}>{tx.category?.name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500, color: tx.type === 'expense' ? '#E84434' : '#3A9E6A' }}>
                          {tx.type === 'expense' ? '−' : '+'}{fmt(tx.amount, tx.currency)}
                        </p>
                        {dias_auto !== null && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#C69B30', marginTop: '2px' }}>
                            −{fmtAutonomy(dias_auto)}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2 — Presupuestos */}
      {tab === 1 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          {budgets.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7A9A8A' }}>Los presupuestos aparecerán automáticamente al registrar gastos</p>
            </div>
          ) : (
            budgets.filter(b => b.avg_amount && b.avg_amount > 0).map(budget => {
              const spent = budget.spent_this_month ?? 0
              const avg = budget.avg_amount ?? 0
              const pct = budget.pct_of_avg ?? 0
              const barColor = pct > 100 ? '#E84434' : pct > 80 ? '#C69B30' : '#3A9E6A'
              const dotColor = budget.category?.color ?? '#7A9A8A'
              const sparks = weekSpend[budget.category_id] ?? [0, 0, 0, 0]

              return (
                <button
                  key={budget.id}
                  onClick={() => setSheet({ type: 'budget', budget })}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '0.5px solid #EAF0EC', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                      <Sparkline values={sparks} />
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#141F19' }}>{budget.category?.name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: '#141F19' }}>{fmt(spent)}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#7A9A8A' }}>/ prom. {fmt(avg)}</p>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#EAF0EC', borderRadius: '3px', height: '5px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '5px', borderRadius: '3px', backgroundColor: barColor, width: `${Math.min(100, pct)}%` }} />
                    {budget.suggested_amount && budget.suggested_amount !== avg && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (budget.suggested_amount / avg) * 100)}%`, width: '1px', backgroundColor: '#7A9A8A80' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: barColor }}>{pct}% del promedio</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#7A9A8A' }}>
                      {spent > avg ? `+${fmt(spent - avg)} sobre hist.` : `faltan ${fmt(avg - spent)}`}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Tab 3 — Habituales */}
      {tab === 2 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>

          {recurring_templates.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7A9A8A' }}>Sin gastos habituales</p>
            </div>
          ) : (
            recurring_templates.map(template => (
              <button
                key={template.id}
                onClick={() => setSheet({ type: 'recurring', template })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '0.5px solid #EAF0EC', backgroundColor: 'white', width: '100%', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#141F19', marginBottom: '1px' }}>{template.name}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
                    {fmtFrequency(template)} · {template.category?.name}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: template.type === 'expense' ? '#E84434' : '#3A9E6A', marginBottom: '4px' }}>
                    {fmt(template.amount, template.currency)}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <span style={{ padding: '2px 7px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '9px', ...(template.is_pending_this_period ? { backgroundColor: '#7A9A8A20', color: '#7A9A8A', border: '0.5px solid #7A9A8A40' } : { backgroundColor: '#3A9E6A20', color: '#3A9E6A', border: '0.5px solid #3A9E6A40' }) }}>
                      {template.is_pending_this_period ? 'pendiente' : 'activo'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Sheets */}
      {sheet?.type === 'tx' && (
        <TxSheet
          tx={sheet.tx}
          onClose={() => setSheet(null)}
          onEdit={tx => { onEditTransaction(tx) }}
          onDeleted={() => { setSheet(null); onDataChanged() }}
        />
      )}
      {sheet?.type === 'budget' && (
        <BudgetSheet
          budget={sheet.budget}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); onDataChanged() }}
        />
      )}
      {sheet?.type === 'recurring' && (
        <RecurringSheet
          template={sheet.template}
          onClose={() => setSheet(null)}
          onChanged={() => { setSheet(null); onDataChanged() }}
        />
      )}

    </div>
  )
}
