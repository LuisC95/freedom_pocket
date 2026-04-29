'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea, CreateIdeaInput, BusinessModel } from '@/modules/ideas/types'
import { createIdea, generateSprint } from '@/modules/ideas/actions'
import { BUSINESS_MODELS } from '@/modules/ideas/constants'

interface Props {
  ideas: Idea[]
}

const STATUS_COLOR: Record<string, string> = {
  nueva:             '#2E7D52',
  en_sprint:         '#C69B30',
  sprint_completado: '#3A9E6A',
  promovida:         '#2E7D52',
  descartada:        '#E84434',
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
  { key: 'todas',    label: 'Todas'      },
  { key: 'cazador',  label: '👂 Cazador' },
  { key: 'mapa',     label: '🗺️ Mapa'   },
  { key: 'en_sprint', label: '⚡ En sprint' },
]

function IdeaEmoji(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('plomero') || t.includes('hogar') || t.includes('servicio'))   return '🔧'
  if (t.includes('contab') || t.includes('fiscal') || t.includes('finanza'))    return '💼'
  if (t.includes('newsletter') || t.includes('contenido') || t.includes('blog')) return '📰'
  if (t.includes('app') || t.includes('software') || t.includes('saas'))        return '💻'
  return '💡'
}

export function BancoPage({ ideas: initialIdeas }: Props) {
  const router                        = useRouter()
  const [ideas, setIdeas]             = useState(initialIdeas)
  const [filtro, setFiltro]           = useState<FiltroKey>('todas')
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState({ title: '', description: '', business_model: '' })
  const [formError, setFormError]     = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

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
        title:       form.title.trim(),
        description: form.description.trim(),
        source:      'manual',
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

  const handleLaunchSprint = (idea: Idea) => {
    startTransition(async () => {
      if (idea.status === 'en_sprint') {
        // Navegar al sprint existente (lo buscamos)
        router.push(`/ideas/banco/${idea.id}/sprint`)
        return
      }
      const result = await generateSprint(idea.id)
      if (result.ok) {
        setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: 'en_sprint' } : i))
        router.push(`/ideas/sprint/${result.data.id}`)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        onClick={() => router.push('/ideas')}
        className="flex items-center gap-1 pb-2 text-[13px] text-[#7A9A8A]"
      >
        ← Volver
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-[#141F19]">Mis Ideas</h1>
          <p className="text-[13px] text-[#7A9A8A]">Elige una idea para lanzar tu sprint personalizado</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 rounded-xl bg-[#2E7D52] px-3 py-2 text-[13px] font-bold text-white"
        >
          + Nueva
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all"
            style={{
              background:   filtro === f.key ? '#2E7D52' : '#fff',
              color:        filtro === f.key ? '#fff'    : '#7A9A8A',
              border:       `1px solid ${filtro === f.key ? '#2E7D52' : '#e0ebe4'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e0ebe4] px-4 py-10 text-center">
          <div className="mb-1 text-2xl">💡</div>
          <p className="text-[13px] text-[#7A9A8A]">No hay ideas aquí aún. Usa el Cazador o crea una manualmente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(idea => (
            <div key={idea.id} className="rounded-2xl border border-[#e0ebe4] bg-white p-4">
              <div className="mb-2.5 flex items-start gap-3">
                <span className="text-[26px] leading-none">{IdeaEmoji(idea.title)}</span>
                <div className="flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-bold leading-tight text-[#141F19]">{idea.title}</span>
                    {idea.potential_score != null && (
                      <span className="shrink-0 rounded-full bg-[#2E7D52]/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[#2E7D52]">
                        {idea.potential_score}
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-[12px] leading-relaxed text-[#7A9A8A]">
                    {idea.description ?? idea.concept ?? ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold"
                      style={{
                        background:  STATUS_COLOR[idea.status] + '18',
                        color:       STATUS_COLOR[idea.status],
                        borderColor: STATUS_COLOR[idea.status] + '30',
                      }}
                    >
                      {STATUS_LABEL[idea.status]}
                    </span>
                    <span className="rounded-full border border-[#7A9A8A30] bg-[#7A9A8A18] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#7A9A8A]">
                      {SOURCE_LABEL[idea.source]}
                    </span>
                  </div>
                </div>
              </div>

              {idea.status !== 'descartada' && idea.status !== 'promovida' && (
                <button
                  onClick={() => handleLaunchSprint(idea)}
                  disabled={isPending}
                  className="w-full rounded-xl py-2.5 text-[13px] font-bold transition-all disabled:opacity-50"
                  style={
                    idea.status === 'en_sprint'
                      ? { background: '#C69B3018', border: '1px solid #C69B30', color: '#C69B30' }
                      : { background: '#EAF0EC', border: '1px solid #e0ebe4', color: '#2E7D52' }
                  }
                >
                  {idea.status === 'en_sprint' ? 'Continuar sprint →' : '⚡ Lanzar sprint para esta idea'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear idea */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h2 className="mb-4 text-[16px] font-black text-[#141F19]">Nueva idea</h2>

            <div className="mb-3">
              <label className="mb-1 block text-[12px] font-semibold text-[#7A9A8A]">Título *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Consultoría de finanzas personales"
                className="w-full rounded-xl border border-[#e0ebe4] bg-[#F2F7F4] px-3 py-2.5 text-[13px] text-[#141F19] outline-none"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-[12px] font-semibold text-[#7A9A8A]">Descripción *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="¿Qué problema resuelve? ¿A quién?"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#e0ebe4] bg-[#F2F7F4] px-3 py-2.5 text-[13px] text-[#141F19] outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-[12px] font-semibold text-[#7A9A8A]">Modelo de negocio (opcional)</label>
              <select
                value={form.business_model}
                onChange={e => setForm(p => ({ ...p, business_model: e.target.value }))}
                className="w-full rounded-xl border border-[#e0ebe4] bg-[#F2F7F4] px-3 py-2.5 text-[13px] text-[#141F19] outline-none"
              >
                <option value="">Seleccionar...</option>
                {BUSINESS_MODELS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            {formError && <p className="mb-3 text-[11px] text-[#E84434]">{formError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setFormError(null) }}
                className="flex-1 rounded-xl border border-[#e0ebe4] py-2.5 text-[13px] font-semibold text-[#7A9A8A]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="flex-1 rounded-xl bg-[#2E7D52] py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                Crear idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
