'use client'

import type { Phase } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

const PHASE_COLORS: Record<string, string> = {
  observar: '#7A9A8A',
  definir:  '#C69B30',
  idear:    '#3A9E6A',
  evaluar:  '#2E7D52',
}

const NEXT_PHASE: Record<string, Phase | null> = {
  observar: 'definir',
  definir:  'idear',
  idear:    'evaluar',
  evaluar:  null,
}

interface PhaseTransitionProps {
  phase: Phase
  summary: {
    insight: string
    next: string
    centsProgress: number
  }
  onContinue: () => void
}

export function PhaseTransition({ phase, summary, onContinue }: PhaseTransitionProps) {
  const color = PHASE_COLORS[phase] ?? '#7A9A8A'
  const phaseMeta = PHASES.find(p => p.key === phase)
  const nextPhase = NEXT_PHASE[phase]
  const nextPhaseMeta = nextPhase ? PHASES.find(p => p.key === nextPhase) : null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#0D1A14',
        fontFamily: '"IBM Plex Sans", sans-serif',
        maxWidth: 480,
        margin: '0 auto',
        padding: '32px 24px',
        animation: 'fadeInFull 0.5s ease',
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes growBar {
          from { width: 0; }
        }
        @keyframes fadeInFull {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Partículas flotantes */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            background: color,
            opacity: 0.4,
            top: `${15 + i * 12}%`,
            left: `${10 + i * 15}%`,
            animation: `float ${2 + i * 0.3}s ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Check circle grande */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 80,
          height: 80,
          background: `radial-gradient(circle, ${color}22, transparent)`,
          border: `2px solid ${color}`,
          fontSize: 36,
          marginBottom: 20,
          animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
          boxShadow: `0 0 40px ${color}44`,
        }}
      >
        ✓
      </div>

      {/* Label */}
      <div
        className="text-[11px] font-bold uppercase tracking-widest mb-[6px]"
        style={{
          color,
          fontFamily: '"IBM Plex Sans", sans-serif',
          letterSpacing: 2,
          animation: 'slideUp 0.4s ease 0.4s both',
        }}
      >
        Fase completada
      </div>

      {/* Título */}
      <div
        className="text-[26px] font-bold text-center mb-7"
        style={{
          color: '#fff',
          fontFamily: '"IBM Plex Sans", sans-serif',
          lineHeight: 1.3,
          animation: 'slideUp 0.4s ease 0.5s both',
        }}
      >
        {phaseMeta?.label ?? phase} completado
      </div>

      {/* Summary card */}
      <div
        className="w-full rounded-[18px] mb-4"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 22px',
          animation: 'slideUp 0.4s ease 0.6s both',
        }}
      >
        <div
          className="text-[11px] font-semibold uppercase mb-[10px]"
          style={{
            color: '#7A9A8A',
            letterSpacing: 1.2,
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}
        >
          Lo que descubrimos
        </div>
        <p
          className="text-[14px] leading-relaxed mb-4"
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}
        >
          {summary.insight}
        </p>

        {/* CENTS mini progress */}
        <div
          className="flex items-center gap-3 rounded-[10px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '10px 14px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              className="text-[10px] mb-[6px]"
              style={{ color: '#7A9A8A', fontFamily: '"IBM Plex Sans", sans-serif' }}
            >
              Progreso CENTS estimado
            </div>
            <div
              className="h-[4px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(summary.centsProgress, 100)}%`,
                  background: `linear-gradient(90deg, #C69B30, #2E7D52)`,
                  transition: 'width 1s ease 0.8s',
                  animation: 'growBar 1s ease 0.8s both',
                }}
              />
            </div>
          </div>
          <div
            className="font-mono text-[16px] font-bold"
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              color: summary.centsProgress >= 60 ? '#3A9E6A' : '#C69B30',
            }}
          >
            {Math.round(summary.centsProgress * 50 / 100)}/50
          </div>
        </div>
      </div>

      {/* Next objective */}
      {nextPhaseMeta && (
        <div
          className="w-full rounded-[14px] mb-7"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}33`,
            padding: '14px 18px',
            animation: 'slideUp 0.4s ease 0.7s both',
          }}
        >
          <div
            className="text-[10px] font-bold uppercase mb-[6px]"
            style={{
              color,
              letterSpacing: 1.2,
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            Próximo objetivo
          </div>
          <p
            className="text-[14px] font-medium m-0"
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            {summary.next}
          </p>
        </div>
      )}

      {/* Continue button */}
      {nextPhaseMeta && (
        <button
          onClick={onContinue}
          className="w-full border-none rounded-[14px] text-[15px] font-semibold cursor-pointer"
          style={{
            padding: '15px 0',
            background: 'linear-gradient(135deg, #2E7D52, #1A5C3A)',
            color: '#fff',
            fontFamily: '"IBM Plex Sans", sans-serif',
            boxShadow: '0 4px 20px rgba(46,125,82,0.4)',
            animation: 'slideUp 0.4s ease 0.8s both',
          }}
        >
          Continuar a {nextPhaseMeta.label} →
        </button>
      )}

      {/* Last phase — no button */}
      {!nextPhaseMeta && (
        <div style={{ animation: 'slideUp 0.4s ease 0.8s both', textAlign: 'center' }}>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ¡Embudo completo! Tu idea está lista para el mundo real.
          </p>
        </div>
      )}
    </div>
  )
}
