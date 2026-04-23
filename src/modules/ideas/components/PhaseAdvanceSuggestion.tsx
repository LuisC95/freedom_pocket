'use client'

import type { Phase, PhaseReadySignal } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

interface PhaseAdvanceSuggestionProps {
  signal: PhaseReadySignal
  currentPhase: Phase
  pending?: boolean
  onAccept: (target: Phase) => void
  onDismiss: () => void
}

export function PhaseAdvanceSuggestion({
  signal,
  currentPhase,
  pending,
  onAccept,
  onDismiss,
}: PhaseAdvanceSuggestionProps) {
  const targetMeta = PHASES.find(p => p.key === signal.target)
  const targetLabel = targetMeta?.label ?? signal.target

  const currentOrder = PHASES.find(p => p.key === currentPhase)?.order ?? 0
  const targetOrder = targetMeta?.order ?? 0
  if (targetOrder !== currentOrder + 1) return null

  return (
    <div
      style={{
        border: '1.5px solid #C69B30',
        borderRadius: 12,
        padding: 14,
        backgroundColor: 'rgba(198,155,48,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#C69B30',
            margin: 0,
          }}
        >
          Sugerencia de la IA
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: '#141F19',
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          {signal.reason}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onAccept(signal.target)}
          disabled={pending}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            backgroundColor: '#3A9E6A',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Resumiendo...' : `Avanzar a ${targetLabel} →`}
        </button>
        <button
          onClick={onDismiss}
          disabled={pending}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: '1.5px solid #E4EDE8',
            backgroundColor: '#fff',
            color: '#7A9A8A',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Seguir acá
        </button>
      </div>
    </div>
  )
}
