'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea, CreateIdeaInput, BusinessModel } from '@/modules/ideas/types'
import { createIdea, discardIdea, generateSprint, getActiveSprintForIdea } from '@/modules/ideas/actions'
import { BUSINESS_MODELS, CAMINOS } from '@/modules/ideas/constants'

// createMapIdea may or may not exist — import defensively
let createMapIdea: ((input: { caminoId: string }) => Promise<import('@/types/actions').ActionResult<Idea>>) | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  createMapIdea = require('@/modules/ideas/actions').createMapIdea
} catch { /* not available */ }

interface Props {
  ideas:          Idea[]
  initialFilter?: 'cazador' | 'mapa'
  caminoId?:      string
}

const STATUS_COLOR: Record<string, string> = {
  nueva:             '#3A9E6A',
  en_sprint:         '#D4A93A',
  sprint_completado: '#4DC98A',
  promovida:         '#3A9E6A',
  descartada:        '#F2675A',
}

const STATUS_LABEL: Record<string, string> = {
  nueva:             'Nueva',
  en_sprint:         'En sprint',
  sprint_completado: 'Sprint completado',
  promovida:         'Promovida',
  descartada:        'Descartada',
}

const SOURCE_LABEL: Record<string, string> = {
  cazador: '👂 Cazador',
  mapa:    '🗺️ Mapa',
  manual:  '✍️ Manual',
}

type FiltroKey = 'todas' | 'cazador' | 'mapa' | 'en_sprint'

const FILTROS: { key: FiltroKey; label: string }[] = [
  { key: 'todas',     label: 'Todas'       },
  { key: 'cazador',   label: '👂 Cazador'  },
  { key: 'mapa',      label: '🗺️ Mapa'    },
  { key: 'en_sprint', label: '⚡ En sprint' },
]

function ideaEmoji(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('plomero') || t.includes('hogar') || t.includes('servicio')) return '🔧'
  if (t.includes('contab') || t.includes('fiscal') || t.includes('finanza'))  return '💼'
  if (t.includes('newsletter') || t.includes('contenido') || t.includes('blog')) return '📰'
  if (t.includes('app') || t.includes('software') || t.includes('saas'))      return '💻'
  return '💡'
}

