'use client'

import type { Phase } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

const PHASE_COLORS: Record<Phase, string> = {
  observar: '#7A9A8A',
  definir:  '#C69B30',
  idear:    '#3A9E6A',
  evaluar:  '#2E7D52',
}

const PHASE_SHORT: Record<Phase, string> = {
  observar: 'O',
  definir:  'D',
  idear:    'I',
  evaluar:  'E',
}

interface PhaseBarProps {
  currentPhase: Phase
  completedPhases: Phase[]
}

export function PhaseBar({ currentPhase, completedPhases }: PhaseBarProps) {
  const currentIdx = PHASES.findIndex(p => p.key === currentPhase)

  return (
    <div className="flex items-center" style={{ padding: '0 20px' }}>
      {PHASES.map((phase, i) => {
        const isCompleted = completedPhases.includes(phase.key)
        const isCurrent = phase.key === currentPhase
        const color = PHASE_COLORS[phase.key]
        const short = PHASE_SHORT[phase.key]

        return (
          <div key={phase.key} className="flex items-center" style={{ flex: 1 }}>
            <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              {/* Circle */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 30,
                  height: 30,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  background: isCompleted ? color : isCurrent ? '#fff' : 'rgba(255,255,255,0.08)',
                  color: isCompleted ? '#fff' : isCurrent ? '#1A2520' : 'rgba(255,255,255,0.3)',
                  border: isCurrent ? `2px solid ${color}` : '2px solid transparent',
                  transition: 'all 0.4s ease',
                  boxShadow: isCurrent ? `0 0 12px ${color}55` : 'none',
                }}
              >
                {isCompleted ? '✓' : short}
              </div>
              {/* Label */}
              <span
                className="text-[9px] font-semibold uppercase leading-none"
                style={{
                  color: isCompleted ? color : isCurrent ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  letterSpacing: 0.5,
                  transition: 'all 0.4s ease',
                }}
              >
                {phase.label}
              </span>
            </div>
            {/* Connector (except last) */}
            {i < PHASES.length - 1 && (
              <div
                className="rounded-full"
                style={{
                  height: 1.5,
                  flex: 1,
                  marginBottom: 16,
                  background: isCompleted
                    ? `linear-gradient(90deg, ${color}, ${PHASE_COLORS[PHASES[i + 1].key as Phase]})`
                    : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.6s ease',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
