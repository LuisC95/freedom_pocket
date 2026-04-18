'use client'

import { useState, useTransition } from 'react'
import type { Liability, LiabilityInsert, LiabilityType } from '../types'
import { LIABILITY_TYPE_LABELS } from '../types'
import { createLiability, updateLiability } from '../actions'

interface LiabilityModalProps {
  liability?: Liability
  onClose: () => void
  onSaved: () => void
}

const NUM_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono bg-white'
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'

export function LiabilityModal({ liability, onClose, onSaved }: LiabilityModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name:              liability?.name ?? '',
    liability_type:    liability?.liability_type ?? 'personal_loan' as LiabilityType,
    current_balance:   liability?.current_balance?.toString() ?? '',
    currency:          liability?.currency ?? 'USD',
    interest_rate_pct: liability?.interest_rate_pct?.toString() ?? '',
    monthly_payment:   liability?.monthly_payment?.toString() ?? '',
    notes:             liability?.notes ?? '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('El nombre es requerido')
    const balance = parseFloat(form.current_balance)
    if (isNaN(balance) || balance < 0) return setError('El saldo debe ser ≥ 0')

    const payload: Omit<LiabilityInsert, 'user_id'> = {
      name:              form.name.trim(),
      liability_type:    form.liability_type,
      current_balance:   balance,
      currency:          form.currency,
      balance_in_usd:    form.currency === 'USD' ? balance : null,
      interest_rate_pct: form.interest_rate_pct ? parseFloat(form.interest_rate_pct) : null,
      monthly_payment:   form.monthly_payment ? parseFloat(form.monthly_payment) : null,
      is_active:         true,
      is_shared:         false,
      household_id:      null,
      notes:             form.notes.trim() || null,
    }

    startTransition(async () => {
      const res = liability
        ? await updateLiability({ id: liability.id, ...payload })
        : await createLiability({ ...payload, user_id: '' })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {liability ? 'Editar pasivo' : 'Nuevo pasivo'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Hipoteca casa, Tarjeta Visa" className={NUM_CLASS} />
          </div>

          {/* Tipo */}
          <div>
            <label className={LABEL_CLASS}>Tipo</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(LIABILITY_TYPE_LABELS) as [LiabilityType, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('liability_type', val)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${form.liability_type === val ? 'bg-[#E84434] text-white border-[#E84434]' : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#E84434]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Saldo + Moneda */}
          <div>
            <label className={LABEL_CLASS}>Saldo actual</label>
            <div className="flex gap-2">
              <input type="number" value={form.current_balance} onChange={e => set('current_balance', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className="flex-1 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] font-mono bg-white" />
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
                {['USD','EUR','MXN','ARS','COP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Tasa + Pago mensual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Tasa interés (%)</label>
              <input type="number" value={form.interest_rate_pct} onChange={e => set('interest_rate_pct', e.target.value)}
                placeholder="5.0" min="0" step="0.01" className={NUM_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Pago mensual</label>
              <input type="number" value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className={NUM_CLASS} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={LABEL_CLASS}>Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Ej: Banco Chase, vence 2035" className={NUM_CLASS} />
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Guardando…' : liability ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
