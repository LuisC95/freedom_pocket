'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Observation, ObservationPattern, Streak } from '@/modules/ideas/types'
import { addObservation, deleteObservation } from '@/modules/ideas/actions/observations'
import { convertPatternToIdea } from '@/modules/ideas/actions/patterns'

interface Props {
  observations: Observation[]
  pattern:      ObservationPattern | null
  streak:       Streak
}

export function CazadorPage({ observations: initialObs, pattern, streak }: Props) {
  const router                          = useRouter()
  const [observations, setObservations] = useState(initialObs)
  const [input, setInput]               = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  const handleAdd = () => {
    if (!input.trim() || isPending) return
    const content = input.trim()
    setInput('')
    setError(null)

    startTransition(async () => {
      const result = await addObservation({ content })
      if (result.ok) {
        setObservations(prev => [result.data, ...prev])
        router.refresh()
      } else {
        setError(result.error)
        setInput(content)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteObservation(id)
      if (result.ok) setObservations(prev => prev.filter(o => o.id !== id))
    })
  }

  const handlePatternToIdea = () => {
    if (!pattern) return
    startTransition(async () => {
      const result = await convertPatternToIdea(pattern.id)
      if (result.ok) router.push('/ideas/banco')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        onClick={() => router.push('/ideas')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
      >
        ← Volver
      </button>

      {/* Hero card */}
      <div className="glass-hero p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="fc-label-micro mb-1">Cazador de Problemas</div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 800, lineHeight: 1.2, fontFamily: 'var(--font-sans)' }}>
              Observa.<br />Registra. Acumula.
            </h1>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="glow-gold" style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, color: 'var(--text-gold)', lineHeight: 1 }}>
              {streak.current_count}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>días seguidos</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, marginBottom: 2, fontFamily: 'var(--font-sans)' }}>👂 Misión de hoy</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Registra 1 queja real que escuches en tu entorno</div>
        </div>
      </div>

      {/* Input */}
      <div className="glass p-4">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
          ¿Qué queja escuchaste hoy?
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Escríbela tal como la escuchaste..."
            className="fc-input"
            style={{ padding: '10px 12px', fontSize: 12 }}
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !input.trim()}
            style={{
              background: 'linear-gradient(135deg, #2E7D52 0%, #1A5038 100%)',
              color: '#fff',
              border: '1px solid rgba(77,201,138,0.25)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(46,125,82,0.3)',
              opacity: isPending || !input.trim() ? 0.5 : 1,
            }}
          >
            +
          </button>
        </div>
        {error && <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-red)', fontFamily: 'var(--font-sans)' }}>{error}</p>}
      </div>

      {/* Patrón detectado */}
      {pattern && (
        <div style={{ borderLeft: '3px solid var(--gold)', background: 'var(--gold-dim)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--fc-gold-border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-gold)', marginBottom: 3, fontFamily: 'var(--font-sans)' }}>Patrón detectado por AI</div>
              <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                <strong>{pattern.title}:</strong> {pattern.description}
              </p>
              <button
                onClick={handlePatternToIdea}
                disabled={isPending}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: '1px solid var(--gold)',
                  color: 'var(--text-gold)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                Ver en mis ideas →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {observations.length > 0 && (
        <>
          <div className="fc-label-micro mt-1">Radar · {observations.length} observaciones</div>
          <div className="flex flex-col gap-2">
            {observations.map(o => (
              <div key={o.id} className="glass p-3.5">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>{o.content}</p>
                    {o.category && (
                      <span className="badge badge-accent">{o.category}</span>
                    )}
                  </div>
                  {o.potential_score != null && (
                    <div style={{ textAlign: 'center', minWidth: 42 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: `conic-gradient(#3A9E6A ${o.potential_score}%, rgba(255,255,255,0.07) 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'rgba(8,18,12,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800,
                          color: 'var(--green-bright)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {o.potential_score}
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>potencial</div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(o.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {observations.length === 0 && (
        <div className="fc-empty-state">
          <div style={{ marginBottom: 4, fontSize: 22 }}>👂</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
            Aún no tienes observaciones. Empieza escuchando quejas a tu alrededor.
          </p>
        </div>
      )}
    </div>
  )
}
