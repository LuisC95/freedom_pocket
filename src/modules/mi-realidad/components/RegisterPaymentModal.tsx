'use client'

import { useRef, useState, useTransition } from 'react'
import type {
  Income,
  DeductionCategory,
  EntryType,
  PaymentComponent,
} from '../types'
import { registerPayment, scanPaystub } from '../actions'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface EarningRow {
  income_id: string
  amount: string
  hours_worked: string
}

interface DeductionRow {
  category: DeductionCategory
  amount: string
}

// ─── Opciones de categorías ───────────────────────────────────────────────────

const DEDUCTION_LABELS: Record<DeductionCategory, string> = {
  federal_tax:      'Federal Tax',
  state_tax:        'State Tax',
  social_security:  'Social Security',
  medicare:         'Medicare',
  health_insurance: 'Health Insurance',
  dental_insurance: 'Dental Insurance',
  vision_insurance: 'Vision Insurance',
  retirement_401k:  '401(k)',
  other:            'Otro',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RegisterPaymentModalProps {
  incomes: Income[]
  onClose: () => void
  onSaved: () => void
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function RegisterPaymentModal({ incomes, onClose, onSaved }: RegisterPaymentModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pending, startTransition] = useTransition()
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState(today)

  const [earnings, setEarnings] = useState<EarningRow[]>([
    { income_id: incomes[0]?.id ?? '', amount: '', hours_worked: '' },
  ])
  const [deductions, setDeductions] = useState<DeductionRow[]>([])

  // ── Cálculos en tiempo real ────────────────────────────────────────────────
  const gross       = earnings.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const totalDeduct = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
  const net         = gross - totalDeduct

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  // ── Earning helpers ────────────────────────────────────────────────────────
  const addEarning = () =>
    setEarnings(prev => [...prev, { income_id: incomes[0]?.id ?? '', amount: '', hours_worked: '' }])

  const removeEarning = (i: number) =>
    setEarnings(prev => prev.filter((_, idx) => idx !== i))

  const updateEarning = (i: number, field: keyof EarningRow, val: string) =>
    setEarnings(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  // ── Deduction helpers ──────────────────────────────────────────────────────
  const addDeduction = () =>
    setDeductions(prev => [...prev, { category: 'federal_tax', amount: '' }])

  const removeDeduction = (i: number) =>
    setDeductions(prev => prev.filter((_, idx) => idx !== i))

  const updateDeduction = (i: number, field: keyof DeductionRow, val: string) =>
    setDeductions(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))

  // ── Scanner ────────────────────────────────────────────────────────────────
  const getIncome = (id: string) => incomes.find(inc => inc.id === id)
  const isHourly  = (id: string) => getIncome(id)?.type === 'hourly'

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    setError(null)
    try {
      const base64 = await fileToBase64(file)
      const { data, error: scanError } = await scanPaystub(base64, file.type)
      if (scanError || !data) {
        setError('No se pudo leer el paystub. Ingresa los datos manualmente.')
        return
      }
      const parsed = data as {
        pay_period_end?: string
        earnings?: { label: string; amount: number; hours?: number | null }[]
        deductions?: { label: string; amount: number; category: DeductionCategory }[]
      }
      if (parsed.pay_period_end) setEntryDate(parsed.pay_period_end)
      if (parsed.earnings?.length) {
        setEarnings(parsed.earnings.map(item => ({
          income_id: incomes[0]?.id ?? '',
          amount: item.amount?.toString() ?? '',
          hours_worked: item.hours?.toString() ?? '',
        })))
      }
      if (parsed.deductions?.length) {
        setDeductions(parsed.deductions.map(item => ({
          category: item.category,
          amount: item.amount?.toString() ?? '',
        })))
      }
    } finally {
      setIsScanning(false)
      e.target.value = ''
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault()
    setError(null)

    if (earnings.length === 0) return setError('Agrega al menos una ganancia')
    if (earnings.some(row => !row.income_id || parseFloat(row.amount) <= 0 || isNaN(parseFloat(row.amount)))) {
      return setError('Completa todos los campos de ganancias')
    }

    const components: PaymentComponent[] = [
      ...earnings.map(row => ({
        income_id: row.income_id,
        amount: parseFloat(row.amount),
        hours_worked: isHourly(row.income_id) && row.hours_worked ? parseFloat(row.hours_worked) : null,
        entry_type: 'earning' as EntryType,
        deduction_category: null,
        notes: null,
      })),
      ...deductions
        .filter(d => parseFloat(d.amount) > 0)
        .map(d => ({
          income_id: earnings[0].income_id,
          amount: parseFloat(d.amount),
          hours_worked: null,
          entry_type: 'deduction' as EntryType,
          deduction_category: d.category,
          notes: null,
        })),
    ]

    startTransition(async () => {
      const res = await registerPayment({ entry_date: entryDate, components })
      if (res.error) return setError(res.error)
      onSaved()
    })
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '24px',
    }}>
      <div style={{
        background: '#1A2520',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 500, margin: 0 }}>
            Registrar pago
          </h2>
          <button onClick={onClose} style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: '#7A9A8A', fontSize: '14px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

          {incomes.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#7A9A8A', textAlign: 'center', margin: '8px 0' }}>
              Crea una fuente de ingreso primero con &quot;+ Nueva fuente&quot;
            </p>
          ) : (<>

          {/* Fecha */}
          <div>
            <FieldLabel>Fecha del pago</FieldLabel>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Botón scanner + input hidden */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleScan}
            disabled={isScanning}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            style={{
              width: '100%', padding: '10px',
              background: 'rgba(46,125,82,0.15)',
              border: '1px dashed rgba(46,125,82,0.5)',
              borderRadius: '8px',
              color: isScanning ? '#7A9A8A' : '#3A9E6A',
              fontSize: '13px', fontFamily: 'IBM Plex Sans, sans-serif',
              fontWeight: 500, cursor: isScanning ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" stroke="#3A9E6A" strokeWidth="1.5"/>
              <rect x="11" y="1" width="4" height="4" rx="1" stroke="#3A9E6A" strokeWidth="1.5"/>
              <rect x="1" y="11" width="4" height="4" rx="1" stroke="#3A9E6A" strokeWidth="1.5"/>
              <path d="M11 11h4M13 11v4" stroke="#3A9E6A" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 2v3M2 7h3M9 7h5M7 9v5" stroke="#3A9E6A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {isScanning ? 'Analizando paystub...' : 'Escanear paystub'}
          </button>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '11px', color: '#7A9A8A' }}>o ingresa manualmente</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* ── GANANCIAS ─────────────────────────────────────────────────── */}
          <div>
            <SectionTitle>Ganancias</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 24px', gap: '6px', marginBottom: '4px' }}>
              <ColHeader>Fuente</ColHeader>
              <ColHeader align="right">Monto</ColHeader>
              <ColHeader align="center">Horas</ColHeader>
              <span />
            </div>
            {earnings.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 24px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <select
                  value={row.income_id}
                  onChange={e => updateEarning(i, 'income_id', e.target.value)}
                  style={selectStyle}
                >
                  {incomes.map(inc => (
                    <option key={inc.id} value={inc.id} style={{ background: '#1A2520', color: '#fff' }}>{inc.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={row.amount}
                  onChange={e => updateEarning(i, 'amount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{ ...amountInputStyle, textAlign: 'right' }}
                />
                {isHourly(row.income_id) ? (
                  <input
                    type="number"
                    value={row.hours_worked}
                    onChange={e => updateEarning(i, 'hours_worked', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.5"
                    style={{ ...amountInputStyle, textAlign: 'center' }}
                  />
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '10px', color: 'rgba(122,154,138,0.6)' }}>N/A</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeEarning(i)}
                  style={removeBtnStyle}
                >−</button>
              </div>
            ))}
            <button type="button" onClick={addEarning} style={addRowBtnStyle}>+ Agregar ganancia</button>
          </div>

          {/* ── DEDUCCIONES ───────────────────────────────────────────────── */}
          <div>
            <SectionTitle>Deducciones</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 24px', gap: '6px', marginBottom: '4px' }}>
              <ColHeader>Categoría</ColHeader>
              <ColHeader align="right">Monto</ColHeader>
              <span />
            </div>
            {deductions.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 24px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <select
                  value={row.category}
                  onChange={e => updateDeduction(i, 'category', e.target.value as DeductionCategory)}
                  style={selectStyle}
                >
                  {Object.entries(DEDUCTION_LABELS).map(([val, label]) => (
                    <option key={val} value={val} style={{ background: '#1A2520', color: '#fff' }}>{label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={row.amount}
                  onChange={e => updateDeduction(i, 'amount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    ...amountInputStyle,
                    textAlign: 'right',
                    borderColor: 'rgba(232,68,52,0.3)',
                    color: '#E84434',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeDeduction(i)}
                  style={removeBtnStyle}
                >−</button>
              </div>
            ))}
            <button type="button" onClick={addDeduction} style={addRowBtnStyle}>+ Agregar deducción</button>
          </div>

          {/* ── TOTALES ───────────────────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <TotalItem label="Bruto"       value={fmt(gross)}                    color="#fff" />
            <Divider />
            <TotalItem label="Deducciones" value={`− ${fmt(totalDeduct)}`}       color="#E84434" />
            <Divider />
            <TotalItem label="Neto"        value={fmt(net)}                      color="#3A9E6A" />
          </div>

          {error && (
            <p style={{ color: '#E84434', fontSize: '12px', margin: 0 }}>{error}</p>
          )}

          </>)}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#7A9A8A',
              padding: '10px', fontSize: '13px',
              fontFamily: 'IBM Plex Sans, sans-serif', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || isScanning || earnings.length === 0}
            style={{
              background: '#2E7D52', border: 'none',
              borderRadius: '8px', color: '#fff',
              padding: '10px', fontSize: '13px',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontWeight: 500, cursor: 'pointer',
              opacity: (pending || isScanning) ? 0.7 : 1,
            }}
          >
            {pending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes de UI ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 500, color: '#7A9A8A',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: '6px',
    }}>{children}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 500, color: '#7A9A8A',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: '8px',
    }}>{children}</div>
  )
}

function ColHeader({ children, align = 'left' }: { children?: React.ReactNode; align?: string }) {
  return (
    <span style={{
      fontSize: '10px', color: 'rgba(122,154,138,0.6)',
      fontFamily: 'IBM Plex Sans, sans-serif',
      textAlign: align as React.CSSProperties['textAlign'],
      display: 'block',
    }}>{children}</span>
  )
}

function TotalItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <span style={{
        fontSize: '10px', color: '#7A9A8A',
        fontFamily: 'IBM Plex Sans, sans-serif',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 500, color }}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)' }} />
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#fff',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'IBM Plex Sans, sans-serif',
  width: '100%',
  boxSizing: 'border-box',
  appearance: 'none',
}

const amountInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'IBM Plex Mono, monospace',
  width: '100%',
  boxSizing: 'border-box',
}

const removeBtnStyle: React.CSSProperties = {
  width: '24px', height: '24px',
  borderRadius: '6px',
  background: 'rgba(232,68,52,0.1)',
  border: '1px solid rgba(232,68,52,0.2)',
  color: '#E84434',
  fontSize: '14px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

const addRowBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: '#3A9E6A',
  fontSize: '12px', fontFamily: 'IBM Plex Sans, sans-serif',
  cursor: 'pointer', padding: '4px 0',
  display: 'flex', alignItems: 'center', gap: '4px',
}
