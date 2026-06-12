'use client'

// Flujo "poner saldos al día con capturas":
// 1. El usuario sube capturas de su banco / dashboard de tarjeta.
// 2. Gemini detecta cuentas+saldos y sugiere el match contra lo registrado.
// 3. El usuario revisa cada fila (puede corregir el match o excluirla) y aplica.

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import {
  scanAccountBalances,
  applyBalanceSnapshot,
  type BalanceCandidate,
  type DetectedBalance,
  type BalanceApplyResult,
} from '../actions/scan'
import { filesToVisionImages } from '@/lib/client-image'

function fmtMoney(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

interface ReviewRow {
  detected: DetectedBalance
  selectedRef: string // 'asset:<id>' | 'liability:<id>' | '' = no aplicar
}

export function ScanBalancesModal({ onClose, onSaved }: {
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState<'pick' | 'review' | 'done'>('pick')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanWarnings, setScanWarnings] = useState<string[]>([])
  const [candidates, setCandidates] = useState<BalanceCandidate[]>([])
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [result, setResult] = useState<BalanceApplyResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const candidateByRef = new Map(candidates.map(c => [`${c.kind}:${c.id}`, c]))

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setBusy(true)
    try {
      const images = await filesToVisionImages(Array.from(fileList).slice(0, 4))
      const res = await scanAccountBalances(images)
      if (res.error || !res.data) {
        setError(res.error ?? 'No se pudo analizar la captura')
        return
      }
      setCandidates(res.data.candidates)
      setScanWarnings(res.data.warnings)
      setRows(res.data.detected.map(d => ({
        detected: d,
        selectedRef: d.match_kind && d.match_id ? `${d.match_kind}:${d.match_id}` : '',
      })))
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function updateRowRef(index: number, ref: string) {
    setError(null)
    setRows(prev => prev.map((row, i) => i === index ? { ...row, selectedRef: ref } : row))
  }

  function handleApply() {
    const active = rows.filter(r => r.selectedRef)
    if (active.length === 0) return setError('Selecciona al menos una cuenta para actualizar')

    const seen = new Set<string>()
    for (const row of active) {
      if (seen.has(row.selectedRef)) {
        const dup = candidateByRef.get(row.selectedRef)
        return setError(`"${dup?.name ?? 'Una cuenta'}" está asignada a más de un saldo detectado`)
      }
      seen.add(row.selectedRef)
    }

    const updates = active.map(row => {
      const [kind, id] = row.selectedRef.split(':') as ['asset' | 'liability', string]
      return { kind, id, new_balance: row.detected.balance, detected_label: row.detected.label }
    })

    setBusy(true)
    setError(null)
    applyBalanceSnapshot(updates)
      .then(res => {
        if (res.error || !res.data) {
          setError(res.error ?? 'No se pudieron aplicar los cambios')
          return
        }
        setResult(res.data)
        setStep('done')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="brujula-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="brujula-modal-card w-full max-w-md bg-[#1A2520] rounded-2xl shadow-xl border border-white/10 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <p className="text-[15px] font-semibold text-white">Actualizar saldos</p>
            <p className="text-[11px] text-[#7A9A8A] mt-0.5">Con capturas de tu banco o tarjeta</p>
          </div>
          <button onClick={onClose} className="text-[18px] text-[#7A9A8A] leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">

          {/* ── Paso 1: elegir capturas ── */}
          {step === 'pick' && (
            <div className="py-2">
              <p className="text-[12px] text-[#7A9A8A] leading-relaxed mb-4">
                Sube hasta 4 capturas de pantalla de tus cuentas bancarias o del dashboard
                de tu tarjeta de crédito. La IA detecta los saldos y tú confirmas antes de
                aplicar cualquier cambio. Las imágenes no se guardan.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#2E7D52]/60 bg-white/[3%] px-4 py-6 text-[12px] uppercase tracking-widest text-[#3A9E6A] disabled:text-[#7A9A8A]"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {busy ? 'Analizando capturas…' : 'Elegir capturas'}
              </button>
            </div>
          )}

          {/* ── Paso 2: revisar y confirmar ── */}
          {step === 'review' && (
            <div className="space-y-3 py-1">
              {scanWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-[#C69B30]">{w}</p>
              ))}
              {rows.map((row, i) => {
                const selected = row.selectedRef ? candidateByRef.get(row.selectedRef) : null
                const delta = selected ? row.detected.balance - selected.current_balance : null
                const noChange = delta !== null && Math.abs(delta) < 0.005
                const deltaColor = selected && delta !== null && !noChange
                  ? (selected.kind === 'asset'
                    ? (delta > 0 ? '#3A9E6A' : '#E84434')
                    : (delta > 0 ? '#E84434' : '#3A9E6A'))
                  : '#7A9A8A'
                const currencyMismatch = selected && row.detected.currency && selected.currency !== row.detected.currency

                return (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[3%] p-3">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <p className="min-w-0 truncate text-[13px] font-medium text-white">
                        {row.detected.label}
                        {row.detected.last4 && <span className="text-[#7A9A8A]"> ··{row.detected.last4}</span>}
                      </p>
                      <p className="shrink-0 font-mono text-[14px] font-semibold text-white">
                        {fmtMoney(row.detected.balance, row.detected.currency ?? selected?.currency ?? 'USD')}
                      </p>
                    </div>

                    <select
                      value={row.selectedRef}
                      onChange={e => updateRowRef(i, e.target.value)}
                      className="w-full rounded-lg bg-[#0E1512] border border-white/10 px-2.5 py-2 text-[12px] text-white"
                    >
                      <option value="">No aplicar</option>
                      <optgroup label="Cuentas de liquidez">
                        {candidates.filter(c => c.kind === 'asset').map(c => (
                          <option key={c.id} value={`asset:${c.id}`}>{c.name} · {fmtMoney(c.current_balance, c.currency)}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Pasivos / Tarjetas">
                        {candidates.filter(c => c.kind === 'liability').map(c => (
                          <option key={c.id} value={`liability:${c.id}`}>{c.name} · {fmtMoney(c.current_balance, c.currency)}</option>
                        ))}
                      </optgroup>
                    </select>

                    {selected && delta !== null && (
                      <p className="mt-2 text-[11px] font-mono" style={{ color: deltaColor }}>
                        {noChange
                          ? 'Sin cambio'
                          : `${fmtMoney(selected.current_balance, selected.currency)} → ${fmtMoney(row.detected.balance, selected.currency)} (${delta > 0 ? '+' : '−'}${fmtMoney(Math.abs(delta), selected.currency)})`}
                      </p>
                    )}
                    {currencyMismatch && (
                      <p className="mt-1 text-[10px] text-[#C69B30]">
                        Moneda detectada {row.detected.currency} ≠ {selected!.currency} de la cuenta — verifica el match
                      </p>
                    )}
                    {row.detected.warning && (
                      <p className="mt-1 text-[10px] text-[#C69B30]">{row.detected.warning}</p>
                    )}
                    {row.detected.match_confidence === 'low' && row.selectedRef && (
                      <p className="mt-1 text-[10px] text-[#C69B30]">Match con confianza baja — verifica la cuenta</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Paso 3: resultado ── */}
          {step === 'done' && result && (
            <div className="py-4 space-y-2">
              <p className="text-[13px] text-white">
                {result.applied} {result.applied === 1 ? 'saldo actualizado' : 'saldos actualizados'}
                {result.skipped > 0 && ` · ${result.skipped} sin cambio`}
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-[11px] text-[#E84434]">{e}</p>
              ))}
              <p className="text-[11px] text-[#7A9A8A]">
                Los ajustes quedaron registrados en el historial de cada cuenta y tarjeta.
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-[12px] text-[#E84434]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 flex gap-2">
          {step === 'review' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setStep('pick'); setRows([]); setError(null) }}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-[12px] text-[#7A9A8A]"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleApply}
                className="flex-[2] rounded-xl bg-[#2E7D52] py-2.5 text-[12px] font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {busy ? 'Aplicando…' : `Aplicar (${rows.filter(r => r.selectedRef).length})`}
              </button>
            </>
          )}
          {step !== 'review' && (
            <button
              type="button"
              onClick={step === 'done' ? onSaved : onClose}
              className="flex-1 rounded-xl border border-white/15 py-2.5 text-[12px] text-white"
            >
              {step === 'done' ? 'Listo' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
