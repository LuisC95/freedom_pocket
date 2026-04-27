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
        fontFamily: 'var(--font-sans)',
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(2deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes growBar {
          from { width: 0; }
        }
        @keyframes fadeInFull {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Partículas flotantes */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            background: color,
            opacity: 0.3,
            top: `${20 + (i * 13) % 60}%`,
            left: `${15 + (i * 17) % 70}%`,
            animation: `float ${3 + (i % 2)}s ease infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Check + glow */}
      <div
        className="flex items-center justify-center mb-5"
        style={{ animation: 'scaleIn 0.5s ease 0.2s both' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            background: `${color}22`,
            boxShadow: `0 0 30px ${color}44, 0 0 60px ${color}22`,
          }}
        >
          <span style={{ fontSize: 36, color }}>✓</span>
        </div>
      </div>

      {/* Label y título */}
      <div style={{ textAlign: 'center', animation: 'fadeInFull 0.5s ease 0.4s both' }}>
        <span
          className="text-[12px] font-semibold uppercase tracking-widest mb-2 block"
          style={{ color, letterSpacing: 2 }}
        >
          Fase completada
        </span>
        <h2
          className="text-[26px] font-bold mb-2"
          style={{ color: '#ffffff', margin: 0 }}
        >
          {phaseMeta?.label ?? phase} completado
        </h2>
      </div>

      {/* Insight card */}
      <div
        className="w-[85%] max-w-[400px] rounded-[14px] mb-4"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          animation: 'fadeInFull 0.5s ease 0.6s both',
        }}
      >
        <div className="text-[11px] mb-2 font-semibold" style={{ color }}>
          LO DESCUBIERTO
        </div>
        <p className="text-[14px] leading-relaxed m-0" style={{ color: '#A7F3D0' }}>
          {summary.insight}
        </p>
      </div>

      {/* CENTS progress */}
      <div
        className="w-[85%] max-w-[400px] mb-4"
        style={{ animation: 'fadeInFull 0.5s ease 0.8s both' }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold" style={{ color: '#7A9A8A' }}>
            PROGRESO CENTS
          </span>
          <span
            className="font-mono text-[20px] font-bold"
            style={{ color: summary.centsProgress >= 70 ? '#2E7D52' : '#C69B30' }}
          >
            {Math.round(summary.centsProgress)}/100
          </span>
        </div>
        <div
          className="h-[6px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(summary.centsProgress, 100)}%`,
              background: `linear-gradient(90deg, ${color}, #2E7D52)`,
              animation: 'growBar 0.8s ease 1s both',
            }}
          />
        </div>
      </div>

      {/* Next step card */}
      {nextPhaseMeta && (
        <div
          className="w-[85%] max-w-[400px] rounded-[14px] mb-6"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${color}33`,
            padding: '16px',
            animation: 'fadeInFull 0.5s ease 1s both',
          }}
        >
          <div className="text-[11px] mb-2 font-semibold" style={{ color }}>
            PRÓXIMO OBJETIVO
          </div>
          <p className="text-[14px] leading-relaxed m-0" style={{ color: '#ffffff' }}>
            {summary.next}
          </p>
        </div>
      )}

      {/* Continue button */}
      {nextPhaseMeta && (
        <button
          onClick={onContinue}
          className="border-none rounded-[12px] text-[16px] font-semibold cursor-pointer"
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #2E7D52, #1A5C3A)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            animation: 'fadeInFull 0.5s ease 1.2s both',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Continuar a {nextPhaseMeta.label} →
        </button>
      )}

      {/* Última fase — sin botón */}
      {!nextPhaseMeta && (
        <div style={{ animation: 'fadeInFull 0.5s ease 1.2s both', textAlign: 'center' }}>
          <p className="text-[14px]" style={{ color: '#A7F3D0' }}>
            ¡Embudo completo! Tu idea está lista para el mundo real.
          </p>
        </div>
      )}
    </div>
  )
}
