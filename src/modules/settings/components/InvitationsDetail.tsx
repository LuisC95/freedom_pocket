'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InvitationCode } from '../types'
import { createInvitationCode, revokeInvitationCode } from '../actions'

interface Props {
  codes: InvitationCode[]
  onBack: () => void
}

function codeStatus(code: InvitationCode): 'available' | 'used' | 'expired' {
  if (code.used_by) return 'used'
  if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired'
  return 'available'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InvitationsDetail({ codes: initialCodes, onBack }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [codes, setCodes] = useState(initialCodes)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleGenerate() {
    setError('')
    setNewCode(null)
    startTransition(async () => {
      const result = await createInvitationCode()
      if ('error' in result) {
        setError(result.error)
        return
      }
      setNewCode(result.code)
      router.refresh()
      // Optimistically prepend new code to list
      const now = new Date().toISOString()
      setCodes(prev => [
        { id: crypto.randomUUID(), code: result.code, used_by: null, used_at: null, expires_at: null, created_at: now },
        ...prev,
      ])
    })
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleRevoke(id: string) {
    if (confirmRevoke !== id) {
      setConfirmRevoke(id)
      return
    }
    setConfirmRevoke(null)
    startTransition(async () => {
      const result = await revokeInvitationCode(id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setCodes(prev => prev.filter(c => c.id !== id))
      if (newCode) {
        const removedCode = codes.find(c => c.id === id)?.code
        if (removedCode === newCode) setNewCode(null)
      }
      router.refresh()
    })
  }

  const available = codes.filter(c => codeStatus(c) === 'available').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 20px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-primary)', fontSize: 16,
          }}
        >
          ←
        </button>
        <div>
          <div className="fc-h2">Códigos de invitación</div>
          <div className="fc-caption" style={{ marginTop: 2 }}>
            {available} disponible{available !== 1 ? 's' : ''} · {codes.length} total{codes.length !== 1 ? 'es' : ''}
          </div>
        </div>
      </div>

      {/* Generar */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
            background: isPending ? 'rgba(46,125,82,0.4)' : 'var(--fc-accent)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
          }}
        >
          {isPending ? 'Generando...' : '+ Generar nuevo código'}
        </button>

        {/* Nuevo código generado */}
        {newCode && (
          <div
            className="glass"
            style={{
              marginTop: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nuevo código
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-green)', letterSpacing: '0.12em' }}>
                {newCode}
              </div>
            </div>
            <button
              onClick={() => handleCopy(newCode)}
              style={{
                background: copied === newCode ? 'rgba(46,125,82,0.2)' : 'rgba(255,255,255,0.06)',
                border: '1px solid',
                borderColor: copied === newCode ? 'rgba(46,125,82,0.4)' : 'rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 12px',
                fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {copied === newCode ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--fc-danger)', marginTop: 8, textAlign: 'center' }}>{error}</p>
        )}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {codes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎟️</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Aún no has generado ningún código
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {codes.map(code => {
              const status = codeStatus(code)
              const isAvailable = status === 'available'
              const badgeStyle: React.CSSProperties = {
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                ...(status === 'available'
                  ? { background: 'rgba(46,125,82,0.18)', color: 'var(--fc-accent)' }
                  : status === 'expired'
                    ? { background: 'rgba(232,68,52,0.15)', color: 'var(--fc-danger)' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }),
              }

              return (
                <div
                  key={code.id}
                  className="glass"
                  style={{ padding: '12px 14px', borderRadius: 12, opacity: isAvailable ? 1 : 0.65 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
                      {code.code}
                    </span>
                    <span style={badgeStyle}>
                      {status === 'available' ? 'Disponible' : status === 'expired' ? 'Expirado' : 'Usado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {status === 'used' && code.used_at
                        ? `Usado el ${formatDate(code.used_at)}`
                        : `Creado el ${formatDate(code.created_at)}`}
                    </span>

                    {isAvailable && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleCopy(code.code)}
                          style={{
                            background: copied === code.code ? 'rgba(46,125,82,0.2)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 7, padding: '4px 10px',
                            fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)',
                          }}
                        >
                          {copied === code.code ? '✓' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => handleRevoke(code.id)}
                          disabled={isPending}
                          style={{
                            background: confirmRevoke === code.id ? 'rgba(232,68,52,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${confirmRevoke === code.id ? 'rgba(232,68,52,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 7, padding: '4px 10px',
                            fontSize: 11, cursor: 'pointer',
                            color: confirmRevoke === code.id ? 'var(--fc-danger)' : 'var(--text-muted)',
                          }}
                        >
                          {confirmRevoke === code.id ? '¿Eliminar?' : 'Eliminar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
