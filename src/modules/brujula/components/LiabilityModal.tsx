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

const NUM_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-white/10 text-[14px] text-white focus:outline-none focus:border-[#3A9E6A] transition-colors font-mono bg-white/[6%]'
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'

export function LiabilityModal({ liability, onClose, onSaved }: LiabilityModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name:              liability?.name ?? '',
    liability_type:    liability?.liability_type ?? 'personal_loan' as LiabilityType,
    current_balance:   liability?.current_balance?.toString() ?? '',
    currency:          liability?.currency ?? 'USD',
    credit_limit:      liability?.credit_limit?.toString() ?? '',
    interest_rate_pct: liability?.interest_rate_pct?.toString() ?? '',
    monthly_payment:   liability?.monthly_payment?.toString() ?? '',
    notes:             liability?.notes ?? '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isCreditCard = form.liability_type === 'credit_card'
  const balance = parseFloat(form.current_balance)
  const creditLimit = parseFloat(form.credit_limit)
  const hasCreditLimit = isCreditCard && form.credit_limit !== '' && !isNaN(creditLimit) && creditLimit > 0
  const utilizationPct = hasCreditLimit && !isNaN(balance)
    ? Math.min((balance / creditLimit) * 100, 999)
    : 0
  const availableCredit = hasCreditLimit && !isNaN(balance)
    ? Math.max(creditLimit - balance, 0)
    : 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('El nombre es requerido')
    if (isNaN(balance) || balance < 0) return setError('El saldo debe ser ≥ 0')
    if (isCreditCard && form.credit_limit) {
      if (isNaN(creditLimit) || creditLimit < 0) return setError('El límite debe ser ≥ 0')
    }

    const payload: Omit<LiabilityInsert, 'user_id'> = {
      name:              form.name.trim(),
      liability_type:    form.liability_type,
      current_balance:   balance,
      currency:          form.currency,
      balance_in_usd:    form.currency === 'USD' ? balance : null,
      credit_limit:      isCreditCard && form.credit_limit ? creditLimit : null,
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
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="brujula-modal-card w-full max-w-md bg-[#1A2520] rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">
            {liability ? 'Editar pasivo' : 'Nuevo pasivo'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-white transition-colors text-xl leading-none">×</button>
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
            <div className="brujula-option-grid grid grid-cols-3 gap-1.5">
              {(Object.entries(LIABILITY_TYPE_LABELS) as [LiabilityType, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('liability_type', val)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${form.liability_type === val ? 'bg-[#E84434] text-white border-[#E84434]' : 'bg-white/[6%] text-[#7A9A8A] border-white/10 hover:border-[#E84434]'}`}>
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
                placeholder="0.00" min="0" step="0.01" className={`flex-1 ${NUM_CLASS}`} />
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-white/10 text-[14px] text-white focus:outline-none focus:border-[#3A9E6A] bg-white/[6%]">
                {['USD','EUR','MXN','ARS','COP'].map(c => <option key={c} className="bg-[#1A2520]">{c}</option>)}
              </select>
            </div>
          </div>

          {isCreditCard && (
            <div className="rounded-xl border border-white/10 bg-white/[4%] p-3">
              <label className={LABEL_CLASS}>Límite de crédito</label>
              <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)}
                placeholder="Ej: 5000.00" min="0" step="0.01" className={NUM_CLASS} />
              {hasCreditLimit && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[11px] text-[#7A9A8A]">Uso actual del límite</span>
                    <span className="font-mono text-[12px] font-semibold text-[#E84434]">{utilizationPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E84434] transition-all"
                      style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#7A9A8A] mt-1.5">
                    Disponible: {availableCredit.toLocaleString('en-US', { style: 'currency', currency: form.currency, minimumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tasa + Pago mensual */}
          <div className="brujula-form-grid grid grid-cols-2 gap-3">
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

          <div className="brujula-modal-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-white transition-colors">
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
