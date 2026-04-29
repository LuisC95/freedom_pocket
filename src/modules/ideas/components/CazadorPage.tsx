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

const TAG_COLORS: Record<string, string> = {
  trabajo:   '#6366f1',
  hogar:     '#2E7D52',
  finanzas:  '#C69B30',
  salud:     '#E84434',
  educacion: '#3A9E6A',
}

function tagColor(tag: string | null): string {
  return TAG_COLORS[tag ?? ''] ?? '#7A9A8A'
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
        className="flex items-center gap-1 pb-2 text-[13px] text-[#7A9A8A]"
      >
        ← Volver
      </button>

      {/* Hero card */}
      <div className="rounded-2xl bg-[#1A2520] p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#7A9A8A]">
              Cazador de Problemas
            </div>
            <h1 className="text-[20px] font-black leading-tight text-white">
              Observa.<br />Registra. Acumula.
            </h1>
          </div>
          <div className="text-center">
            <div className="font-mono text-[30px] font-black text-[#C69B30]">
              {streak.current_count}
            </div>
            <div className="text-[10px] font-semibold text-[#7A9A8A]">días seguidos</div>
          </div>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2.5">
          <div className="mb-0.5 text-[12px] font-semibold text-white">👂 Misión de hoy</div>
          <div className="text-[12px] text-[#7A9A8A]">Registra 1 queja real que escuches en tu entorno</div>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-2xl border border-[#e0ebe4] bg-white px-4 py-3.5">
        <div className="mb-2.5 text-[13px] font-semibold text-[#141F19]">¿Qué queja escuchaste hoy?</div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Escríbela tal como la escuchaste..."
            className="flex-1 rounded-xl border border-[#e0ebe4] bg-[#F2F7F4] px-3 py-2.5 text-[12px] text-[#141F19] outline-none placeholder:text-[#7A9A8A]"
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !input.trim()}
            className="rounded-xl bg-[#2E7D52] px-4 py-2.5 text-lg font-bold text-white disabled:opacity-50"
          >
            +
          </button>
        </div>
        {error && <p className="mt-2 text-[11px] text-[#E84434]">{error}</p>}
      </div>

      {/* Patrón detectado */}
      {pattern && (
        <div className="rounded-2xl border border-[#C69B30]/30 bg-[#C69B30]/08 px-3.5 py-3" style={{ borderLeft: '3px solid #C69B30', background: '#C69B3008' }}>
          <div className="flex gap-2">
            <span className="text-sm">✨</span>
            <div>
              <div className="mb-1 text-[12px] font-bold text-[#C69B30]">Patrón detectado por AI</div>
              <p className="text-[12px] leading-relaxed text-[#141F19]">
                <strong>{pattern.title}:</strong> {pattern.description}
              </p>
              <button
                onClick={handlePatternToIdea}
                disabled={isPending}
                className="mt-2 rounded-lg border border-[#C69B30] px-2.5 py-1 text-[11px] font-semibold text-[#C69B30] disabled:opacity-50"
              >
                Ver en mis ideas →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de observaciones */}
      {observations.length > 0 && (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A9A8A]">
            Radar · {observations.length} observaciones
          </div>
          <div className="flex flex-col gap-2">
            {observations.map(o => (
              <div key={o.id} className="rounded-2xl border border-[#e0ebe4] bg-white px-3.5 py-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex-1">
                    <p className="mb-1.5 text-[13px] leading-relaxed text-[#141F19]">{o.content}</p>
                    {o.category && (
                      <span
                        className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold"
                        style={{
                          background: tagColor(o.category) + '18',
                          color: tagColor(o.category),
                          borderColor: tagColor(o.category) + '30',
                        }}
                      >
                        {o.category}
                      </span>
                    )}
                  </div>
                  {o.potential_score != null && (
                    <div className="min-w-[42px] text-center">
                      <div
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#2E7D52 ${o.potential_score}%, #e0ebe4 0)`,
                        }}
                      >
                        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white font-mono text-[10px] font-black text-[#2E7D52]">
                          {o.potential_score}
                        </div>
                      </div>
                      <div className="mt-0.5 text-[9px] text-[#7A9A8A]">potencial</div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="ml-1 text-[#7A9A8A] hover:text-[#E84434]"
                    title="Eliminar"
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
        <div className="rounded-2xl border border-dashed border-[#e0ebe4] px-4 py-8 text-center">
          <div className="mb-1 text-2xl">👂</div>
          <p className="text-[13px] text-[#7A9A8A]">Aún no tienes observaciones. Empieza escuchando quejas a tu alrededor.</p>
        </div>
      )}
    </div>
  )
}
