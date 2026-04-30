'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatContext } from '@/modules/ideas/types'
import { sendChatMessage } from '@/modules/ideas/actions/chat'

interface Message {
  role:  'user' | 'ai'
  texto: string
}

interface Props {
  context: ChatContext
}

export function MiniChat({ context }: Props) {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<Message[]>([
    { role: 'ai', texto: 'Hola 👋 ¿En qué te puedo ayudar con tu módulo de ideas?' },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  const enviar = async () => {
    if (!input.trim() || loading) return
    const texto = input.trim()
    setInput('')
    setError(null)
    setMsgs(m => [...m, { role: 'user', texto }])
    setLoading(true)

    try {
      const result = await sendChatMessage({ message: texto, context })
      if (result.ok) {
        setMsgs(m => [...m, { role: 'ai', texto: result.data.response }])
      } else {
        setError(result.error)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Burbuja flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir coach AI"
          className="ideas-mini-chat-fab fixed z-[999] flex h-[50px] w-[50px] items-center justify-center rounded-full text-xl transition-transform hover:scale-105"
          style={{
            background: 'rgba(10,20,14,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid var(--fc-gold-border)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
          }}
        >
          ✨
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div
          className="ideas-mini-chat-panel fixed z-[1000] flex flex-col overflow-hidden"
          style={{
            width: 'min(340px, calc(100vw - 32px))',
            maxHeight: 'min(520px, calc(100dvh - 128px))',
            borderRadius: 20,
            background: 'rgba(8,20,13,0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ background: 'rgba(10,25,16,0.90)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(198,155,48,0.20)', border: '1px solid rgba(198,155,48,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                ✨
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Coach AI</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {context.screen === 'sprint' ? 'Sprint activo' : `Ideas · ${context.screen}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', padding: 6, lineHeight: 0 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '9px 12px',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.role === 'user' ? 'rgba(46,125,82,0.85)' : 'rgba(255,255,255,0.07)',
                    border: m.role === 'user' ? '1px solid rgba(77,201,138,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', animation: 'bounce 1s infinite', animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-red)', fontFamily: 'var(--font-sans)' }}>{error}</p>}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribe tu duda..."
              className="fc-input"
              style={{ padding: '8px 10px', fontSize: 12 }}
            />
            <button
              onClick={enviar}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #2E7D52 0%, #1A5038 100%)',
                color: '#fff',
                border: '1px solid rgba(77,201,138,0.25)',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              →
            </button>
          </div>

          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
        </div>
      )}
    </>
  )
}
