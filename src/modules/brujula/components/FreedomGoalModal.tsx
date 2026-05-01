'use client'

import { useState, useTransition } from 'react'
import type { FreedomGoal, FreedomGoalInsert } from '../types'
import { createFreedomGoal, updateFreedomGoal } from '../actions'

interface FreedomGoalModalProps {
  goal?: FreedomGoal
  onClose: () => void
  onSaved: () => void
}

const NUM_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono bg-white'
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'

const PRESETS = [
  { label: '1 semana libre', days: 7 },
  { label: '1 mes libre', days: 30 },
  { label: '3 meses libres', days: 90 },
  { label: '6 meses libres', days: 180 },
  { label: '1 año libre', days: 365 },
]

export function FreedomGoalModal({ goal, onClose, onSaved }: FreedomGoalModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    label:       goal?.label ?? '',
    target_days: goal?.target_days?.toString() ?? '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.label.trim()) return setError('El nombre es requerido')
    const days = form.target_days ? parseInt(form.target_days) : null
    if (days !== null && (isNaN(days) || days <= 0)) return setError('Los días deben ser mayores a 0')

    const payload: Omit<FreedomGoalInsert, 'user_id'> = {
      label:               form.label.trim(),
      target_days:         days,
      is_system_suggested: false,
      is_completed:        goal?.is_completed ?? false,
      completed_at:        goal?.completed_at ?? null,
      projected_date:      goal?.projected_date ?? null,
    }

    startTransition(async () => {
      const res = goal
        ? await updateFreedomGoal({ id: goal.id, ...payload })
        : await createFreedomGoal({ ...payload, user_id: '' })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="brujula-modal-card w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {goal ? 'Editar meta' : 'Nueva meta de libertad'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className={LABEL_CLASS}>Nombre de la meta</label>
            <input type="text" value={form.label} onChange={e => set('label', e.target.value)}
              placeholder="Ej: Libertad total, Sabbatical 3 meses" className={NUM_CLASS} />
          </div>

          {/* Presets */}
          <div>
            <label className={LABEL_CLASS}>Presets rápidos</label>
            <div className="brujula-option-grid grid grid-cols-3 gap-1.5">
              {PRESETS.map(p => (
                <button key={p.days} type="button"
                  onClick={() => { set('target_days', p.days.toString()); set('label', form.label || p.label) }}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${
                    form.target_days === p.days.toString()
                      ? 'bg-[#2E7D52] text-white border-[#2E7D52]'
                      : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Días objetivo */}
          <div>
            <label className={LABEL_CLASS}>Días objetivo (opcional)</label>
            <input type="number" value={form.target_days} onChange={e => set('target_days', e.target.value)}
              placeholder="365" min="1" step="1" className={NUM_CLASS} />
            <p className="text-[10px] text-[#7A9A8A] mt-1">
              Días que tu ingreso pasivo puede cubrir tus gastos sin trabajar
            </p>
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="brujula-modal-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Guardando…' : goal ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