export function BancoPage({ ideas: initialIdeas, initialFilter, caminoId }: Props) {
  const router                        = useRouter()
  const [ideas, setIdeas]             = useState(initialIdeas)
  const [filtro, setFiltro]           = useState<FiltroKey>(initialFilter ?? 'todas')
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState({ title: '', description: '', business_model: '' })
  const [formError, setFormError]     = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const selectedCamino = caminoId ? CAMINOS.find(c => c.id === caminoId) : null
  const selectedCaminoExists = selectedCamino
    ? ideas.some(i => i.source === 'mapa' && i.title === selectedCamino.titulo && i.status !== 'descartada')
    : false

  const filtered = ideas.filter(i => {
    if (filtro === 'todas')     return true
    if (filtro === 'en_sprint') return i.status === 'en_sprint'
    return i.source === filtro
  })

  const handleCreate = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Título y descripción son requeridos')
      return
    }
    setFormError(null)
    startTransition(async () => {
      const input: CreateIdeaInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        source: 'manual',
      }
      if (form.business_model) input.business_model = form.business_model as BusinessModel
      const result = await createIdea(input)
      if (result.ok) {
        setIdeas(prev => [result.data, ...prev])
        setShowModal(false)
        setForm({ title: '', description: '', business_model: '' })
      } else {
        setFormError(result.error)
      }
    })
  }

  const handleCreateFromCamino = () => {
    if (!selectedCamino || isPending || !createMapIdea) return
    setActionError(null)
    startTransition(async () => {
      const result = await createMapIdea!({ caminoId: selectedCamino.id })
      if (result.ok) {
        setIdeas(prev => prev.some(i => i.id === result.data.id) ? prev : [result.data, ...prev])
        setFiltro('mapa')
        router.replace('/ideas/banco?source=mapa')
      } else {
        setActionError(result.error)
      }
    })
  }

  const handleLaunchSprint = (idea: Idea) => {
    setActionError(null)
    startTransition(async () => {
      if (idea.status === 'en_sprint') {
        const active = await getActiveSprintForIdea(idea.id)
        if (active.ok && active.data) {
          router.push(`/ideas/sprint/${active.data.id}`)
        } else {
          setActionError(active.ok ? 'No encontré el sprint activo.' : active.error)
        }
        return
      }
      const result = await generateSprint(idea.id)
      if (result.ok) {
        setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: 'en_sprint' as const } : i))
        router.push(`/ideas/sprint/${result.data.id}`)
      } else {
        setActionError(result.error)
      }
    })
  }

  const handleDiscard = (idea: Idea) => {
    if (isPending) return
    setActionError(null)
    startTransition(async () => {
      const result = await discardIdea(idea.id, 'Descartada desde Banco de Ideas')
      if (result.ok) setIdeas(prev => prev.map(i => i.id === idea.id ? result.data : i))
      else setActionError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        onClick={() => router.push('/ideas')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
      >
        ← Volver
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>Mis Ideas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Elige una idea para lanzar tu sprint personalizado</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #2E7D52 0%, #1A5038 100%)',
            color: '#fff',
            border: '1px solid rgba(77,201,138,0.25)',
            borderRadius: 12,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 4px 16px rgba(46,125,82,0.3)',
          }}
        >
          + Nueva
        </button>
      </div>

      {/* Filtros */}
      <div className="fc-tabs">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`fc-tab ${filtro === f.key ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Camino banner */}
      {selectedCamino && !selectedCaminoExists && (
        <div style={{ background: 'rgba(198,155,48,0.10)', border: '1px solid rgba(198,155,48,0.25)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{selectedCamino.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>{selectedCamino.titulo}</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>{selectedCamino.desc}</p>
            </div>
          </div>
          {createMapIdea && (
            <button
              onClick={handleCreateFromCamino}
              disabled={isPending}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #2E7D52 0%, #1A5038 100%)',
                color: '#fff',
                border: '1px solid rgba(77,201,138,0.25)',
                borderRadius: 12,
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              ⚡ Explorar este camino
            </button>
          )}
        </div>
      )}

      {actionError && (
        <p style={{ fontSize: 12, color: 'var(--text-red)', fontFamily: 'var(--font-sans)', padding: '0 4px' }}>{actionError}</p>
      )}

      {/* Ideas list */}
      {filtered.length === 0 ? (
        <div className="fc-empty-state">
          <div style={{ marginBottom: 4, fontSize: 22 }}>💡</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>No hay ideas aquí aún. Usa el Cazador o crea una manualmente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(idea => (
            <div key={idea.id} className="glass p-4">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{ideaEmoji(idea.title)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>{idea.title}</span>
                    {idea.potential_score != null && (
                      <span style={{ flexShrink: 0, background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)', borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, border: '1px solid rgba(58,158,106,0.25)' }}>
                        {idea.potential_score}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                    {idea.description ?? idea.concept ?? ''}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ background: STATUS_COLOR[idea.status] + '18', color: STATUS_COLOR[idea.status], border: `1px solid ${STATUS_COLOR[idea.status]}30`, borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      {STATUS_LABEL[idea.status]}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      {SOURCE_LABEL[idea.source]}
                    </span>
                  </div>
                </div>
              </div>

              {idea.status !== 'descartada' && idea.status !== 'promovida' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleLaunchSprint(idea)}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      background: idea.status === 'en_sprint'
                        ? 'rgba(198,155,48,0.14)'
                        : 'rgba(58,158,106,0.12)',
                      border: idea.status === 'en_sprint'
                        ? '1px solid rgba(198,155,48,0.35)'
                        : '1px solid rgba(58,158,106,0.25)',
                      borderRadius: 12,
                      padding: '10px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: idea.status === 'en_sprint' ? 'var(--text-gold)' : 'var(--green-bright)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      opacity: isPending ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {idea.status === 'en_sprint' ? 'Continuar sprint →' : '⚡ Lanzar sprint'}
                  </button>
                  <button
                    onClick={() => handleDiscard(idea)}
                    disabled={isPending}
                    title="Descartar idea"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: isPending ? 0.5 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear idea */}
      {showModal && (
        <div className="fc-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="fc-modal-sheet" style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Nueva idea</h2>
              <button onClick={() => { setShowModal(false); setFormError(null) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Consultoría de finanzas personales" className="fc-input" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Descripción *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="¿Qué problema resuelve? ¿A quién?" rows={3} className="fc-input" style={{ resize: 'none', lineHeight: 1.5 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Modelo de negocio (opcional)</label>
              <select value={form.business_model} onChange={e => setForm(p => ({ ...p, business_model: e.target.value }))} className="fc-input">
                <option value="">Seleccionar...</option>
                {BUSINESS_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>

            {formError && <p style={{ marginBottom: 12, fontSize: 11, color: 'var(--text-red)', fontFamily: 'var(--font-sans)' }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowModal(false); setFormError(null) }} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9999, padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={isPending} style={{ flex: 1, background: 'linear-gradient(135deg, #2E7D52 0%, #1A5038 100%)', border: '1px solid rgba(77,201,138,0.25)', borderRadius: 9999, padding: '12px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isPending ? 0.5 : 1, boxShadow: '0 4px 16px rgba(46,125,82,0.3)' }}>
                Crear idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
