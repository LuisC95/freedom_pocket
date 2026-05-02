'use client'

import { useState, useTransition } from 'react'
import { updateHousehold } from '../actions'
import type { SettingsHousehold, HouseholdMember } from '../types'

interface Props {
  household: SettingsHousehold
  members: HouseholdMember[]
  currentUserRole: 'owner' | 'member'
  onBack: () => void
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

interface ToggleProps {
  on: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}

function Toggle({ on, disabled, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? 'var(--fc-accent)' : 'rgba(255,255,255,0.12)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 2,
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        transition: 'transform 0.2s',
        transform: on ? 'translateX(18px)' : 'translateX(0)',
      }} />
    </button>
  )
}

export function HouseholdDetail({ household, members, currentUserRole, onBack }: Props) {
  const isOwner = currentUserRole === 'owner'
  const [name, setName] = useState(household.name)
  const [sharedIncomes, setSharedIncomes] = useState(household.shared_incomes)
  const [sharedExpenses, setSharedExpenses] = useState(household.shared_expenses)
  const [proportionalSplit, setProportionalSplit] = useState(household.proportional_split)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    const fd = new FormData()
    fd.set('household_id', household.id)
    fd.set('name', name)
    fd.set('shared_incomes', String(sharedIncomes))
    fd.set('shared_expenses', String(sharedExpenses))
    fd.set('proportional_split', String(proportionalSplit))

    startTransition(async () => {
      await updateHousehold(fd)
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
        <span className="detail-title-fc">Hogar</span>
      </div>

      <div className="detail-body-fc">
        {!isOwner && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'rgba(198,155,48,0.1)',
            border: '1px solid rgba(198,155,48,0.2)',
            borderRadius: 10,
            fontSize: 12, color: 'var(--text-gold)',
          }}>
            Solo el propietario puede modificar estas opciones
          </div>
        )}

        <div className="form-group-fc">
          <label className="fc-label-micro">Nombre del hogar</label>
          <input
            className="fc-input"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isOwner}
            placeholder="Mi hogar"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <p className="fc-label-micro" style={{ marginBottom: 10 }}>Miembros</p>
          {members.map(m => (
            <div key={m.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14,
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: m.role === 'owner'
                  ? 'linear-gradient(135deg, var(--fc-accent) 0%, #1F6B3E 100%)'
                  : 'linear-gradient(135deg, var(--gold) 0%, #8B6820 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600, color: 'white',
              }}>
                {getInitials(m.display_name)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {m.display_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {m.role === 'owner' ? 'Propietario' : 'Miembro'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: '0 14px', marginBottom: 8 }}>
          {[
            { key: 'incomes', label: 'Ingresos compartidos', desc: 'Ver los ingresos de todos los miembros', val: sharedIncomes, setter: setSharedIncomes },
            { key: 'expenses', label: 'Gastos compartidos', desc: 'Ver los gastos de todos los miembros', val: sharedExpenses, setter: setSharedExpenses },
            { key: 'split', label: 'División proporcional', desc: 'Dividir gastos según ingresos de cada miembro', val: proportionalSplit, setter: setProportionalSplit },
          ].map((item, i, arr) => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <Toggle on={item.val} disabled={!isOwner} onChange={item.setter} />
            </div>
          ))}
        </div>

        {isOwner && (
          <button
            className="fc-btn-primary"
            style={{ width: '100%', marginTop: 24 }}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {saved ? 'Guardado ✓' : isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </>
  )
}
