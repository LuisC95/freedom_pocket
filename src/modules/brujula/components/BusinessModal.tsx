'use client'

import { useState, useTransition } from 'react'
import type { Business, BusinessInsert, BusinessModel, BusinessStatus } from '../types'
import { BUSINESS_MODEL_LABELS, BUSINESS_STATUS_LABELS } from '../types'
import { createBusiness, updateBusiness } from '../actions'

interface BusinessModalProps {
  business?: Business
  onClose: () => void
  onSaved: () => void
}

const NUM_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono bg-white'
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'

export function BusinessModal({ business, onClose, onSaved }: BusinessModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name:                  business?.name ?? '',
    business_model:        business?.business_model ?? 'servicio' as BusinessModel,
    status:                business?.status ?? 'active' as BusinessStatus,
    monthly_net_profit:    business?.monthly_net_profit?.toString() ?? '',
    reinvestment_pct:      business?.reinvestment_percentage?.toString() ?? '0',
    sector_multiplier:     business?.sector_multiplier?.toString() ?? '3',
    currency:              business?.currency ?? 'USD',
    started_at:            business?.started_at?.slice(0, 10) ?? '',
    is_passive:            business?.is_passive ?? false,
    include_in_fastlane:   business?.include_in_fastlane ?? true,
  })

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('El nombre es requerido')
    const profit = parseFloat(form.monthly_net_profit)
    if (isNaN(profit)) return setError('La ganancia mensual debe ser un número')
    const reinv = parseFloat(form.reinvestment_pct) || 0
    if (reinv < 0 || reinv > 100) return setError('El porcentaje de reinversión debe ser 0–100')

    const payload: Omit<BusinessInsert, 'user_id'> = {
      name:                   form.name.trim(),
      business_model:         form.business_model,
      status:                 form.status,
      monthly_net_profit:     profit,
      reinvestment_percentage: reinv,
      sector_multiplier:      parseFloat(form.sector_multiplier) || 1,
      currency:               form.currency,
      started_at:             form.started_at || null,
      is_passive:             form.is_passive,
      include_in_fastlane:    form.include_in_fastlane,
      source_idea_id:         null,
    }

    startTransition(async () => {
      const res = business
        ? await updateBusiness({ id: business.id, ...payload })
        : await createBusiness({ ...payload, user_id: '' })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="brujula-modal-card w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {business ? 'Editar negocio' : 'Nuevo negocio'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: App SaaS, Canal YouTube" className={NUM_CLASS} />
          </div>

          {/* Modelo */}
          <div>
            <label className={LABEL_CLASS}>Modelo de negocio</label>
            <div className="brujula-option-grid grid grid-cols-3 gap-1.5">
              {(Object.entries(BUSINESS_MODEL_LABELS) as [BusinessModel, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('business_model', val)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${form.business_model === val ? 'bg-[#2E7D52] text-white border-[#2E7D52]' : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className={LABEL_CLASS}>Estado</label>
            <div className="flex gap-2">
              {(Object.entries(BUSINESS_STATUS_LABELS) as [BusinessStatus, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('status', val)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-colors ${form.status === val ? 'bg-[#2E7D52] text-white border-[#2E7D52]' : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ganancia mensual + moneda */}
          <div>
            <label className={LABEL_CLASS}>Ganancia neta mensual</label>
            <div className="flex gap-2">
              <input type="number" value={form.monthly_net_profit} onChange={e => set('monthly_net_profit', e.target.value)}
                placeholder="0.00" step="0.01" className="flex-1 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] font-mono bg-white" />
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
                {['USD','EUR','MXN','ARS','COP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Reinversión + Multiplicador */}
          <div className="brujula-form-grid grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Reinversión (%)</label>
              <input type="number" value={form.reinvestment_pct} onChange={e => set('reinvestment_pct', e.target.value)}
                placeholder="0" min="0" max="100" step="1" className={NUM_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Multiplicador sector</label>
              <input type="number" value={form.sector_multiplier} onChange={e => set('sector_multiplier', e.target.value)}
                placeholder="3" min="0.1" step="0.5" className={NUM_CLASS} />
            </div>
          </div>
          <div className="bg-[#EAF0EC] rounded-xl px-3.5 py-3">
            <p className="text-[11px] font-medium text-[#2E7D52] mb-1">¿Qué es el multiplicador de sector?</p>
            <p className="text-[10px] text-[#7A9A8A] leading-relaxed">
              Estima cuánto vale tu negocio en relación a su ganancia mensual. Se multiplica por las ganancias para calcular
              tu valoración estimada en la Brújula. Referencia: SaaS ×5–8, Producto físico ×3–4, Servicio ×2–3, Renta ×1.5–2.
            </p>
          </div>

          {/* Inicio */}
          <div>
            <label className={LABEL_CLASS}>Fecha de inicio (opcional)</label>
            <input type="date" value={form.started_at} onChange={e => set('started_at', e.target.value)} className={NUM_CLASS} />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              { key: 'is_passive', label: 'Negocio pasivo', desc: 'Genera ingreso sin tu tiempo activo' },
              { key: 'include_in_fastlane', label: 'Incluir en Fórmula Fastlane', desc: 'Cuenta para el cálculo de libertad financiera' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#141F19]">{item.label}</p>
                  <p className="text-[11px] text-[#7A9A8A]">{item.desc}</p>
                </div>
                <button type="button"
                  onClick={() => set(item.key, !(form as Record<string, unknown>)[item.key] as boolean)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${(form as Record<string, unknown>)[item.key] ? 'bg-[#2E7D52]' : 'bg-[#D0DDD6]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form as Record<string, unknown>)[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="brujula-modal-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Guardando…' : business ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
