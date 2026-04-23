'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { promoteToOperando } from '@/modules/ideas/actions'
import { translatePromoteError } from '@/modules/ideas/utils/error-copy'

interface PromoteToOperandoModalProps {
  ideaId: string
  defaultName: string
  onClose: () => void
}

export function PromoteToOperandoModal({ ideaId, defaultName, onClose }: PromoteToOperandoModalProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handlePromote() {
    setError(null)
    startTransition(async () => {
      const result = await promoteToOperando({ idea_id: ideaId, business_name: businessName })
      if (!result.ok) {
        setError(translatePromoteError(result.error))
        return
      }
      router.push('/brujula')
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
          ¿Listo para operar?
        </h2>
        <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Esto creará el negocio <strong style={{ color: '#141F19' }}>{businessName || '…'}</strong> en tu Brújula. Podés ajustar los detalles después.
        </p>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 6 }}>
          Nombre del negocio
        </label>
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Nombre del negocio…"
          style={{
            width: '100%', border: '1.5px solid #E4EDE8', borderRadius: 8,
            padding: '10px 12px', fontSize: 14, color: '#141F19',
            fontFamily: 'var(--font-sans)', outline: 'none',
            boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, color: '#E84434', fontFamily: 'var(--font-sans)', margin: 0 }}>{error}</p>
          </div>
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
            onClick={handlePromote}
            disabled={pending || !businessName.trim()}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              backgroundColor: '#3A9E6A', color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
              opacity: (pending || !businessName.trim()) ? 0.5 : 1,
            }}
          >
            {pending ? 'Promoviendo…' : 'Promover a operando 🎯'}
          </button>
        </div>
      </div>
    </div>
  )
}
