'use client'

import type { Phase, PhaseSummariesMap } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

interface PreviousPhaseContextProps {
  currentPhase: Phase
  summaries: PhaseSummariesMap
}

export function PreviousPhaseContext({ currentPhase, summaries }: PreviousPhaseContextProps) {
  const currentOrder = PHASES.find(p => p.key === currentPhase)?.order ?? 1
  const priorEntries = PHASES
    .filter(p => p.order < currentOrder)
    .map(p => ({ phase: p, summary: summaries[p.key as Phase] }))
    .filter(entry => entry.summary?.summary)

  if (priorEntries.length === 0) return null

  return (
    <details
      style={{
        border: '1px solid #E4EDE8',
        borderRadius: 10,
        backgroundColor: '#EAF0EC',
        padding: '8px 12px',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: '#7A9A8A',
          outline: 'none',
        }}
      >
        Contexto previo ({priorEntries.length})
      </summary>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {priorEntries.map(({ phase, summary }) => (
          <div key={phase.key}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: '#3A9E6A',
                margin: '0 0 4px',
              }}
            >
              {phase.label}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: '#141F19',
                margin: 0,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {summary!.summary}
            </p>
          </div>
        ))}
      </div>
    </details>
  )
}
