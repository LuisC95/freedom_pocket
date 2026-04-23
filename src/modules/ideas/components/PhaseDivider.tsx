'use client'

import type { Phase } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

interface PhaseDividerProps {
  from: Phase
  to: Phase
  summary?: string
}

export function PhaseDivider({ from, to, summary }: PhaseDividerProps) {
  const fromLabel = PHASES.find(p => p.key === from)?.label ?? from
  const toLabel = PHASES.find(p => p.key === to)?.label ?? to

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E4EDE8' }} />
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#3A9E6A',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {fromLabel} → {toLabel}
        </p>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E4EDE8' }} />
      </div>
      {summary && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontStyle: 'italic',
            color: '#7A9A8A',
            margin: 0,
            textAlign: 'center',
            maxWidth: '85%',
            lineHeight: 1.5,
          }}
        >
          {summary}
        </p>
      )}
    </div>
  )
}
