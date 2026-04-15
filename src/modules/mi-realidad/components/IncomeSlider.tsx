'use client'

import { useState, useRef } from 'react'
import type { Income, IncomeConEntries, IncomeEntry, IncomeType } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtMoney(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

const INCOME_TYPE_BADGE: Record<IncomeType, string> = {
  fixed:      'Fijo',
  hourly:     'Por hora',
  commission: 'Comisión',
  project:    'Por proyecto',
  passive:    'Pasivo',
}

// ─── Group types ──────────────────────────────────────────────────────────────

interface PaymentGroup {
  key:             string
  date:            string
  registeredAt:    string   // created_at del primer entry del batch
  entries:         IncomeEntry[]
  groupName:       string
  totalEarnings:   number
  totalDeductions: number
  net:             number
  currency:        string
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncomeSliderProps {
  ingresos:          IncomeConEntries[]
  allEntries:        IncomeEntry[]
  periodId?:         string
  deletingId:        string | null
  onNewIncome:       () => void
  onEditIncome:      (income: Income) => void
  onDeleteIncome:    (id: string) => void
  onRegisterPayment: () => void
  onEditEntry:       (entry: IncomeEntry, isHourly: boolean) => void
  onDeleteEntry:     (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IncomeSlider({
  ingresos,
  allEntries,
  periodId,
  deletingId,
  onNewIncome,
  onEditIncome,
  onDeleteIncome,
  onRegisterPayment,
  onEditEntry,
  onDeleteEntry,
}: IncomeSliderProps) {
  const [activePanel, setActivePanel]       = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const touchStartX                         = useRef<number | null>(null)

  // Map income_id → type for isHourly check
  const incomeTypeMap = new Map<string, IncomeType>(ingresos.map(i => [i.id, i.type]))

  // Build payment groups — one group per registerPayment() call (batch_id)
  // fallback: group by minute of created_at for entries without batch_id
  const groupMap = new Map<string, {
    entries:      IncomeEntry[]
    date:         string
    registeredAt: string
    currency:     string
    incomeNames:  Set<string>
  }>()

  for (const entry of allEntries) {
    const key = entry.batch_id ?? entry.created_at.slice(0, 16)
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        entries:      [],
        date:         entry.entry_date,
        registeredAt: entry.created_at,
        currency:     entry.currency,
        incomeNames:  new Set(),
      })
    }
    const g = groupMap.get(key)!
    g.entries.push(entry)
    g.incomeNames.add(entry.incomeName)
  }

  const groups: PaymentGroup[] = Array.from(groupMap.entries())
    .map(([key, { entries, date, registeredAt, currency, incomeNames }]) => {
      const totalEarnings   = entries.filter(e => e.entry_type === 'earning').reduce((s, e) => s + e.amount, 0)
      const totalDeductions = entries.filter(e => e.entry_type === 'deduction').reduce((s, e) => s + e.amount, 0)
      return {
        key,
        date,
        registeredAt,
        entries,
        groupName: [...incomeNames].join(' + '),
        totalEarnings,
        totalDeductions,
        net: totalEarnings - totalDeductions,
        currency,
      }
    })
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Touch swipe ───────────────────────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0 && activePanel === 0) setActivePanel(1)
      if (dx > 0 && activePanel === 1) setActivePanel(0)
    }
    touchStartX.current = null
  }

  // ── Panel 0: Grouped payment entries ──────────────────────────────────────

  const entriesPanel = (
    <div className="shrink-0 w-full">
      {groups.length === 0 ? (
        <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
          <p className="text-[13px] text-[#7A9A8A]">Sin registros de pago aún</p>
          {periodId && (
            <button
              onClick={onRegisterPayment}
              className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]"
            >
              Registrar primer pago
            </button>
          )}
        </div>
      ) : (
        <div>
          {groups.map(group => {
            const isExpanded = !!expandedGroups[group.key]
            return (
              <div key={group.key} className="border-[0.5px] border-[#D0DDD6] rounded-xl mb-2 overflow-hidden bg-white">

                {/* Header — clickeable */}
                <button
                  className="w-full flex items-center px-[14px] py-[11px] gap-[10px] text-left hover:bg-[#FAFCFB] transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  {/* Fecha de pago + momento de registro */}
                  <div className="min-w-0">
                    <p className="font-medium text-[13px] text-[#141F19] truncate">
                      {fmtDate(group.date)}
                      <span className="font-normal text-[#7A9A8A]"> · {fmtTime(group.registeredAt)}</span>
                    </p>
                    <p className="text-[11px] text-[#7A9A8A] truncate">{group.groupName}</p>
                  </div>

                  {/* Summary: earn | div | ded | div | net */}
                  <div className="flex items-center gap-[10px] ml-auto shrink-0">
                    <span className="font-mono text-[12px] text-[#2E7D52]">
                      +{fmtMoney(group.totalEarnings, group.currency)}
                    </span>

                    <div className="w-px h-3 bg-[#D0DDD6]" />

                    {group.totalDeductions > 0 ? (
                      <span className="font-mono text-[12px] text-[#E24B4A]">
                        -{fmtMoney(group.totalDeductions, group.currency)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#7A9A8A]">—</span>
                    )}

                    <div className="w-px h-3 bg-[#D0DDD6]" />

                    <span className="font-mono text-[13px] font-medium text-[#141F19] min-w-[70px] text-right">
                      {fmtMoney(group.net, group.currency)}
                    </span>
                  </div>

                  {/* Chevron */}
                  <span
                    className="text-[11px] text-[#7A9A8A] shrink-0 transition-transform duration-200"
                    style={{ display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▼
                  </span>
                </button>

                {/* Detalle expandible */}
                {isExpanded && (
                  <div className="border-t-[0.5px] border-[#D0DDD6]">
                    {group.entries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`flex items-center px-[14px] pl-6 py-2 gap-2 ${
                          idx < group.entries.length - 1 ? 'border-b-[0.5px] border-[#D0DDD6]' : ''
                        }`}
                      >
                        <span className="text-[12px] text-[#7A9A8A] flex-1 truncate">{entry.incomeName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          entry.entry_type === 'earning'
                            ? 'bg-[#EAF3DE] text-[#3B6D11]'
                            : 'bg-[#FCEBEB] text-[#A32D2D]'
                        }`}>
                          {entry.entry_type === 'earning' ? 'ganancia' : 'deducción'}
                        </span>
                        <span className={`font-mono text-[12px] font-medium shrink-0 ${
                          entry.entry_type === 'earning' ? 'text-[#2E7D52]' : 'text-[#E24B4A]'
                        }`}>
                          {entry.entry_type === 'earning' ? '+' : '-'}
                          {fmtMoney(entry.amount, entry.currency)}
                        </span>
                        <button
                          onClick={() => onEditEntry(entry, incomeTypeMap.get(entry.income_id) === 'hourly')}
                          className="text-[10px] text-[#7A9A8A] hover:text-[#2E7D52] transition-colors shrink-0"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                          className="text-[10px] text-[#7A9A8A] hover:text-[#E84434] transition-colors shrink-0 disabled:opacity-40"
                        >
                          {deletingId === entry.id ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Panel 1: Income sources ────────────────────────────────────────────────

  const incomesPanel = (
    <div className="shrink-0 w-full">
      {ingresos.length === 0 ? (
        <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
          <p className="text-[13px] text-[#7A9A8A]">Sin fuentes de ingreso — crea una para comenzar</p>
          {periodId && (
            <button
              onClick={onNewIncome}
              className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]"
            >
              + Nueva fuente
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {ingresos.map(income => (
            <div key={income.id} className="bg-white border border-[#EAF0EC] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[#141F19] truncate">{income.label}</p>
                    <span className="text-[10px] bg-[#EAF0EC] text-[#7A9A8A] px-2 py-0.5 rounded-full shrink-0">
                      {INCOME_TYPE_BADGE[income.type]}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#7A9A8A] mt-0.5">
                    Este mes:{' '}
                    <span className="font-mono font-semibold text-[#141F19]">
                      {fmt(income.total_mes_calculado, income.currency)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEditIncome(income)}
                    className="text-[#7A9A8A] hover:text-[#2E7D52] text-[12px] px-2 py-1 rounded transition-colors"
                  >
                    Configurar
                  </button>
                  <button
                    onClick={() => onDeleteIncome(income.id)}
                    disabled={deletingId === income.id}
                    className="text-[#7A9A8A] hover:text-[#E84434] text-[12px] px-2 py-1 rounded transition-colors disabled:opacity-40"
                  >
                    {deletingId === income.id ? '…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-[#141F19]">
          {activePanel === 0 ? 'Registros de pago' : 'Fuentes de ingreso'}
        </h2>
        {periodId && (
          activePanel === 0 ? (
            <button
              onClick={onRegisterPayment}
              className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors"
            >
              + Registrar pago
            </button>
          ) : (
            <button
              onClick={onNewIncome}
              className="text-[12px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors"
            >
              + Nueva fuente
            </button>
          )
        )}
      </div>

      {/* Slide track */}
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activePanel * 100}%)` }}
        >
          {entriesPanel}
          {incomesPanel}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {(['Pagos', 'Fuentes'] as const).map((label, i) => (
          <button
            key={i}
            onClick={() => setActivePanel(i)}
            className="flex items-center gap-1.5 group"
          >
            <span
              className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                activePanel === i ? 'bg-[#2E7D52]' : 'bg-[#D0DDD6] group-hover:bg-[#7A9A8A]'
              }`}
            />
            <span
              className={`text-[10px] transition-colors ${
                activePanel === i ? 'text-[#2E7D52] font-medium' : 'text-[#7A9A8A] group-hover:text-[#141F19]'
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
