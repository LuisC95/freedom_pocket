'use client'

import { useState, useTransition } from 'react'
import type { Asset, AssetInsert, AssetType } from '../types'
import { ASSET_TYPE_LABELS } from '../types'
import { createAsset, updateAsset } from '../actions'

interface AssetModalProps {
  asset?: Asset
  onClose: () => void
  onSaved: () => void
}

const NUM_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] transition-colors font-mono bg-white'
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'

export function AssetModal({ asset, onClose, onSaved }: AssetModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name:            asset?.name ?? '',
    asset_type:      asset?.asset_type ?? 'variable_yield' as AssetType,
    current_value:   asset?.current_value?.toString() ?? '',
    currency:        asset?.currency ?? 'USD',
    monthly_yield:   asset?.monthly_yield?.toString() ?? '',
    annual_rate_pct: asset?.annual_rate_pct?.toString() ?? '',
    is_liquid:       asset?.is_liquid ?? false,
    notes:           asset?.notes ?? '',
  })

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('El nombre es requerido')
    const value = parseFloat(form.current_value)
    if (isNaN(value) || value < 0) return setError('El valor actual debe ser ≥ 0')

    const payload: Omit<AssetInsert, 'user_id'> = {
      name:            form.name.trim(),
      asset_type:      form.asset_type,
      current_value:   value,
      currency:        form.currency,
      value_in_usd:    form.currency === 'USD' ? value : null,
      monthly_yield:   form.monthly_yield ? parseFloat(form.monthly_yield) : null,
      annual_rate_pct: form.annual_rate_pct ? parseFloat(form.annual_rate_pct) : null,
      is_liquid:       form.is_liquid,
      is_active:       true,
      is_shared:       false,
      household_id:    null,
      ticker_symbol:   null,
      quantity:        null,
      notes:           form.notes.trim() || null,
    }

    startTransition(async () => {
      const res = asset
        ? await updateAsset({ id: asset.id, ...payload })
        : await createAsset({ ...payload, user_id: '' })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#141F19]">
            {asset ? 'Editar activo' : 'Nuevo activo'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-[#141F19] transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: S&P 500 ETF, Renta departamento" className={NUM_CLASS} />
          </div>

          {/* Tipo */}
          <div>
            <label className={LABEL_CLASS}>Tipo de activo</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('asset_type', val)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${form.asset_type === val ? 'bg-[#2E7D52] text-white border-[#2E7D52]' : 'bg-[#EAF0EC] text-[#7A9A8A] border-transparent hover:border-[#2E7D52]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor + Moneda */}
          <div>
            <label className={LABEL_CLASS}>Valor actual</label>
            <div className="flex gap-2">
              <input type="number" value={form.current_value} onChange={e => set('current_value', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className="flex-1 px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] font-mono bg-white" />
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-[#D0DDD6] text-[14px] text-[#141F19] focus:outline-none focus:border-[#2E7D52] bg-white">
                {['USD','EUR','MXN','ARS','COP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Rendimiento mensual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Yield mensual ($)</label>
              <input type="number" value={form.monthly_yield} onChange={e => set('monthly_yield', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className={NUM_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Tasa anual (%)</label>
              <input type="number" value={form.annual_rate_pct} onChange={e => set('annual_rate_pct', e.target.value)}
                placeholder="7.0" min="0" step="0.1" className={NUM_CLASS} />
            </div>
          </div>

          {/* Es líquido */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#141F19]">Activo líquido</p>
              <p className="text-[11px] text-[#7A9A8A]">Se puede convertir a efectivo rápidamente</p>
            </div>
            <button type="button" onClick={() => set('is_liquid', !form.is_liquid)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.is_liquid ? 'bg-[#2E7D52]' : 'bg-[#D0DDD6]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_liquid ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Notas */}
          <div>
            <label className={LABEL_CLASS}>Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Ej: Cuenta Vanguard, ticker VOO" className={NUM_CLASS} />
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-[#D0DDD6] text-[13px] font-medium text-[#7A9A8A] hover:text-[#141F19] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-[#2E7D52] text-white text-[13px] font-medium hover:bg-[#3A9E6A] transition-colors disabled:opacity-60">
              {pending ? 'Guardando…' : asset ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
