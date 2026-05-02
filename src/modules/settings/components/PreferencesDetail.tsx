'use client'

import { useState, useTransition } from 'react'
import { updateSettings } from '../actions'
import type { SettingsPreferences } from '../types'

interface Props {
  preferences: SettingsPreferences
  onBack: () => void
}

const CURRENCIES = ['USD', 'COP', 'EUR', 'MXN']
const TIMEZONES = [
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
]
const PAYMENT_SOURCES = [
  { value: 'cash_debit', label: 'Efectivo / Débito' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
]

export function PreferencesDetail({ preferences, onBack }: Props) {
  const [currency, setCurrency] = useState(preferences.base_currency)
  const [timezone, setTimezone] = useState(preferences.timezone)
  const [workingDays, setWorkingDays] = useState(String(preferences.working_days_per_week))
  const [paymentSource, setPaymentSource] = useState(preferences.default_payment_source)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    const fd = new FormData()
    fd.set('base_currency', currency)
    fd.set('timezone', timezone)
    fd.set('working_days_per_week', workingDays)
    fd.set('default_payment_source', paymentSource)

    startTransition(async () => {
      await updateSettings(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <>
      <div className="detail-header-fc">
        <button className="back-btn-fc" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Atrás
        </button>
        <span className="detail-title-fc">Preferencias</span>
      </div>

      <div className="detail-body-fc">
        <div className="form-group-fc">
          <label className="fc-label-micro">Moneda base</label>
          <select className="fc-input settings-select" value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group-fc">
          <label className="fc-label-micro">Zona horaria</label>
          <select className="fc-input settings-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
            {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group-fc">
          <label className="fc-label-micro">Días laborales por semana</label>
          <select className="fc-input settings-select" value={workingDays} onChange={e => setWorkingDays(e.target.value)}>
            {[4, 5, 6, 7].map(d => <option key={d} value={d}>{d} días</option>)}
          </select>
        </div>

        <div className="form-group-fc">
          <label className="fc-label-micro">Método de pago por defecto</label>
          <select className="fc-input settings-select" value={paymentSource} onChange={e => setPaymentSource(e.target.value)}>
            {PAYMENT_SOURCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <button
          className="fc-btn-primary"
          style={{ width: '100%', marginTop: 24 }}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {saved ? 'Guardado ✓' : isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </>
  )
}
