'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Idea } from '@/modules/ideas/types'
import { IDEA_STATUSES } from '@/modules/ideas/constants'
import { getIdea, commitIdea, startValidando, startConstruyendo } from '@/modules/ideas/actions'
import { CENTSScorer } from '@/modules/ideas/components/CENTSScorer'
import { DeepDivePlan } from '@/modules/ideas/components/DeepDivePlan'
import { PromoteToOperandoModal } from '@/modules/ideas/components/PromoteToOperandoModal'
import { DiscardIdeaModal } from '@/modules/ideas/components/DiscardIdeaModal'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  generated:    { bg: '#E8F5E9', text: '#2E7D52' },
  committed:    { bg: '#E3F2FD', text: '#1565C0' },
  validando:    { bg: '#FFF8E1', text: '#F57F17' },
  construyendo: { bg: '#FCE4EC', text: '#C62828' },
  operando:     { bg: '#E8F5E9', text: '#1B5E20' },
  discarded:    { bg: '#F5F5F5', text: '#9E9E9E' },
}

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.ideaId as string

  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPromote, setShowPromote] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    getIdea(ideaId, { includeDeepDive: true }).then(result => {
      if (!result.ok) { setError(result.error); setLoading(false); return }
      setIdea(result.data)
      setLoading(false)
    })
  }, [ideaId])

  function handleTransition(action: () => Promise<{ ok: boolean; data?: Idea; error?: string }>) {
    setActionError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) { setActionError(result.error ?? 'Error'); return }
      setIdea(result.data!)
    })
  }

  if (loading) {
    return (
      <div className="p-4 pb-8 max-w-2xl mx-auto">
        <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>Cargando…</p>
      </div>
    )
  }

  if (error || !idea) {
    return (
      <div className="p-4 pb-8 max-w-2xl mx-auto">
        <p style={{ fontSize: 13, color: '#E84434', fontFamily: 'var(--font-sans)' }}>
          {error ?? 'Idea no encontrada.'}
        </p>
        <Link href="/ideas" style={{ fontSize: 13, color: '#3A9E6A', fontFamily: 'var(--font-sans)' }}>
          ← Volver a ideas
        </Link>
      </div>
    )
  }

  const statusMeta = IDEA_STATUSES.find(s => s.key === idea.status)
  const colors = STATUS_COLORS[idea.status] ?? { bg: '#F5F5F5', text: '#9E9E9E' }
  const isEditable = !['operando', 'discarded'].includes(idea.status)
  const isTerminal = ['operando', 'discarded'].includes(idea.status)

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto">
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/ideas" style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}>
          ← Ideas
        </Link>
      </div>

      {/* Hero */}
      <div
        style={{
          borderRadius: 16, padding: '20px',
          background: 'linear-gradient(135deg, #1B4332 0%, #2E7D52 100%)',
          marginBottom: 24,
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0, flex: 1 }}>
            {idea.title}
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            backgroundColor: colors.bg, color: colors.text,
            fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {statusMeta?.label ?? idea.status}
          </span>
        </div>
        {idea.concept && (
          <p style={{ fontSize: 13, color: '#A7F3D0', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
            {idea.concept}
          </p>
        )}
      </div>

      {/* CENTS */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
          Evaluación CENTS
        </h2>
        <CENTSScorer idea={idea} readOnly={!isEditable} />
      </section>

      {/* Deep Dive */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 4px' }}>
          Plan de acción
        </h2>
        <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
          7 preguntas clave para definir tu modelo de negocio.
        </p>
        <DeepDivePlan ideaId={idea.id} deepDive={idea.deep_dive ?? null} readOnly={!isEditable} />
      </section>

      {/* Error */}
      {actionError && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 12px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: '#E84434', fontFamily: 'var(--font-sans)', margin: 0 }}>{actionError}</p>
        </div>
      )}

      {/* Actions footer */}
      {!isTerminal && (
        <div className="flex flex-col gap-3">
          {idea.status === 'generated' && (
            <button
              onClick={() => handleTransition(() => commitIdea(idea.id) as Promise<{ ok: boolean; data?: Idea; error?: string }>)}
              disabled={pending}
              style={primaryBtn(pending)}
            >
              {pending ? '…' : 'Comprometerme con esta idea'}
            </button>
          )}
          {idea.status === 'committed' && (
            <button
              onClick={() => handleTransition(() => startValidando(idea.id) as Promise<{ ok: boolean; data?: Idea; error?: string }>)}
              disabled={pending}
              style={primaryBtn(pending)}
            >
              {pending ? '…' : 'Iniciar validación →'}
            </button>
          )}
          {idea.status === 'validando' && (
            <button
              onClick={() => handleTransition(() => startConstruyendo(idea.id) as Promise<{ ok: boolean; data?: Idea; error?: string }>)}
              disabled={pending}
              style={primaryBtn(pending)}
            >
              {pending ? '…' : 'Empezar a construir →'}
            </button>
          )}
          {idea.status === 'construyendo' && (
            <button
              onClick={() => setShowPromote(true)}
              style={primaryBtn(false)}
            >
              Ya está operando 🎯
            </button>
          )}
          <button
            onClick={() => setShowDiscard(true)}
            style={secondaryBtn}
          >
            Descartar esta idea
          </button>
        </div>
      )}

      {idea.status === 'operando' && (
        <div style={{
          textAlign: 'center', padding: '20px',
          backgroundColor: '#F0FBF4', borderRadius: 12,
          border: '1.5px solid #C8E6C9',
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#2E7D52', fontFamily: 'var(--font-sans)', margin: '0 0 4px' }}>
            Este negocio ya vive en tu Brújula 🎯
          </p>
          <Link href="/brujula" style={{ fontSize: 12, color: '#3A9E6A', fontFamily: 'var(--font-sans)' }}>
            Ver en Brújula →
          </Link>
        </div>
      )}

      {idea.status === 'discarded' && (
        <div style={{ padding: '16px', backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #E4EDE8' }}>
          <p style={{ fontSize: 13, color: '#9E9E9E', fontFamily: 'var(--font-sans)', margin: 0 }}>
            Descartada
            {idea.discarded_at ? ` el ${new Date(idea.discarded_at).toLocaleDateString('es')}` : ''}
            {idea.discard_reason ? `: ${idea.discard_reason}` : '.'}
          </p>
        </div>
      )}

      {showPromote && (
        <PromoteToOperandoModal
          ideaId={idea.id}
          defaultName={idea.title}
          onClose={() => setShowPromote(false)}
        />
      )}
      {showDiscard && (
        <DiscardIdeaModal
          ideaId={idea.id}
          onClose={() => setShowDiscard(false)}
        />
      )}
    </div>
  )
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
    backgroundColor: '#3A9E6A', color: '#fff', fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-sans)', cursor: 'pointer', opacity: disabled ? 0.5 : 1,
  }
}

const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 10,
  border: '1.5px solid #E4EDE8', backgroundColor: '#fff',
  color: '#E84434', fontSize: 14, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
}
