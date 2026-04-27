'use client'

import type { Phase } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

const PHASE_COLORS: Record<Phase, string> = {
  observar: '#7A9A8A',
  definir:  '#C69B30',
  idear:    '#3A9E6A',
  evaluar:  '#2E7D52',
}

interface PhaseBarProps {
  currentPhase: Phase
  completedPhases: Phase[]
}

export function PhaseBar({ currentPhase, completedPhases }: PhaseBarProps) {
  const currentOrder = PHASES.find(p => p.key === currentPhase)?.order ?? 1

  return (
    <div className="flex items-center gap-[2px]">
      {PHASES.map((phase, i) => {
        const isCompleted = completedPhases.includes(phase.key)
        const isCurrent = phase.key === currentPhase
        const color = PHASE_COLORS[phase.key]
        const isPast = i + 1 < currentOrder

        // Estilo del punto: completado → check, actual → punto relleno, futuro → círculo vacío
        return (
          <div key={phase.key} className="flex items-center gap-[2px] flex-1">
            <div className="flex items-center justify-center">
              {isCompleted ? (
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: color,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  ✓
                </span>
              ) : isCurrent ? (
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: color,
                    boxShadow: `0 0 0 3px ${color}22`,
                    transition: 'all 0.3s ease',
                  }}
                />
              ) : (
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 16,
                    height: 16,
                    border: `2px solid ${color}`,
                    opacity: 0.4,
                    transition: 'all 0.3s ease',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              className="text-[10px] font-semibold leading-none"
              style={{
                color,
                opacity: isPast || isCurrent ? 0.9 : 0.4,
                fontFamily: 'var(--font-sans)',
                letterSpacing: 0.3,
                transition: 'all 0.3s ease',
              }}
            >
              {phase.label}
            </span>

            {/* Connector line (except last) */}
            {i < PHASES.length - 1 && (
              <div
                className="flex-1 h-[2px] mx-1 rounded-full"
                style={{
                  background: isPast || (isCompleted && i < currentOrder - 1) ? color : '#e0ebe4',
                  opacity: 0.4,
                  transition: 'all 0.3s ease',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
