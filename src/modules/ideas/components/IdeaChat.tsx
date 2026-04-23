'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { IdeaSession, IdeaMessage, Phase, AIProvider } from '@/modules/ideas/types'
import { PHASES, ENTRY_POINTS } from '@/modules/ideas/constants'
import {
  sendMessage,
  createIdeaFromSession,
  toggleMessagePin,
} from '@/modules/ideas/actions'
import { PhaseIndicator } from './PhaseIndicator'

interface IdeaChatProps {
  session: IdeaSession
}

function getOptimisticProvider(session: IdeaSession): AIProvider {
  const lastProvider = session.messages?.at(-1)?.provider
  return lastProvider ?? 'anthropic'
}

function getPhasesFromEntryPoint(entryPoint: string): Phase[] {
  const ep = ENTRY_POINTS.find(e => e.key === entryPoint)
  const startPhase = (ep?.start_phase ?? 'observar') as Phase
  const startOrder = PHASES.find(p => p.key === startPhase)?.order ?? 1
  return PHASES.filter(p => p.order >= startOrder).map(p => p.key as Phase)
}

function getInitialPhase(session: IdeaSession, availablePhases: Phase[]): Phase {
  if (availablePhases.includes(session.current_phase)) return session.current_phase

  const lastPhase = session.messages?.at(-1)?.phase
  if (lastPhase && availablePhases.includes(lastPhase)) return lastPhase

  return availablePhases[0]
}

function getPhaseLabel(phase: Phase): string {
  return PHASES.find(item => item.key === phase)?.label ?? phase
}

