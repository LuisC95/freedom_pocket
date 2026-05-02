'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '../actions'
import type { SettingsProfile } from '../types'

interface Props {
  profile: SettingsProfile
  onBack: () => void
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function ProfileDetail({ profile, onBack }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [occupation, setOccupation] = useState(profile.occupation ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    const fd = new FormData()
    fd.set('display_name', displayName)
    fd.set('occupation', occupation)

    startTransition(async () => {
      await updateProfile(fd)
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
        <span className="detail-title-fc">Perfil</span>
      </div>

      <div className="detail-body-fc">
        <div className="avatar-editor-fc">
          <div className="avatar-large-fc">
            {getInitials(profile.display_name)}
          </div>
          <button className="fc-btn-ghost" style={{ fontSize: 12 }}>Cambiar foto</button>
        </div>

        <div className="form-group-fc">
          <label className="fc-label-micro">Nombre</label>
          <input
            className="fc-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="form-group-fc">
          <label className="fc-label-micro">Ocupación</label>
          <input
            className="fc-input"
            value={occupation}
            onChange={e => setOccupation(e.target.value)}
            placeholder="Ej: CEO, Desarrollador..."
          />
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
