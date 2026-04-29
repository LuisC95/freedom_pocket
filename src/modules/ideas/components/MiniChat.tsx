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
  const [open, setOpen]         = useState(false)
  const [msgs, setMsgs]         = useState<Message[]>([
    { role: 'ai', texto: 'Hola 👋 ¿En qué te puedo ayudar con tu módulo de ideas?' },
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)

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
          className="fixed bottom-[76px] right-4 z-[999] flex h-[50px] w-[50px] items-center justify-center rounded-full text-xl shadow-lg transition-transform hover:scale-105"
          style={{ background: '#1A2520', border: '2px solid #C69B30' }}
        >
          ✨
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div
          className="fixed bottom-[76px] right-4 z-[1000] flex w-[300px] max-h-[420px] flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{ border: '1px solid #e0ebe4', background: '#fff' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1A2520] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-sm" style={{ background: '#C69B3030' }}>
                ✨
              </div>
              <div>
                <div className="text-[12px] font-bold text-white">Coach AI</div>
                <div className="text-[10px] text-[#7A9A8A]">
                  {context.screen === 'sprint' ? 'Sprint activo' : `Ideas · ${context.screen}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-lg leading-none text-[#7A9A8A]"
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className="flex"
                style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div
                  className="max-w-[82%] px-3 py-2 text-[12px] leading-relaxed"
                  style={{
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background:   m.role === 'user' ? '#2E7D52' : '#EAF0EC',
                    color:        m.role === 'user' ? '#fff'     : '#141F19',
                  }}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[14px_14px_14px_4px] bg-[#EAF0EC] px-3 py-2.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7A9A8A]"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-[11px] text-[#E84434]">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-[#e0ebe4] px-3 py-2.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribe tu duda..."
              className="flex-1 rounded-xl border border-[#e0ebe4] px-2.5 py-2 text-[12px] text-[#141F19] outline-none"
            />
            <button
              onClick={enviar}
              disabled={loading}
              className="rounded-xl bg-[#2E7D52] px-3 py-2 text-[13px] text-white disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