export function IdeaChat({ session }: IdeaChatProps) {
  const router = useRouter()
  const availablePhases = getPhasesFromEntryPoint(session.entry_point)
  const [currentPhase, setCurrentPhase] = useState<Phase>(
    getInitialPhase(session, availablePhases)
  )
  const [messages, setMessages] = useState<IdeaMessage[]>(session.messages ?? [])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [pinPending, startPinTransition] = useTransition()

  const [showSaveForm, setShowSaveForm] = useState(Boolean(session.ready_to_save))
  const [saveTitle, setSaveTitle] = useState('')
  const [saveConcept, setSaveConcept] = useState('')
  const [savePending, startSaveTransition] = useTransition()

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending, pinPending, showSaveForm])

  useEffect(() => {
    if (!pending) textareaRef.current?.focus()
  }, [pending])

  function handleSend() {
    const content = input.trim()
    if (!content || pending) return

    setError(null)
    setInput('')

    const optimisticMsg: IdeaMessage = {
      id: `opt-${Date.now()}`,
      session_id: session.id,
      user_id: session.user_id,
      role: 'user',
      content,
      phase: currentPhase,
      sequence_order: (messages.at(-1)?.sequence_order ?? 0) + 1,
      provider: getOptimisticProvider(session),
      model: '',
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      response_time_ms: null,
      created_at: new Date().toISOString(),
      is_pinned: false,
      pinned_at: null,
      pinned_by: null,
    }

    setMessages(prev => [...prev, optimisticMsg])

    startTransition(async () => {
      const result = await sendMessage({
        session_id: session.id,
        phase: currentPhase,
        content,
      })

      if (!result.ok) {
        setMessages(prev => prev.filter(message => message.id !== optimisticMsg.id))
        setError(
          result.error === 'AI_NOT_AVAILABLE'
            ? 'AI no disponible para este usuario. Contacta al admin.'
            : result.error
        )
        return
      }

      setMessages(prev => [
        ...prev.filter(message => message.id !== optimisticMsg.id),
        result.data.userMessage,
        result.data.assistantMessage,
      ])
      setCurrentPhase(result.data.activePhase)
      setShowSaveForm(result.data.readyToSave)
    })
  }

  function handleTogglePin(message: IdeaMessage) {
    if (message.id.startsWith('opt-')) return

    setError(null)
    const previousPinned = message.is_pinned
    const nextPinned = !previousPinned

    setMessages(prev =>
      prev.map(item =>
        item.id === message.id
          ? {
              ...item,
              is_pinned: nextPinned,
              pinned_at: nextPinned ? new Date().toISOString() : null,
              pinned_by: nextPinned ? session.user_id : null,
            }
          : item
      )
    )

    startPinTransition(async () => {
      const result = await toggleMessagePin({
        message_id: message.id,
        is_pinned: nextPinned,
      })

      if (!result.ok) {
        setMessages(prev =>
          prev.map(item =>
            item.id === message.id
              ? {
                  ...item,
                  is_pinned: previousPinned,
                  pinned_at: message.pinned_at,
                  pinned_by: message.pinned_by,
                }
              : item
          )
        )
        setError(result.error)
        return
      }

      setMessages(prev =>
        prev.map(item => (item.id === message.id ? result.data : item))
      )
    })
  }

  function handleSaveIdea() {
    if (!saveTitle.trim() || !saveConcept.trim()) return

    startSaveTransition(async () => {
      const result = await createIdeaFromSession({
        session_id: session.id,
        title: saveTitle.trim(),
        concept: saveConcept.trim(),
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/ideas/${result.data.id}`)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E4EDE8',
        backgroundColor: '#fff',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <PhaseIndicator currentPhase={currentPhase} />
        <p style={{
          margin: '8px 0 0',
          fontSize: 12,
          color: '#7A9A8A',
          fontFamily: 'var(--font-sans)',
        }}>
          Contexto de AI: mensajes fijados + ventana temporal de 72h.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
              Envia tu primer mensaje para empezar la conversación.
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const previousPhase = index > 0 ? messages[index - 1].phase : null
          const showPhaseDivider = msg.role === 'assistant' && msg.phase !== previousPhase

          return (
            <div key={msg.id}>
              {showPhaseDivider && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <div style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    backgroundColor: '#F0FBF4',
                    border: '1px solid #D7EADD',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#3A9E6A',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    Nueva fase: {getPhaseLabel(msg.phase)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: msg.role === 'user' ? '#3A9E6A' : '#F0FBF4',
                    color: msg.role === 'user' ? '#fff' : '#141F19',
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>

                  <div style={{
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 8,
                  }}>
                    {msg.is_pinned && (
                      <span style={{
                        fontSize: 11,
                        color: '#3A9E6A',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                      }}>
                        Fijo en contexto
                      </span>
                    )}
                    {!msg.id.startsWith('opt-') && (
                      <button
                        type="button"
                        disabled={pinPending}
                        onClick={() => handleTogglePin(msg)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          fontSize: 11,
                          color: '#7A9A8A',
                          fontFamily: 'var(--font-sans)',
                          cursor: pinPending ? 'default' : 'pointer',
                          opacity: pinPending ? 0.6 : 1,
                        }}
                      >
                        {msg.is_pinned ? 'Desfijar' : 'Fijar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {pending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 16px',
              borderRadius: '16px 16px 16px 4px',
              backgroundColor: '#F0FBF4',
              color: '#7A9A8A',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}>
              ...
            </div>
          </div>
        )}

        {showSaveForm && (
          <div style={{
            border: '1.5px solid #E4EDE8',
            borderRadius: 12,
            padding: '16px',
            backgroundColor: '#fff',
            marginTop: 8,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>
              La idea ya está lista para guardarse
            </p>
            <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
              Pone un título y una descripción breve para convertir esta conversación en una idea.
            </p>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="Título de la idea..."
              style={{
                width: '100%',
                border: '1.5px solid #E4EDE8',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                color: '#141F19',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 8,
              }}
            />
            <textarea
              value={saveConcept}
              onChange={e => setSaveConcept(e.target.value)}
              placeholder="Concepto en una frase..."
              rows={2}
              style={{
                width: '100%',
                border: '1.5px solid #E4EDE8',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                color: '#141F19',
                fontFamily: 'var(--font-sans)',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            <button
              onClick={handleSaveIdea}
              disabled={savePending || !saveTitle.trim() || !saveConcept.trim()}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 9,
                border: 'none',
                backgroundColor: '#3A9E6A',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                opacity: (savePending || !saveTitle.trim() || !saveConcept.trim()) ? 0.5 : 1,
              }}
            >
              {savePending ? 'Guardando...' : 'Guardar idea ->'}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#E84434', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {!showSaveForm && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #E4EDE8',
          backgroundColor: '#fff',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={pending}
            style={{
              flex: 1,
              border: '1.5px solid #E4EDE8',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 13,
              color: '#141F19',
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              backgroundColor: '#fff',
              lineHeight: 1.5,
              opacity: pending ? 0.6 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={pending || !input.trim()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#3A9E6A',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: (pending || !input.trim()) ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            ^
          </button>
        </div>
      )}
    </div>
  )
}
