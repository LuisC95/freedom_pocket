'use client'

import type { Idea } from '@/modules/ideas/types'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  generated:    { label: 'Nueva',        color: '#7A9A8A', bg: 'rgba(122,154,138,0.12)' },
  committed:    { label: 'Comprometida', color: '#C69B30', bg: 'rgba(198,155,48,0.12)'  },
  validando:    { label: 'Validando',    color: '#3A9E6A', bg: 'rgba(58,158,106,0.12)'  },
  construyendo: { label: 'Construyendo', color: '#2E7D52', bg: 'rgba(46,125,82,0.18)'   },
  operando:     { label: 'Operando',     color: '#1a6e3c', bg: 'rgba(26,110,60,0.2)'    },
  discarded:    { label: 'Descartada',   color: '#7A9A8A', bg: 'rgba(122,154,138,0.08)' },
}

const MODEL_LABEL: Record<string, string> = {
  saas: 'SaaS', producto_fisico: 'Producto', servicio: 'Servicio',
  contenido: 'Contenido', renta: 'Renta', custom: 'Otro',
}

interface IdeaDetailProps {
  idea: { title: string; concept: string | null; status: string; cents_score: number | null; lastActivity: number; nextStep: string | null; businessModel: string }
  onClose: () => void
  onContinue?: () => void
}

export function IdeaDetail({ idea, onClose, onContinue }: IdeaDetailProps) {
  const meta = STATUS_META[idea.status] ?? STATUS_META.generated
  const activityColor = idea.lastActivity > 14 ? '#E84434' : idea.lastActivity > 7 ? '#C69B30' : '#2E7D52'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,31,25,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full bg-white"
        style={{
          maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 40px',
          animation: 'slideUp 0.25s ease',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Handle */}
        <div className="mx-auto mb-6 rounded-full" style={{ width: 36, height: 4, background: '#e0ebe4' }} />

        {/* Title + status */}
        <div className="flex justify-between items-start mb-[6px]">
          <h2
            className="text-[20px] font-bold flex-1 leading-tight"
            style={{ color: '#141F19', fontFamily: 'var(--font-sans)' }}
          >
            {idea.title}
          </h2>
          <span
            className="ml-3 flex-shrink-0 text-[11px] font-bold uppercase rounded-[20px]"
            style={{
              color: meta.color,
              background: meta.bg,
              padding: '4px 10px',
              letterSpacing: 0.5,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Concept */}
        {idea.concept && (
          <p
            className="text-[14px] leading-relaxed mb-5"
            style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
          >
            {idea.concept}
          </p>
        )}

        {/* Stats row */}
        <div
          className="flex justify-between items-center mb-4 rounded-[14px]"
          style={{ background: '#F2F7F4', padding: '14px 16px', fontFamily: 'var(--font-sans)' }}
        >
          <div>
            <div className="text-[11px] mb-[2px]" style={{ color: '#7A9A8A' }}>Score CENTS</div>
            {idea.cents_score !== null ? (
              <span
                className="font-mono text-[13px] font-bold"
                style={{
                  color: idea.cents_score >= 35 ? '#2E7D52' : idea.cents_score >= 25 ? '#C69B30' : '#E84434',
                  letterSpacing: -0.5,
                }}
              >
                {idea.cents_score}/50
              </span>
            ) : (
              <span className="font-mono text-[13px] text-[#7A9A8A]" style={{ letterSpacing: -0.5 }}>—/50</span>
            )}
          </div>
          <div>
            <div className="text-[11px] mb-[2px]" style={{ color: '#7A9A8A' }}>Modelo</div>
            <span className="text-[13px] font-semibold" style={{ color: '#141F19' }}>
              {MODEL_LABEL[idea.businessModel] ?? idea.businessModel}
            </span>
          </div>
          <div>
            <div className="text-[11px] mb-[2px]" style={{ color: '#7A9A8A' }}>Actividad</div>
            <span className="font-mono text-[13px] font-semibold" style={{ color: activityColor }}>
              {idea.lastActivity}d atrás
            </span>
          </div>
        </div>

        {/* Next step hero */}
        {idea.nextStep && (
          <div className="mb-5 rounded-[14px]" style={{ background: '#1A2520', padding: '14px 16px' }}>
            <div className="text-[11px] mb-[6px]" style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
              PRÓXIMO PASO
            </div>
            <div className="text-[14px] font-medium text-white" style={{ fontFamily: 'var(--font-sans)' }}>
              {idea.nextStep}
            </div>
          </div>
        )}

        {/* Actions */}
        {idea.status !== 'discarded' && (
          <div className="flex gap-[10px]">
            <button
              onClick={onContinue ?? onClose}
              className="flex-1 text-[14px] font-semibold border-none rounded-[12px] cursor-pointer"
              style={{
                padding: '13px 0',
                background: '#2E7D52',
                color: 'white',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Continuar →
            </button>
            <button
              className="border-none rounded-[12px] cursor-pointer"
              style={{
                padding: '13px 16px',
                background: '#F2F7F4',
                color: '#7A9A8A',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
              }}
            >
              ⋯
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
