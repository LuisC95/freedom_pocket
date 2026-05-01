'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type {
  Income,
  IncomeEntry,
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
  updateIncomeEntry,
  deleteIncomeEntry,
  deleteIncomeEntries,
} from '../actions'
import { RegisterPaymentModal } from './RegisterPaymentModal'
import { IncomeSlider } from './IncomeSlider'
import { useRouter } from 'next/navigation'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function fmtMetric(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
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
              <input type="number" value={form.contracted_hours_per_week} onChange={e => set('contracted_hours_per_week', e.target.value)} min="0.5" max="168" step="0.5" className={NUM_FIELD_CLASS} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">
                Horas extra / sem
              </label>
              <input type="number" value={form.extra_hours_per_week} onChange={e => set('extra_hours_per_week', e.target.value)} min="0" max="80" step="0.5" className={NUM_FIELD_CLASS} />
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
              <input type="number" value={form.mental_load_hours_per_week} onChange={e => set('mental_load_hours_per_week', e.target.value)} min="0" max="40" step="0.5" className={NUM_FIELD_CLASS} />
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
                <label className="block text-[11px] text-[#7A9A8A] mb-1">Hora de desconexión laboral</label>
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

// ─── Entry Edit Modal ─────────────────────────────────────────────────────────

interface EntryEditModalProps {
  entry: IncomeEntry
  isHourly: boolean
  onClose: () => void
  onSaved: () => void
}

function EntryEditModal({ entry, isHourly, onClose, onSaved }: EntryEditModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(entry.amount.toString())
  const [date, setDate] = useState(entry.entry_date.slice(0, 10))
  const [hours, setHours] = useState(entry.hours_worked?.toString() ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return setError('El monto debe ser mayor a 0')
    startTransition(async () => {
      const res = await updateIncomeEntry(entry.id, {
        amount: amt,
        entry_date: date,
        hours_worked: isHourly && hours ? parseFloat(hours) : null,
        notes: notes.trim() || null,
      })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">Editar registro</h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={NUM_FIELD_CLASS} />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Monto</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              min="0" step="0.01" className={NUM_FIELD_CLASS} />
          </div>
          {isHourly && (
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Horas trabajadas</label>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                min="0" step="0.5" className={NUM_FIELD_CLASS} />
            </div>
          )}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1">Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Bono Q1, horas extra" className={NUM_FIELD_CLASS} />
          </div>
          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-[#2E7D52] hover:bg-[#3A9E6A]" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
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
  | { type: 'entry_edit'; entry: IncomeEntry; isHourly: boolean }
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

  const { periodo_activo, ingresos, allEntries, real_hours, precio_real_por_hora, costoRealDeTrabajar, rendimientoDeTuTiempo, liquidity_accounts } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteIncome(id)
    setDeletingId(null)
    if (result.error) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  async function handleDeleteEntry(id: string) {
    setDeletingId(id)
    const result = await deleteIncomeEntry(id)
    setDeletingId(null)
    if (result.error) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  async function handleDeleteBatch(ids: string[]) {
    const result = await deleteIncomeEntries(ids)
    if (result.error) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  // ── Hero derivados ────────────────────────────────────────────────────────
  const heroCurrency = precio_real_por_hora?.currency ?? ingresos[0]?.currency ?? 'USD'
  const desgloseHoras = precio_real_por_hora?.desglose_horas ?? (real_hours ? {
    contratadas:   real_hours.contracted_hours_per_week,
    extra:         real_hours.extra_hours_per_week,
    desplazamiento:(real_hours.commute_minutes_per_day  * real_hours.working_days_per_week * 2) / 60,
    preparacion:   (real_hours.preparation_minutes_per_day * real_hours.working_days_per_week) / 60,
    carga_mental:  real_hours.mental_load_hours_per_week,
  } : null)

  return (
    <>
      {/* ── Hero Card ── */}
      <div className="bg-[#1A2520] rounded-xl px-4 py-4 mb-4 sm:px-[18px]">

        {/* Fila 1 */}
        <div className="grid grid-cols-1 gap-3 border-b border-white/[8%] pb-3 mb-3 sm:grid-cols-[minmax(150px,0.9fr)_minmax(0,2fr)]">

          {/* Columna izquierda — Valor real de tu tiempo (Módulo 2) */}
          <div className="min-w-0 border-b border-white/10 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-[14px]">
            <p className="text-[10px] uppercase tracking-widest text-[#5DCAA5] mb-1.5">
              Valor real de tu tiempo
            </p>
            <p className="font-mono text-[32px] leading-none text-white/20 mb-0.5">
              - -
            </p>
            <p className="text-[10px] text-white/[18%] mb-2">/hr de vida</p>
            <span className="inline-block bg-[#C69B30]/10 border border-[#C69B30]/25 rounded-lg px-[7px] py-[2px] text-[9px] text-[#C69B30] mb-1.5">
              módulo 2
            </span>
            <p className="text-[10px] text-white/[35%]">tu margen real por hora de existencia</p>
          </div>

          {/* Columna derecha — 2 métricas */}
          <div className="min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:pl-[14px]">

            {/* Costo real de trabajar */}
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-[#5DCAA5]/70 mb-1.5">
                Costo real de trabajar
              </p>
              <p className="font-mono text-[clamp(18px,5vw,20px)] leading-none text-white mb-1 break-words">
                {costoRealDeTrabajar !== null
                  ? fmtMetric(costoRealDeTrabajar, heroCurrency)
                  : '- -'}
              </p>
              <p className="text-[10px] text-white/[35%]">tu ingreso dividido entre el tiempo real que inviertes en trabajar</p>
            </div>

            {/* Separador */}
            <div className="hidden w-px bg-white/10 mx-[14px] self-stretch sm:block" />

            {/* Rendimiento de tu tiempo */}
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-[#5DCAA5]/70 mb-1.5">
                Rendimiento de tu tiempo
              </p>
              <p className="font-mono text-[clamp(18px,5vw,20px)] leading-none text-white mb-1 break-words">
                {rendimientoDeTuTiempo !== null
                  ? fmtMetric(rendimientoDeTuTiempo, heroCurrency)
                  : '- -'}
              </p>
              <p className="text-[10px] text-white/[35%]">cuánto genera tu trabajo por cada hora del período, incluyendo descansos</p>
            </div>

          </div>
        </div>

        {/* Fila 2 — Pills de horas */}
        <div className="grid grid-cols-2 gap-[5px] min-[430px]:grid-cols-3 sm:grid-cols-5">
          {([
            { label: 'Contratadas', val: desgloseHoras?.contratadas    ?? 0 },
            { label: 'Extra',       val: desgloseHoras?.extra           ?? 0 },
            { label: 'Traslado',    val: desgloseHoras?.desplazamiento  ?? 0 },
            { label: 'Preparación', val: desgloseHoras?.preparacion     ?? 0 },
            { label: 'Carga mental',val: desgloseHoras?.carga_mental    ?? 0 },
          ] as { label: string; val: number }[]).map(item => (
            <div key={item.label} className="min-w-0 bg-white/[6%] rounded-md px-2 py-[6px] text-center">
              <p className="font-mono text-[13px] font-medium text-white break-words">{fmtHours(item.val)}</p>
              <p className="text-[9px] text-white/[35%]">{item.label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* ── Income Slider ── */}
      <IncomeSlider
        ingresos={ingresos}
        allEntries={allEntries}
        periodId={periodo_activo?.id}
        deletingId={deletingId}
        onNewIncome={() => setModal({ type: 'income_new' })}
        onEditIncome={income => setModal({ type: 'income_edit', income })}
        onDeleteIncome={handleDelete}
        onRegisterPayment={() => setModal({ type: 'register_payment' })}
        onEditEntry={(entry, isHourly) => setModal({ type: 'entry_edit', entry, isHourly })}
        onDeleteEntry={handleDeleteEntry}
        onDeleteBatch={handleDeleteBatch}
      />

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Contratadas', val: `${real_hours.contracted_hours_per_week}h/sem` },
                { label: 'Extra', val: `${real_hours.extra_hours_per_week}h/sem` },
                { label: 'Traslado', val: `${real_hours.commute_minutes_per_day}min/día` },
                { label: 'Preparación', val: `${real_hours.preparation_minutes_per_day}min/día` },
                { label: 'Carga mental', val: `${real_hours.mental_load_hours_per_week}h/sem` },
                { label: 'Días laborales', val: `${real_hours.working_days_per_week} días` },
              ].map(item => (
                <div key={item.label} className="min-w-0 bg-[#EAF0EC] rounded-lg p-2.5">
                  <p className="font-mono text-[13px] font-semibold text-[#141F19] break-words">{item.val}</p>
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
      {modal?.type === 'entry_edit' && (
        <EntryEditModal
          entry={modal.entry}
          isHourly={modal.isHourly}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
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
      {modal?.type === 'register_payment' && periodo_activo && (
        <RegisterPaymentModal
          incomes={ingresos}
          liquidityAccounts={liquidity_accounts}
          periodId={periodo_activo.id}
          onClose={() => setModal(null)}
          onSaved={refresh}
          onIncomeCreated={() => router.refresh()}
        />
      )}
    </>
  )
}
