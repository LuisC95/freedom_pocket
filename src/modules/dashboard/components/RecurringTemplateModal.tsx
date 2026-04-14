'use client'

import { useState, useTransition } from 'react'
import { createRecurringTemplate, updateRecurringTemplate } from '../actions'
import type { RecurringTemplate, RecurringFrequency, TransactionCategory } from '../types'

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'manual',   label: 'Sin frecuencia fija' },
  { value: 'daily',    label: 'Diario' },
  { value: 'weekly',   label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly',  label: 'Mensual' },
  { value: 'annual',   label: 'Anual' },
  { value: 'custom',   label: 'Personalizado' },
]

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' }, { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

const MONTH_OPTIONS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#0E1512',
  border: '0.5px solid #2E7D5230',
  borderRadius: '8px',
  padding: '10px 12px',
  width: '100%',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: '#F2F7F4',
  outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: '#7A9A8A',
  display: 'block',
  marginBottom: '5px',
}

interface RecurringTemplateModalProps {
  categories: TransactionCategory[]
  template?: RecurringTemplate
  onClose: () => void
  onSaved: () => void
}

export function RecurringTemplateModal({
  categories,
  template,
  onClose,
  onSaved,
}: RecurringTemplateModalProps) {
  const isEdit = !!template
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(template?.name ?? '')
  const [amount, setAmount] = useState(template?.amount?.toString() ?? '')
  const [currency, setCurrency] = useState(template?.currency ?? 'USD')
  const [categoryId, setCategoryId] = useState(template?.category_id ?? '')
  const [frequency, setFrequency] = useState<RecurringFrequency>((template?.frequency as RecurringFrequency) ?? 'manual')
  const [dayOfMonth, setDayOfMonth] = useState(template?.day_of_month?.toString() ?? new Date().getDate().toString())
  const [dayOfWeek, setDayOfWeek] = useState(template?.day_of_month ?? 1)
  const [monthOfYear, setMonthOfYear] = useState(template?.month_of_year ?? new Date().getMonth() + 1)
  const [customDays, setCustomDays] = useState(template?.custom_interval_days?.toString() ?? '30')

  const accentColor = '#2E7D52'
  const accentColorLight = '#2E7D5225'

  const filteredCategories = categories.filter(c => c.applies_to === 'expense' || c.applies_to === 'both')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amt = parseFloat(amount)
    if (!name.trim()) return setError('El nombre es requerido')
    if (isNaN(amt) || amt <= 0) return setError('El monto debe ser mayor a 0')
    if (!categoryId) return setError('Selecciona una categoría')

    const dayRef = (frequency === 'weekly' || frequency === 'biweekly')
      ? dayOfWeek
      : parseInt(dayOfMonth) || new Date().getDate()

    const data = {
      name: name.trim(),
      category_id: categoryId,
      type: 'expense' as const,
      amount: amt,
      currency,
      frequency,
      day_of_month: frequency === 'manual' || frequency === 'daily' ? 1 : dayRef,
      month_of_year: frequency === 'annual' ? monthOfYear : null,
      custom_interval_days: frequency === 'custom' ? (parseInt(customDays) || 30) : null,
    }

    startTransition(async () => {
      if (isEdit) {
        const res = await updateRecurringTemplate(template!.id, data)
        if (res.error) return setError(res.error)
      } else {
        const res = await createRecurringTemplate(data)
        if (res.error) return setError(res.error)
      }
      onSaved()
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px' }}
      className="sm:items-center"
    >
      <div style={{ backgroundColor: '#1A2520', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px', marginBottom: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#F2F7F4' }}>
            {isEdit ? 'Editar gasto habitual' : 'Nuevo gasto habitual'}
          </p>
          <button onClick={onClose} style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: '#7A9A8A', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Nombre */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Dentista, Netflix..."
              style={INPUT_STYLE}
              autoFocus
            />
          </div>

          {/* Monto */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Monto</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                style={{ ...INPUT_STYLE, flex: 1, fontSize: '22px', fontWeight: 600, textAlign: 'center', color: '#E84434' }}
              />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                style={{ ...INPUT_STYLE, width: 'auto', padding: '10px 8px' }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="ARS">ARS</option>
                <option value="COP">COP</option>
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  style={{
                    backgroundColor: categoryId === cat.id ? (cat.color ? `${cat.color}22` : accentColorLight) : '#0E1512',
                    border: `0.5px solid ${categoryId === cat.id ? (cat.color ?? accentColor) : '#2E7D5225'}`,
                    borderRadius: '8px',
                    padding: '8px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: categoryId === cat.id ? (cat.color ?? accentColor) : '#7A9A8A',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.icon && <span style={{ display: 'block', marginBottom: '2px' }}>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Frecuencia */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Frecuencia</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px',
                    fontFamily: 'var(--font-sans)', fontSize: '11px',
                    backgroundColor: frequency === opt.value ? accentColorLight : '#0E1512',
                    border: `0.5px solid ${frequency === opt.value ? accentColor : '#2E7D5230'}`,
                    color: frequency === opt.value ? accentColor : '#7A9A8A',
                    cursor: 'pointer',
                  }}
                >{opt.label}</button>
              ))}
            </div>

            {/* Campo condicional */}
            {(frequency === 'weekly' || frequency === 'biweekly') && (
              <div style={{ marginTop: '8px' }}>
                <label style={LABEL_STYLE}>Día de la semana</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} style={INPUT_STYLE}>
                  {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            )}
            {frequency === 'monthly' && (
              <div style={{ marginTop: '8px' }}>
                <label style={LABEL_STYLE}>Día del mes</label>
                <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" style={{ ...INPUT_STYLE, width: '80px' }} />
              </div>
            )}
            {frequency === 'annual' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <div>
                  <label style={LABEL_STYLE}>Mes</label>
                  <select value={monthOfYear} onChange={e => setMonthOfYear(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 'auto' }}>
                    {MONTH_OPTIONS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Día</label>
                  <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" style={{ ...INPUT_STYLE, width: '70px' }} />
                </div>
              </div>
            )}
            {frequency === 'custom' && (
              <div style={{ marginTop: '8px' }}>
                <label style={LABEL_STYLE}>Cada cuántos días</label>
                <input type="number" value={customDays} onChange={e => setCustomDays(e.target.value)} min="1" style={{ ...INPUT_STYLE, width: '80px' }} />
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: '#E84434', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '10px' }}>{error}</p>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: '0.5px solid #2E7D5240', fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7A9A8A', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: accentColor, border: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'white', cursor: 'pointer', opacity: pending ? 0.7 : 1 }}
            >
              {pending ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
