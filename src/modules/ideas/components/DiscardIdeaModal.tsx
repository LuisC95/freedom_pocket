'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { discardIdea } from '@/modules/ideas/actions'

interface DiscardIdeaModalProps {
  ideaId: string
  onClose: () => void
}

export function DiscardIdeaModal({ ideaId, onClose }: DiscardIdeaModalProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDiscard() {
    setError(null)
    startTransition(async () => {
      const result = await discardIdea({ idea_id: ideaId, reason: reason || undefined })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/ideas')
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 640,
          backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
          padding: '24px 20px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>
          Descartar idea
        </h2>
        <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 16px' }}>
          Esta acción no se puede deshacer. ¿Querés dejar una nota de por qué?
        </p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="¿Por qué descartás esta idea? (opcional)"
          rows={3}
          style={{
            width: '100%', border: '1.5px solid #E4EDE8', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, color: '#141F19',
            fontFamily: 'var(--font-sans)', resize: 'none',
            backgroundColor: '#fff', outline: 'none',
            boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        {error && (
          <p style={{ fontSize: 12, color: '#E84434', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #E4EDE8',
              backgroundColor: '#fff', color: '#7A9A8A', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDiscard}
            disabled={pending}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              backgroundColor: '#E84434', color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
              opacity: pending ? 0.5 : 1,
            }}
          >
            {pending ? 'Descartando…' : 'Descartar'}
          </button>
        </div>
      </div>
    </div>
  )
}
