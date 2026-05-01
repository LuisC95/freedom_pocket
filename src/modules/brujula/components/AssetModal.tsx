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

const FIELD_CLASS = 'w-full px-3 py-2.5 rounded-lg border border-white/10 text-[14px] text-white focus:outline-none focus:border-[#3A9E6A] transition-colors bg-white/[6%]'
const NUM_CLASS = `${FIELD_CLASS} font-mono`
const SELECT_CLASS = `${FIELD_CLASS} appearance-none`
const LABEL_CLASS = 'block text-[11px] uppercase tracking-widest text-[#7A9A8A] mb-1'
type AssetEntryMode = 'bank' | 'cash' | 'other'

export function AssetModal({ asset, onClose, onSaved }: AssetModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initialMode: AssetEntryMode = asset?.liquidity_kind === 'bank'
    ? 'bank'
    : asset?.liquidity_kind === 'cash'
      ? 'cash'
      : 'other'

  const [form, setForm] = useState({
    entry_mode:      initialMode,
    name:            asset?.name ?? '',
    asset_type:      asset?.asset_type ?? (initialMode === 'other' ? 'variable_yield' : 'liquid') as AssetType,
    current_value:   asset?.current_value?.toString() ?? '',
    currency:        asset?.currency ?? 'USD',
    institution:     asset?.institution ?? (initialMode === 'cash' ? 'Cash' : ''),
    liquidity_kind:  asset?.liquidity_kind ?? (initialMode === 'cash' ? 'cash' : 'bank') as 'bank' | 'cash',
    account_ownership: asset?.account_ownership ?? 'regular' as 'regular' | 'joint',
    household_manage_access: asset?.household_manage_access ?? true,
    monthly_yield:   asset?.monthly_yield?.toString() ?? '',
    annual_rate_pct: asset?.annual_rate_pct?.toString() ?? '',
    is_liquid:       asset?.is_liquid ?? initialMode !== 'other',
    notes:           asset?.notes ?? '',
  })

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  function setEntryMode(mode: AssetEntryMode) {
    setForm(prev => ({
      ...prev,
      entry_mode: mode,
      is_liquid: mode === 'other' ? prev.is_liquid : true,
      asset_type: mode === 'other' ? prev.asset_type : 'liquid',
      liquidity_kind: mode === 'cash' ? 'cash' : 'bank',
      institution: mode === 'cash'
        ? 'Cash'
        : mode === 'bank' && prev.institution === 'Cash'
          ? ''
          : prev.institution,
      name: mode === 'cash' && !prev.name.trim() ? 'Cash' : prev.name,
    }))
  }

  function toggleLiquid() {
    setForm(prev => {
      const nextIsLiquid = !prev.is_liquid
      return {
        ...prev,
        is_liquid: nextIsLiquid,
        asset_type: nextIsLiquid ? 'liquid' : prev.asset_type,
        institution: nextIsLiquid && !prev.institution.trim()
          ? (prev.liquidity_kind === 'cash' ? 'Cash' : '')
          : prev.institution,
      }
    })
  }

  function setLiquidityKind(kind: 'bank' | 'cash') {
    setForm(prev => ({
      ...prev,
      liquidity_kind: kind,
      institution: kind === 'cash' && !prev.institution.trim() ? 'Cash' : prev.institution,
    }))
  }

  function setOwnership(value: 'regular' | 'joint') {
    setForm(prev => ({ ...prev, account_ownership: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const isLiquidityAccount = form.entry_mode === 'bank' || form.entry_mode === 'cash' || form.is_liquid
    if (!form.name.trim()) return setError('El nombre es requerido')
    if (isLiquidityAccount && !form.institution.trim()) return setError('La institución es requerida')
    const value = parseFloat(form.current_value)
    if (isNaN(value) || value < 0) return setError('El valor actual debe ser ≥ 0')

    const payload: Omit<AssetInsert, 'user_id'> = {
      name:            form.name.trim(),
      asset_type:      form.asset_type,
      current_value:   value,
      currency:        form.currency,
      institution:     isLiquidityAccount ? form.institution.trim() : null,
      liquidity_kind:  isLiquidityAccount ? form.liquidity_kind : null,
      account_ownership: form.account_ownership,
      household_manage_access: form.household_manage_access,
      value_in_usd:    form.currency === 'USD' ? value : null,
      monthly_yield:   form.monthly_yield ? parseFloat(form.monthly_yield) : null,
      annual_rate_pct: form.annual_rate_pct ? parseFloat(form.annual_rate_pct) : null,
      is_liquid:       isLiquidityAccount,
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
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="brujula-modal-card w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-white/10 bg-[#1A2520]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">
            {asset ? 'Editar activo' : 'Nuevo activo'}
          </h2>
          <button onClick={onClose} className="text-[#7A9A8A] hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de registro */}
          <div>
            <label className={LABEL_CLASS}>Registrar como</label>
            <div className="brujula-option-grid grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-white/[4%] p-1.5">
              {([
                { value: 'bank', label: 'Cuenta de banco', hint: 'saldo líquido' },
                { value: 'cash', label: 'Cash', hint: 'efectivo' },
                { value: 'other', label: 'Otro activo', hint: 'inversión / bien' },
              ] as { value: AssetEntryMode; label: string; hint: string }[]).map(option => {
                const active = form.entry_mode === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEntryMode(option.value)}
                    className="rounded-lg px-2 py-2 text-left transition-colors"
                    style={{
                      background: active ? 'rgba(46,125,82,0.35)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(77,201,138,0.65)' : 'transparent'}`,
                      color: active ? '#F2F7F4' : '#7A9A8A',
                    }}
                  >
                    <span className="block text-[11px] font-medium leading-tight">{option.label}</span>
                    <span className="block text-[9px] opacity-70 leading-tight mt-0.5">{option.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder={form.entry_mode === 'bank' ? 'Ej: Chase Checking' : form.entry_mode === 'cash' ? 'Ej: Cash principal' : 'Ej: S&P 500 ETF'}
              className={NUM_CLASS} />
          </div>

          {/* Tipo */}
          {form.entry_mode === 'other' && (
          <div>
            <label className={LABEL_CLASS}>Tipo de activo</label>
            <div className="brujula-option-grid grid grid-cols-3 gap-1.5">
              {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('asset_type', val)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${form.asset_type === val ? 'bg-[#2E7D52] text-white border-[#2E7D52]' : 'bg-white/[6%] text-[#7A9A8A] border-white/10 hover:border-[#2E7D52]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Valor + Moneda */}
          <div>
            <label className={LABEL_CLASS}>Valor actual</label>
            <div className="flex gap-2">
              <input type="number" value={form.current_value} onChange={e => set('current_value', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className={`flex-1 ${NUM_CLASS}`} />
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className={`${SELECT_CLASS} w-[92px]`}>
                {['USD','EUR','MXN','ARS','COP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Es líquido */}
          {form.entry_mode === 'other' && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[4%] p-3">
            <div>
              <p className="text-[13px] font-medium text-white">Activo líquido</p>
              <p className="text-[11px] text-[#7A9A8A]">Cuenta bancaria o cash con saldo disponible</p>
            </div>
            <button
              type="button"
              onClick={toggleLiquid}
              aria-pressed={form.is_liquid}
              style={{
                width: 46,
                height: 26,
                borderRadius: 999,
                padding: 3,
                border: '1px solid rgba(255,255,255,0.12)',
                background: form.is_liquid ? '#2E7D52' : 'rgba(255,255,255,0.10)',
                position: 'relative',
                transition: 'background 160ms ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: form.is_liquid ? 22 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: '#F2F7F4',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  transition: 'left 160ms ease',
                }}
              />
            </button>
          </div>
          )}

          {/* Configuración de liquidez */}
          {(form.entry_mode !== 'other' || form.is_liquid) && (
            <div className="rounded-xl border border-[#2E7D52]/25 bg-[#2E7D52]/10 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-white">
                    {form.entry_mode === 'cash' ? 'Apartado de cash' : 'Cuenta de banco'}
                  </p>
                  <p className="text-[11px] text-[#7A9A8A]">
                    Este saldo se usa para ingresos, gastos directos y pagos de tarjeta.
                  </p>
                </div>
                <span className="rounded-md border border-[#3A9E6A]/30 bg-[#3A9E6A]/15 px-2 py-1 text-[10px] text-[#4DC98A]">
                  Activo líquido
                </span>
              </div>
              <div className="brujula-form-grid grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Institución</label>
                <input type="text" value={form.institution} onChange={e => set('institution', e.target.value)}
                  placeholder={form.liquidity_kind === 'cash' ? 'Cash' : 'Banco'} className={NUM_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Propiedad</label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[5%] p-1">
                  {([
                    { value: 'regular', label: 'Regular' },
                    { value: 'joint', label: 'Mancomunada' },
                  ] as { value: 'regular' | 'joint'; label: string }[]).map(option => {
                    const active = form.account_ownership === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setOwnership(option.value)}
                        className="rounded-md px-2 py-2 text-[11px] font-medium transition-colors"
                        style={{
                          background: active ? 'rgba(46,125,82,0.35)' : 'transparent',
                          color: active ? '#F2F7F4' : '#7A9A8A',
                        }}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[5%] px-3 py-2 text-[12px] text-white">
                  <span>
                    <span className="block text-[12px] text-white">Household puede manejar</span>
                    <span className="block text-[10px] text-[#7A9A8A]">Si está apagado, otros perfiles solo pueden verla.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.household_manage_access}
                    onChange={e => set('household_manage_access', e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[#2E7D52]"
                  />
                </label>
              </div>
              </div>
            </div>
          )}

          {/* Rendimiento mensual */}
          <div className="brujula-form-grid grid grid-cols-2 gap-3">
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

          {/* Notas */}
          <div>
            <label className={LABEL_CLASS}>Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Ej: Cuenta Vanguard, ticker VOO" className={NUM_CLASS} />
          </div>

          {error && <p className="text-[#E84434] text-[12px]">{error}</p>}

          <div className="brujula-modal-actions flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] font-medium text-[#7A9A8A] hover:text-white transition-colors">
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
