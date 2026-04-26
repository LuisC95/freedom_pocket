'use client'

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  generated:    { label: 'Nueva',        color: '#7A9A8A', bg: 'rgba(122,154,138,0.12)', dot: '#7A9A8A' },
  committed:    { label: 'Comprometida', color: '#C69B30', bg: 'rgba(198,155,48,0.12)',  dot: '#C69B30' },
  validando:    { label: 'Validando',    color: '#3A9E6A', bg: 'rgba(58,158,106,0.12)',  dot: '#3A9E6A' },
  construyendo: { label: 'Construyendo', color: '#2E7D52', bg: 'rgba(46,125,82,0.18)',   dot: '#2E7D52' },
  operando:     { label: 'Operando',     color: '#1a6e3c', bg: 'rgba(26,110,60,0.2)',    dot: '#1a6e3c' },
  discarded:    { label: 'Descartada',   color: '#7A9A8A', bg: 'rgba(122,154,138,0.08)', dot: '#ccc'    },
}

const MODEL_LABEL: Record<string, string> = {
  saas: 'SaaS', producto_fisico: 'Producto', servicio: 'Servicio',
  contenido: 'Contenido', renta: 'Renta', custom: 'Otro',
}

export interface IdeaCardData {
  title: string
  concept: string | null
  status: string
  cents_score: number | null
  lastActivity: number
  nextStep: string | null
  businessModel: string
}

interface IdeaCardProps {
  idea: IdeaCardData
  onClick?: (idea: IdeaCardData) => void
  compact?: boolean
}

export function IdeaCard({ idea, onClick, compact }: IdeaCardProps) {
  const meta = STATUS_META[idea.status] ?? STATUS_META.generated
  const stale = idea.lastActivity > 7 && idea.status !== 'discarded'
  const isDiscarded = idea.status === 'discarded'
  const borderColor = stale && !isDiscarded ? 'rgba(198,155,48,0.3)' : '#e0ebe4'

  return (
    <div
      onClick={() => onClick?.(idea)}
      className="relative overflow-hidden rounded-[14px] cursor-pointer"
      style={{
        background: isDiscarded ? 'rgba(234,240,236,0.4)' : 'white',
        border: `1.5px solid ${borderColor}`,
        padding: compact ? '12px 14px' : '16px 18px',
        opacity: isDiscarded ? 0.55 : 1,
        transition: 'all 0.18s ease',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={e => {
        if (!isDiscarded) {
          e.currentTarget.style.borderColor = '#2E7D52'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(46,125,82,0.1)'
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = borderColor
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Status bar top */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 3,
          background: meta.dot,
          opacity: isDiscarded ? 0.3 : 0.7,
          borderRadius: '14px 14px 0 0',
        }}
      />

      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="font-semibold leading-tight"
              style={{
                fontSize: compact ? 13 : 14,
                color: '#141F19',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {idea.title}
            </span>
            <span
              className="text-[10px] font-semibold uppercase rounded-[20px]"
              style={{
                color: meta.color,
                background: meta.bg,
                padding: '2px 7px',
                letterSpacing: 0.5,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {meta.label}
            </span>
          </div>

          {/* Concept (only full cards) */}
          {!compact && idea.concept && (
            <p
              className="text-[12px] leading-relaxed mb-[10px]"
              style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
            >
              {idea.concept}
            </p>
          )}

          {/* Info row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Score badge */}
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
              <span className="font-mono text-[13px] text-[#7A9A8A]" style={{ letterSpacing: -0.5 }}>
                —/50
              </span>
            )}

            {/* Model badge */}
            {idea.businessModel && (
              <span
                className="text-[11px] rounded-[8px]"
                style={{
                  color: '#7A9A8A',
                  background: '#EAF0EC',
                  padding: '2px 7px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {MODEL_LABEL[idea.businessModel] ?? idea.businessModel}
              </span>
            )}

            {/* Activity dot */}
            {idea.lastActivity > 3 && (
              <span
                className="inline-flex items-center gap-[4px] text-[11px]"
                style={{
                  color: idea.lastActivity > 14 ? '#E84434' : '#C69B30',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: idea.lastActivity > 14 ? '#E84434' : '#C69B30',
                    boxShadow: `0 0 6px ${idea.lastActivity > 14 ? '#E84434' : '#C69B30'}`,
                  }}
                />
                {idea.lastActivity}d sin actividad
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        {idea.nextStep && !isDiscarded && (
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 28,
              height: 28,
              background: '#EAF0EC',
              color: '#2E7D52',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
            }}
          >
            →
          </div>
        )}
      </div>

      {/* Next step hint (only full cards) */}
      {idea.nextStep && !isDiscarded && !compact && (
        <div
          className="flex items-center gap-2 mt-[10px] rounded-[8px]"
          style={{
            padding: '8px 12px',
            background: '#F2F7F4',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <span className="text-[12px] font-semibold" style={{ color: '#2E7D52' }}>
            Próximo paso:
          </span>
          <span className="text-[12px]" style={{ color: '#141F19' }}>
            {idea.nextStep}
          </span>
        </div>
      )}
    </div>
  )
}
