'use client'

import { PHASES } from '@/modules/ideas/constants'
import type { Phase } from '@/modules/ideas/types'

interface PhaseIndicatorProps {
  currentPhase: Phase
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentOrder = PHASES.find(p => p.key === currentPhase)?.order ?? 1

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {PHASES.map((phase, idx) => {
        const isDone   = phase.order < currentOrder
        const isActive = phase.key === currentPhase
        return (
          <div key={phase.key} className="flex items-center gap-1 shrink-0">
            {idx > 0 && (
              <span style={{ color: isDone ? '#3A9E6A' : '#C8D9D0', fontSize: '10px' }}>→</span>
            )}
            <div className="flex items-center gap-1">
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  backgroundColor: isActive ? '#3A9E6A' : isDone ? '#3A9E6A66' : '#C8D9D0',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#3A9E6A' : isDone ? '#7A9A8A' : '#B0C4BB',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {phase.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
