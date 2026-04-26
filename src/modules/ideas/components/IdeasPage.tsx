'use client'

import { useState } from 'react'
import type { Idea } from '@/modules/ideas/types'
import { IdeaCard } from './IdeaCard'
import type { IdeaCardData } from './IdeaCard'
import { IdeaDetail } from './IdeaDetail'
import { NewIdeaSheet } from './NewIdeaSheet'

interface IdeasPageProps {
  ideas: Idea[]
}

const NEXT_STEP_BY_STATUS: Record<string, string | null> = {
  generated: 'Evaluar con CENTS',
  committed: 'Completar evaluación CENTS',
  validando: 'Registrar resultado de validación',
  construyendo: 'Completar Deep Dive',
  operando: null,
  discarded: null,
}

const MODEL_LABEL: Record<string, string> = {
  saas: 'SaaS', producto_fisico: 'Producto', servicio: 'Servicio',
  contenido: 'Contenido', renta: 'Renta', custom: 'Otro',
}

function enrichIdea(idea: Idea): IdeaCardData {
  const updated = idea.updated_at ? new Date(idea.updated_at) : new Date()
  const lastActivity = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24))
  const businessModel = MODEL_LABEL[idea.business_model ?? ''] ?? idea.business_model ?? ''
  return {
    title: idea.title,
    concept: idea.concept ?? null,
    status: idea.status,
    cents_score: idea.cents_complete ? null : null, // placeholder — usar cents_preliminary_score cuando exista
    lastActivity,
    nextStep: NEXT_STEP_BY_STATUS[idea.status] ?? null,
    businessModel,
  }
}

export function IdeasPage({ ideas }: IdeasPageProps) {
  const [selectedIdea, setSelectedIdea] = useState<IdeaCardData | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('activas')

  const activas = ideas.filter(i => ['committed', 'validando', 'construyendo', 'operando'].includes(i.status))
  const nuevas = ideas.filter(i => i.status === 'generated')
  const descartadas = ideas.filter(i => i.status === 'discarded')

  const renderSection = (
    label: string,
    items: Idea[],
    compact: boolean,
    badgeColor: string,
    badgeBg: string
  ) => {
    if (items.length === 0) return null
    return (
      <section className="mb-7" style={{ animation: 'fadeIn 0.3s ease forwards' }}>
        <div className="flex justify-between items-center mb-3">
          <span
            className="text-[13px] font-bold"
            style={{ color: '#141F19', letterSpacing: 0.2, fontFamily: 'var(--font-sans)' }}
          >
            {label}
          </span>
          <span
            className="text-[11px] font-semibold rounded-[10px]"
            style={{
              color: badgeColor,
              background: badgeBg,
              padding: '2px 8px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {items.length} ideas
          </span>
        </div>
        <div className="flex flex-col gap-[10px]">
          {items.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={enrichIdea(idea)}
              onClick={d => setSelectedIdea(d)}
              compact={compact}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F2F7F4', fontFamily: 'var(--font-sans)' }}>
      {/* Inject animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto" style={{ maxWidth: 480, padding: '24px 20px 0' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-[4px]">
          <div>
            <h1
              className="text-[22px] font-bold leading-tight"
              style={{ color: '#141F19', fontFamily: 'var(--font-sans)' }}
            >
              Ideas
            </h1>
            <p className="text-[12px] mt-[2px]" style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
              {activas.length} en marcha · {nuevas.length} por evaluar
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="text-[13px] font-semibold border-none rounded-[20px] cursor-pointer flex items-center gap-[6px]"
            style={{
              background: '#2E7D52',
              color: 'white',
              padding: '8px 16px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            + Nueva
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 pb-1 overflow-x-auto">
          {[
            { key: 'activas', label: 'En marcha' },
            { key: 'nuevas', label: 'Por evaluar' },
            { key: 'todas', label: 'Todas' },
            { key: 'descartadas', label: 'Descartadas' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="text-[12px] font-semibold border-none rounded-[20px] cursor-pointer whitespace-nowrap"
              style={{
                padding: '6px 14px',
                background: filter === tab.key ? '#141F19' : '#EAF0EC',
                color: filter === tab.key ? 'white' : '#7A9A8A',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 480, padding: '20px 20px 100px' }}>
        {/* EN MARCHA */}
        {(filter === 'activas' || filter === 'todas') && renderSection(
          'EN MARCHA', activas, false, '#2E7D52', 'rgba(46,125,82,0.1)'
        )}

        {/* POR EVALUAR */}
        {(filter === 'nuevas' || filter === 'todas') && renderSection(
          'POR EVALUAR', nuevas, true, '#C69B30', 'rgba(198,155,48,0.1)'
        )}

        {/* DESCARTADAS */}
        {(filter === 'descartadas' || filter === 'todas') && descartadas.length > 0 && (
          <section className="mb-7" style={{ animation: 'fadeIn 0.3s ease forwards' }}>
            <div className="flex justify-between items-center mb-3">
              <span
                className="text-[13px] font-bold"
                style={{ color: '#7A9A8A', letterSpacing: 0.2, fontFamily: 'var(--font-sans)' }}
              >
                DESCARTADAS
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {descartadas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={enrichIdea(idea)}
                  onClick={d => setSelectedIdea(d)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filter === 'activas' && activas.length === 0 && (
          <div className="text-center px-5" style={{ padding: '60px 20px', fontFamily: 'var(--font-sans)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧭</div>
            <div className="text-[16px] font-semibold mb-[6px]" style={{ color: '#141F19' }}>
              Sin ideas en marcha
            </div>
            <div className="text-[13px] mb-5" style={{ color: '#7A9A8A' }}>
              Comprometete con una idea para empezar a validarla
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="text-[14px] font-semibold border-none rounded-[12px] cursor-pointer"
              style={{
                background: '#2E7D52',
                color: 'white',
                padding: '12px 24px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              + Agregar idea
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNew(true)}
        className="fixed border-none cursor-pointer flex items-center justify-center"
        style={{
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#2E7D52',
          color: 'white',
          fontSize: 24,
          fontWeight: 300,
          boxShadow: '0 4px 20px rgba(46,125,82,0.4)',
          transition: 'transform 0.15s ease',
          zIndex: 40,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        +
      </button>

      {/* Modals */}
      {selectedIdea && (
        <IdeaDetail idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
      )}
      {showNew && (
        <NewIdeaSheet onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}
