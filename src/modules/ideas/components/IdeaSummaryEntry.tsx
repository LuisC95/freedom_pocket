'use client'

import { useState } from 'react'
import type { Phase } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'
import { PhaseBar } from './PhaseBar'
import { DiscardIdeaModal } from './DiscardIdeaModal'

const PHASE_COLORS: Record<string, string> = {
  observar: '#7A9A8A',
  definir:  '#C69B30',
  idear:    '#3A9E6A',
  evaluar:  '#2E7D52',
}

interface SessionSummary {
  phase: Phase
  insight: string | null
  completedAt: string | null
}

interface IdeaSummaryEntryProps {
  ideaId: string
  title: string
  concept: string | null
  status: string
  currentPhase: Phase
  completedPhases: Phase[]
  lastCoachQuestion: string | null
  lastSession: SessionSummary | null
  onContinue: () => void
  onBack: () => void
}

export function IdeaSummaryEntry({
  ideaId,
  title,
  concept,
  status,
  currentPhase,
  completedPhases,
  lastCoachQuestion,
  lastSession,
  onContinue,
  onBack,
}: IdeaSummaryEntryProps) {
  const [showDiscard, setShowDiscard] = useState(false)
  const currentColor = PHASE_COLORS[currentPhase] ?? '#7A9A8A'
  const isTerminal = status === 'operando' || status === 'discarded'

  return (
    <div className="min-h-screen" style={{ background: '#F2F7F4', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Dark header */}
      <div
        className="w-full"
        style={{
          background: '#1A2520',
          borderRadius: '0 0 24px 24px',
          padding: '60px 20px 28px',
        }}
      >
        <button
          onClick={onBack}
          className="text-[13px] border-none cursor-pointer bg-transparent mb-4 block"
          style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
        >
          ← Volver
        </button>

        <div className="text-[11px] font-semibold mb-1 uppercase tracking-widest" style={{ color: '#7A9A8A', letterSpacing: 1.5 }}>
          TU IDEA
        </div>
        <h1 className="text-[22px] font-bold m-0 mb-4" style={{ color: '#ffffff' }}>
          {title}
        </h1>

        {/* PhaseBar */}
        <PhaseBar currentPhase={currentPhase} completedPhases={completedPhases} />
      </div>

      <div className="mx-auto" style={{ maxWidth: 480, padding: '20px' }}>
        {/* Última pregunta del coach */}
        {lastCoachQuestion && (
          <div
            className="rounded-[14px] mb-4"
            style={{
              background: '#ffffff',
              border: '1.5px solid #e0ebe4',
              padding: '16px',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div
              className="text-[11px] font-semibold mb-[6px]"
              style={{ color: '#7A9A8A', letterSpacing: 0.5 }}
            >
              🧭 Última pregunta del coach
            </div>
            <p
              className="text-[14px] italic leading-relaxed m-0"
              style={{ color: '#141F19' }}
            >
              {lastCoachQuestion}
            </p>
          </div>
        )}

        {/* Estado de evaluación por fases */}
        <div
          className="rounded-[14px] mb-4"
          style={{
            background: '#ffffff',
            border: '1.5px solid #e0ebe4',
            padding: '16px',
            animation: 'fadeIn 0.3s ease 0.1s both',
          }}
        >
          <div
            className="text-[11px] font-semibold mb-3"
            style={{ color: '#7A9A8A', letterSpacing: 0.5 }}
          >
            ESTADO DE EVALUACIÓN
          </div>
          <div className="flex flex-col gap-2">
            {PHASES.map(p => {
              const isCompleted = completedPhases.includes(p.key)
              const isCurrent = p.key === currentPhase
              const color = PHASE_COLORS[p.key]

              return (
                <div key={p.key} className="flex items-center gap-3">
                  {/* Indicator */}
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      background: isCompleted ? color : isCurrent ? `${color}22` : 'transparent',
                      border: `2px solid ${color}`,
                      opacity: isCompleted || isCurrent ? 1 : 0.4,
                      fontSize: 11,
                      color: isCompleted ? '#fff' : color,
                      fontWeight: 700,
                    }}
                  >
                    {isCompleted ? '✓' : isCurrent ? '●' : '○'}
                  </span>

                  {/* Label */}
                  <span
                    className="text-[14px] font-medium"
                    style={{
                      color: isCompleted || isCurrent ? '#141F19' : '#7A9A8A',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                    }}
                  >
                    {p.label}
                  </span>

                  {/* Badge */}
                  {isCompleted && (
                    <span
                      className="text-[10px] font-semibold rounded-[10px]"
                      style={{
                        color,
                        background: `${color}18`,
                        padding: '2px 8px',
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="text-[10px] font-semibold rounded-[10px]"
                      style={{
                        color,
                        background: `${color}18`,
                        padding: '2px 8px',
                      }}
                    >
                      SIGUIENTE
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Última sesión */}
        {lastSession && (
          <div
            className="rounded-[14px] mb-6"
            style={{
              background: '#ffffff',
              border: '1.5px solid #e0ebe4',
              padding: '16px',
              animation: 'fadeIn 0.3s ease 0.2s both',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 14 }}>🕐</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: '#7A9A8A', letterSpacing: 0.5 }}
              >
                ÚLTIMA SESIÓN
                {lastSession.completedAt && (
                  <span className="font-normal ml-1" style={{ color: '#7A9A8A' }}>
                    — hace {Math.floor((Date.now() - new Date(lastSession.completedAt).getTime()) / (1000 * 60 * 60 * 24))} días
                  </span>
                )}
              </span>
            </div>
            {lastSession.insight && (
              <p
                className="text-[13px] leading-relaxed m-0"
                style={{ color: '#141F19' }}
              >
                {lastSession.insight}
              </p>
            )}
          </div>
        )}

        {/* Continue button */}
        {!isTerminal && (
          <>
            <button
              onClick={onContinue}
              className="w-full border-none rounded-[12px] text-[15px] font-semibold cursor-pointer"
              style={{
                padding: '14px 0',
                background: `linear-gradient(135deg, #2E7D52, #1A5C3A)`,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                transition: 'transform 0.15s ease',
                animation: 'slideUp 0.3s ease 0.3s both',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Continuar → {PHASES.find(p => p.key === currentPhase)?.label ?? currentPhase}
            </button>

            <button
              onClick={() => setShowDiscard(true)}
              className="w-full border-none rounded-[12px] text-[14px] font-medium cursor-pointer mt-3"
              style={{
                padding: '11px 0',
                background: 'transparent',
                border: '1.5px solid #E4EDE8',
                color: '#7A9A8A',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s ease',
                animation: 'slideUp 0.3s ease 0.35s both',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#E84434'
                e.currentTarget.style.color = '#E84434'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E4EDE8'
                e.currentTarget.style.color = '#7A9A8A'
              }}
            >
              Descartar idea
            </button>
          </>
        )}

        {/* Terminal states */}
        {status === 'operando' && (
          <div
            className="rounded-[14px] text-center py-6 px-4"
            style={{
              background: '#F0FBF4',
              border: '1.5px solid #C8E6C9',
              animation: 'fadeIn 0.3s ease 0.3s both',
            }}
          >
            <p className="text-[15px] font-semibold m-0 mb-1" style={{ color: '#2E7D52' }}>
              🎯 Este negocio ya vive en tu Brújula
            </p>
            <p className="text-[12px] m-0" style={{ color: '#3A9E6A' }}>
              Gestionalo desde el módulo Brújula
            </p>
          </div>
        )}

        {status === 'discarded' && (
          <div
            className="rounded-[14px] text-center py-6 px-4"
            style={{
              background: '#FAFAFA',
              border: '1.5px solid #E4EDE8',
              animation: 'fadeIn 0.3s ease 0.3s both',
            }}
          >
            <p className="text-[14px] m-0" style={{ color: '#7A9A8A' }}>
              Idea descartada
            </p>
          </div>
        )}
      </div>

      {/* Discard modal */}
      {showDiscard && (
        <DiscardIdeaModal
          ideaId={ideaId}
          onClose={() => setShowDiscard(false)}
        />
      )}
    </div>
  )
}
