'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type {
  Income,
  RealHours,
  MiRealidadData,
  IncomeType,
  IncomeFrequency,
  IncomeConEntries,
} from '../types'
import {
  createIncome,
  updateIncome,
  deleteIncome,
  upsertRealHours,
  checkAndUnlockModule2,
} from '../actions'
import { RegisterPaymentModal } from './RegisterPaymentModal'
import { useRouter } from 'next/navigation'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtHours(h: number) {
  return `${h.toFixed(1)}h`
}

// ─── Income Modal ─────────────────────────────────────────────────────────────

const INCOME_TYPES: { value: IncomeType; label: string }[] = [
  { value: 'fixed', label: 'Fijo' },
  { value: 'hourly', label: 'Por hora' },
  { value: 'commission', label: 'Comisión' },
  { value: 'project', label: 'Por proyecto' },
  { value: 'passive', label: 'Pasivo' },
]

interface IncomeModalProps {
  periodId: string
  income?: Income
  onClose: () => void
  onSaved: () => void
}

function IncomeModal({ periodId, income, onClose, onSaved }: IncomeModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    label: income?.label ?? '',
    amount: income?.amount?.toString() ?? '',
    type: income?.type ?? 'fixed' as IncomeType,
    frequency: income?.frequency ?? 'monthly' as IncomeFrequency,
    currency: income?.currency ?? 'USD',
    effective_from: income?.effective_from?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  })

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const needsAmount = form.type === 'fixed' || form.type === 'hourly'
    const amount = needsAmount ? parseFloat(form.amount) : 1
    if (!form.label.trim()) return setError('El nombre es requerido')
    if (needsAmount && (isNaN(amount) || amount <= 0)) return setError('El monto debe ser mayor a 0')

    startTransition(async () => {
      if (income) {
        const res = await updateIncome({
          id: income.id,
          label: form.label.trim(),
          amount,
          type: form.type,
          frequency: needsAmount ? form.frequency : 'irregular',
          currency: form.currency,
          effective_from: form.effective_from,
        })
        if (res.error) return setError(res.error)
      } else {
        const res = await createIncome({
          period_id: periodId,
          household_id: null,
          contributed_by: '',
          label: form.label.trim(),
          amount,
          type: form.type,
          frequency: needsAmount ? form.frequency : 'irregular',
          currency: form.currency,
          effective_from: form.effective_from,
          effective_to: null,
          updates_retroactively: false,
          user_id: '',
        })
        if (res.error) return setError(res.error)
      }
      await checkAndUnlockModule2()
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {income ? 'Editar ingreso' : 'Nuevo ingreso'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Nombre del ingreso
            </label>
            <input
              type="text"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="Ej: Sueldo, Renta, Freelance"
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] placeholder:text-[#7A9A8A] focus:outline-none focus:border-[#2E7D52] transition-colors"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Tipo</label>
            <div className="flex gap-2">
              {INCOME_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                    form.type === t.value
                      ? 'bg-[#2E7D52] text-white border-[#2E7D52]'
                      : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monto + Moneda — solo para fijo/por hora */}
          {(form.type === 'fixed' || form.type === 'hourly') && (
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                {form.type === 'hourly' ? 'Tarifa por hora' : 'Monto base'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] placeholder:text-[#7A9A8A] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono"
                />
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white transition-colors"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                  <option value="ARS">ARS</option>
                  <option value="COP">COP</option>
                </select>
              </div>
            </div>
          )}

          {/* Periodicidad — solo para fijo/por hora */}
          {(form.type === 'fixed' || form.type === 'hourly') && (
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-2">
                Periodicidad
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: 'weekly',    label: 'Semanal' },
                  { value: 'biweekly', label: 'Quincenal' },
                  { value: 'monthly',  label: 'Mensual' },
                  { value: 'irregular',label: 'Irregular' },
                ] as { value: IncomeFrequency; label: string }[]).map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => set('frequency', f.value)}
                    className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      form.frequency === f.value
                        ? 'bg-[#2E7D52] text-white border-[#2E7D52]'
                        : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha desde */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
              Vigente desde
            </label>
            <input
              type="date"
              value={form.effective_from}
              onChange={e => set('effective_from', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[#E84434] text-[12px]">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-[#2E7D52] hover:bg-[#3A9E6A]" disabled={pending}>
              {pending ? 'Guardando…' : income ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Horas Modal ──────────────────────────────────────────────────────────────

interface HorasModalProps {
  periodId: string
  realHours?: RealHours
  onClose: () => void
  onSaved: () => void
}

const NUM_FIELD_CLASS =
  'w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono'

function HorasModal({ periodId, realHours, onClose, onSaved }: HorasModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    contracted_hours_per_week: realHours?.contracted_hours_per_week?.toString() ?? '',
    extra_hours_per_week: realHours?.extra_hours_per_week?.toString() ?? '0',
    commute_minutes_per_day: realHours?.commute_minutes_per_day?.toString() ?? '0',
    preparation_minutes_per_day: realHours?.preparation_minutes_per_day?.toString() ?? '0',
    mental_load_hours_per_week: realHours?.mental_load_hours_per_week?.toString() ?? '0',
    working_days_per_week: realHours?.working_days_per_week?.toString() ?? '5',
    recovery_start_time: realHours?.recovery_start_time?.slice(0, 5) ?? '22:00',
    arrival_home_time: realHours?.arrival_home_time?.slice(0, 5) ?? '19:00',
  })

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const contracted = parseFloat(form.contracted_hours_per_week)
    if (isNaN(contracted) || contracted <= 0) return setError('Las horas contratadas son requeridas')

    startTransition(async () => {
      const res = await upsertRealHours({
        period_id: periodId,
        user_id: '',
        contracted_hours_per_week: contracted,
        extra_hours_per_week: parseFloat(form.extra_hours_per_week) || 0,
        commute_minutes_per_day: parseFloat(form.commute_minutes_per_day) || 0,
        preparation_minutes_per_day: parseFloat(form.preparation_minutes_per_day) || 0,
        mental_load_hours_per_week: parseFloat(form.mental_load_hours_per_week) || 0,
        working_days_per_week: parseInt(form.working_days_per_week) || 5,
        recovery_start_time: form.recovery_start_time + ':00',
        arrival_home_time: form.arrival_home_time + ':00',
      })
      if (res.error) return setError(res.error)
      await checkAndUnlockModule2()
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {realHours ? 'Editar horas reales' : 'Configurar horas reales'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Horas contratadas / sem
              </label>
              <input type="number" value={form.contracted_hours_per_week} onChange={e => set('contracted_hours_per_week', e.target.value)} min="1" max="168" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Horas extra / sem
              </label>
              <input type="number" value={form.extra_hours_per_week} onChange={e => set('extra_hours_per_week', e.target.value)} min="0" max="80" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Traslado (min/día)
              </label>
              <input type="number" value={form.commute_minutes_per_day} onChange={e => set('commute_minutes_per_day', e.target.value)} min="0" max="300" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Preparación (min/día)
              </label>
              <input type="number" value={form.preparation_minutes_per_day} onChange={e => set('preparation_minutes_per_day', e.target.value)} min="0" max="180" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Carga mental (h/sem)
              </label>
              <input type="number" value={form.mental_load_hours_per_week} onChange={e => set('mental_load_hours_per_week', e.target.value)} min="0" max="40" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Días laborales / sem
              </label>
              <input type="number" value={form.working_days_per_week} onChange={e => set('working_days_per_week', e.target.value)} min="1" max="7" className={NUM_FIELD_CLASS} />
            </div>
          </div>

          <div className="border-t border-[#EAF0EC] pt-3">
            <p className="text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-3">Contexto AI (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#7A9A8A] mb-1">Llegada a casa</label>
                <input type="time" value={form.arrival_home_time} onChange={e => set('arrival_home_time', e.target.value)} className={NUM_FIELD_CLASS} />
              </div>
              <div>
                <label className="block text-[11px] text-[#7A9A8A] mb-1">Hora de descanso</label>
                <input type="time" value={form.recovery_start_time} onChange={e => set('recovery_start_time', e.target.value)} className={NUM_FIELD_CLASS} />
              </div>
            </div>
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-[#2E7D52] hover:bg-[#3A9E6A]" disabled={pending}>
              {pending ? 'Guardando…' : realHours ? 'Guardar' : 'Configurar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

type Modal =
  | { type: 'income_new' }
  | { type: 'income_edit'; income: Income }
  | { type: 'horas' }
  | { type: 'register_payment' }
  | null

interface MiRealidadClientProps {
  data: MiRealidadData
}

export function MiRealidadClient({ data }: MiRealidadClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { periodo_activo, ingresos, real_hours, precio_real_por_hora, estado } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteIncome(id)
    setDeletingId(null)
    router.refresh()
  }

  const incomeTypeBadge: Record<IncomeType, string> = {
    fixed: 'Fijo',
    hourly: 'Por hora',
    commission: 'Comisión',
    project: 'Por proyecto',
    passive: 'Pasivo',
  }

  return (
    <>
      {/* ── Hero Card ── */}
      <div className="bg-[#1A2520] rounded-2xl p-6 mb-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#7A9A8A] mb-1">
          Precio Real por Hora
        </p>
        {precio_real_por_hora ? (
          <>
            <p className="font-mono text-4xl font-bold text-white mb-1">
              {fmt(precio_real_por_hora.precio_por_hora, precio_real_por_hora.currency)}
            </p>
            <p className="text-[12px] text-[#7A9A8A]">
              {fmtHours(precio_real_por_hora.horas_reales_semana)} reales / semana · {fmt(precio_real_por_hora.total_ingresos_mes, precio_real_por_hora.currency)} / mes
            </p>

            {/* Desglose de horas */}
            <div className="grid grid-cols-5 gap-2 mt-4">
              {[
                { label: 'Contratadas', val: precio_real_por_hora.desglose_horas.contratadas },
                { label: 'Extra', val: precio_real_por_hora.desglose_horas.extra },
                { label: 'Traslado', val: precio_real_por_hora.desglose_horas.desplazamiento },
                { label: 'Preparación', val: precio_real_por_hora.desglose_horas.preparacion },
                { label: 'Carga mental', val: precio_real_por_hora.desglose_horas.carga_mental },
              ].map(item => (
                <div key={item.label} className="bg-[#EAF0EC10] rounded-lg p-2 text-center">
                  <p className="font-mono text-[13px] text-white">{fmtHours(item.val)}</p>
                  <p className="text-[9px] text-[#7A9A8A] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-white text-[15px] mb-1">
              {estado === 'sin_datos' && 'Agrega tus ingresos y horas reales'}
              {estado === 'solo_ingresos' && 'Falta configurar tus horas reales'}
              {estado === 'solo_horas' && 'Falta agregar al menos un ingreso'}
            </p>
            <p className="text-[#7A9A8A] text-[12px]">El precio real por hora se calculará automáticamente</p>
          </div>
        )}
      </div>

      {/* ── Ingresos ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#141F19]">Ingresos del período</h2>
          {periodo_activo && (
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: 'income_new' })}
                className="text-[12px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors"
              >
                + Nueva fuente
              </button>
              <button
                onClick={() => setModal({ type: 'register_payment' })}
                className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors"
              >
                + Registrar pago
              </button>
            </div>
          )}
        </div>

        {ingresos.length === 0 ? (
          <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
            <p className="text-[13px] text-[#7A9A8A]">Sin fuentes de ingreso — crea una para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ingresos.map(income => (
              <div key={income.id} className="bg-white border border-[#EAF0EC] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[#141F19]">{income.label}</p>
                      <span className="text-[10px] bg-[#EAF0EC] text-[#7A9A8A] px-2 py-0.5 rounded-full">
                        {incomeTypeBadge[income.type]}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#7A9A8A] mt-0.5">
                      Este mes: <span className="font-mono font-semibold text-[#141F19]">{fmt(income.total_mes_calculado, income.currency)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModal({ type: 'income_edit', income })}
                      className="text-[#7A9A8A] hover:text-[#2E7D52] text-[12px] px-2 py-1 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      disabled={deletingId === income.id}
                      className="text-[#7A9A8A] hover:text-[#E84434] text-[12px] px-2 py-1 rounded transition-colors disabled:opacity-40"
                    >
                      {deletingId === income.id ? '…' : 'Eliminar'}
                    </button>
                  </div>
                </div>
                {income.entries.length > 0 && (
                  <div className="mt-2 border-t border-[#EAF0EC] pt-2 space-y-1">
                    {income.entries.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex justify-between items-center">
                        <span className="text-[11px] text-[#7A9A8A]">
                          {new Date(entry.entry_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          {entry.entry_type === 'deduction' && (
                            <span className="ml-1 text-[#E84434] uppercase tracking-wide">
                              {entry.deduction_category?.replace('_', ' ')}
                            </span>
                          )}
                        </span>
                        <span className={`font-mono text-[12px] font-medium ${entry.entry_type === 'deduction' ? 'text-[#E84434]' : 'text-[#2E7D52]'}`}>
                          {entry.entry_type === 'deduction' ? '−' : '+'}{fmt(entry.amount, entry.currency)}
                        </span>
                      </div>
                    ))}
                    {income.entries.length > 5 && (
                      <p className="text-[10px] text-[#7A9A8A]">+{income.entries.length - 5} más este período</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Horas Reales ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#141F19]">Horas reales de trabajo</h2>
          {periodo_activo && (
            <button
              onClick={() => setModal({ type: 'horas' })}
              className="text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A] transition-colors"
            >
              {real_hours ? 'Editar' : '+ Configurar'}
            </button>
          )}
        </div>

        {real_hours ? (
          <div className="bg-white border border-[#EAF0EC] rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Contratadas', val: `${real_hours.contracted_hours_per_week}h/sem` },
                { label: 'Extra', val: `${real_hours.extra_hours_per_week}h/sem` },
                { label: 'Traslado', val: `${real_hours.commute_minutes_per_day}min/día` },
                { label: 'Preparación', val: `${real_hours.preparation_minutes_per_day}min/día` },
                { label: 'Carga mental', val: `${real_hours.mental_load_hours_per_week}h/sem` },
                { label: 'Días laborales', val: `${real_hours.working_days_per_week} días` },
              ].map(item => (
                <div key={item.label} className="bg-[#EAF0EC] rounded-lg p-2.5">
                  <p className="font-mono text-[13px] font-semibold text-[#141F19]">{item.val}</p>
                  <p className="text-[10px] text-[#7A9A8A] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#EAF0EC] rounded-xl p-4 text-center">
            <p className="text-[13px] text-[#7A9A8A]">Sin horas configuradas</p>
            {periodo_activo && (
              <button
                onClick={() => setModal({ type: 'horas' })}
                className="mt-2 text-[12px] font-medium text-[#2E7D52] hover:text-[#3A9E6A]"
              >
                Configurar horas reales
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Modales ── */}
      {modal?.type === 'income_new' && periodo_activo && (
        <IncomeModal periodId={periodo_activo.id} onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal?.type === 'income_edit' && periodo_activo && (
        <IncomeModal
          periodId={periodo_activo.id}
          income={modal.income}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'horas' && periodo_activo && (
        <HorasModal
          periodId={periodo_activo.id}
          realHours={real_hours ?? undefined}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'register_payment' && (
        <RegisterPaymentModal
          incomes={ingresos}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </>
  )
}
