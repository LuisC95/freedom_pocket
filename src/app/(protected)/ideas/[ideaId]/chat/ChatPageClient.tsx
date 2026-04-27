'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Phase, IdeaMessage } from '@/modules/ideas/types'
import { PHASES, PHASE_DESCRIPTIONS, PHASE_COLORS, MESSAGE_LIMITS } from '@/modules/ideas/constants'
import { sendMessage } from '@/modules/ideas/actions/messages'
import { completeSession, createSession } from '@/modules/ideas/actions/sessions'
import { PhaseBar } from '@/modules/ideas/components/PhaseBar'
import { ChatBubble } from '@/modules/ideas/components/ChatBubble'
import { TypingIndicator } from '@/modules/ideas/components/TypingIndicator'
import { SuggestionChips } from '@/modules/ideas/components/SuggestionChips'
import { PhaseTransition } from '@/modules/ideas/components/PhaseTransition'

const NEXT_PHASE: Record<string, Phase | null> = {
  observar: 'definir',
  definir: 'idear',
  idear: 'evaluar',
  evaluar: null,
}

interface RawMessageRow {
  id: string
  role: string
  content: string
  phase: string
  sequence_order: number
  created_at: string
}

interface SendMessageResult {
  userMessage: IdeaMessage
  assistantMessage: IdeaMessage
  activePhase: string
  phaseChanged: boolean
  readyToSave: boolean
  phaseSuggestion: { target: string; reason: string } | null
}

interface ChatPageClientProps {
  ideaId: string
  ideaTitle: string
  sessionId: string
  initialPhase: string
  completedPhases: string[]
  initialMessages: RawMessageRow[]
}

export function ChatPageClient({
  ideaId,
  ideaTitle,
  sessionId,
  initialPhase,
  completedPhases: initialCompletedPhases,
  initialMessages,
}: ChatPageClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<RawMessageRow[]>(initialMessages)
  const [phase, setPhase] = useState<string>(initialPhase)
  const [completedPhases, setCompletedPhases] = useState<string[]>(initialCompletedPhases)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(initialMessages.length > 0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [phaseLimitReached, setPhaseLimitReached] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [transitionSummary, setTransitionSummary] = useState<{
    insight: string
    next: string
    centsProgress: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const userMsgCount = messages.filter(m => m.role === 'user').length
  const phaseLimit = MESSAGE_LIMITS[phase] ?? 6
  const remaining = Math.max(0, phaseLimit - userMsgCount)

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setSending(true)
    setIsTyping(true)
    setShowSuggestions(false)
    setShowTransition(false)
    setError(null)

    try {
      const result = await sendMessage({
        session_id: currentSessionId,
        phase: phase as Phase,
        content: text,
      })

      if (!result.ok) {
        if (result.error === 'PHASE_LIMIT_REACHED') {
          setPhaseLimitReached(true)
          setSending(false)
          setIsTyping(false)

          const completeResult = await completeSession(currentSessionId)
          if (completeResult.ok) {
            setShowTransition(true)
            setTransitionSummary({
              insight: '¡Fase completada! Revisemos lo que descubrimos.',
              next: NEXT_PHASE[phase]
                ? `Empezar fase ${PHASES.find(p => p.key === NEXT_PHASE[phase])?.label ?? NEXT_PHASE[phase]}`
                : 'Embudo completo',
              centsProgress: Math.min(userMsgCount * 15, 90),
            })
          }
          return
        }
        setError(result.error ?? 'Error al enviar mensaje')
        setSending(false)
        setIsTyping(false)
        return
      }

      const data = result.data as unknown as SendMessageResult
      const newMsgs: RawMessageRow[] = [
        {
          id: data.userMessage.id,
          role: 'user',
          content: data.userMessage.content,
          phase: data.activePhase,
          sequence_order: messages.length + 1,
          created_at: new Date().toISOString(),
        },
        {
          id: data.assistantMessage.id,
          role: 'assistant',
          content: data.assistantMessage.content,
          phase: data.activePhase,
          sequence_order: messages.length + 2,
          created_at: new Date().toISOString(),
        },
      ]
      setMessages(prev => [...prev, ...newMsgs])
    } catch {
      setError('Error de conexión')
    }

    setSending(false)
    setIsTyping(false)
    setShowSuggestions(true)
  }, [input, sending, sessionId, phase, messages, userMsgCount])

  const [currentSessionId, setCurrentSessionId] = useState(sessionId)

  const handleContinueTransition = useCallback(async () => {
    const nextPhase = NEXT_PHASE[phase]
    if (!nextPhase) {
      router.push(`/ideas/${ideaId}`)
      return
    }

    // Crear nueva sesión en DB para la fase siguiente
    const sessionResult = await createSession({
      idea_id: ideaId,
      entry_point: 'sin_idea',
      phase: nextPhase,
    })

    if (!sessionResult.ok) {
      setError('Error al crear la nueva sesión')
      return
    }

    setCurrentSessionId(sessionResult.data.id)
    setCompletedPhases(prev => [...prev, phase])
    setPhase(nextPhase)
    setPhaseLimitReached(false)
    setShowTransition(false)
    setTransitionSummary(null)
    setShowSuggestions(true)
    setMessages([])
    setInput('')
  }, [phase, router, ideaId])

  const handleSuggestionClick = useCallback((text: string) => {
    setInput(text)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const phaseMeta = PHASES.find(p => p.key === phase)
  const isInputDisabled = sending || showTransition

  return (
    <div
      className="flex flex-col h-screen max-w-[480px] mx-auto"
      style={{
        background: '#F2F7F4',
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 2px 12px rgba(46,125,82,0.35); }
          50% { box-shadow: 0 2px 20px rgba(46,125,82,0.55); }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0"
        style={{
          background: '#1A2520',
          borderRadius: '0 0 20px 20px',
          padding: '52px 16px 6px',
        }}
      >
        {/* Top row */}
        <div className="flex items-center mb-[6px]">
          {/* Back circle */}
          <button
            onClick={() => router.push(`/ideas/${ideaId}`)}
            className="flex-shrink-0 flex items-center justify-center border-none cursor-pointer"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              fontSize: 16,
              color: '#fff',
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            ←
          </button>

          {/* Title + phase */}
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <h1
              className="text-[15px] font-semibold truncate max-w-[220px] m-0"
              style={{
                color: '#fff',
                fontFamily: '"IBM Plex Sans", sans-serif',
              }}
            >
              {ideaTitle}
            </h1>
            {phaseMeta && (
              <span
                className="text-[11px]"
                style={{ color: '#7A9A8A', fontFamily: '"IBM Plex Sans", sans-serif' }}
              >
                <span style={{ color: PHASE_COLORS[phase] }}>•</span>{' '}
                {phaseMeta.label}{' '}
                <span style={{ color: '#7A9A8A' }}>
                  — {PHASE_DESCRIPTIONS[phase]}
                </span>
              </span>
            )}
          </div>

          {/* Remaining pill */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                remaining <= 1
                  ? 'rgba(232,68,52,0.15)'
                  : remaining <= 2
                    ? 'rgba(198,155,48,0.15)'
                    : 'rgba(255,255,255,0.08)',
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            <span
              className="text-[18px] font-bold leading-none"
              style={{
                color:
                  remaining <= 1
                    ? '#E84434'
                    : remaining <= 2
                      ? '#C69B30'
                      : '#fff',
                transition: 'color 0.3s ease',
              }}
            >
              {remaining}
            </span>
            <span
              className="text-[8px] font-semibold uppercase leading-tight"
              style={{ color: '#7A9A8A', letterSpacing: 1.5 }}
            >
              msj
            </span>
          </div>
        </div>

        {/* PhaseBar in dark section */}
        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12,
            marginTop: 10,
            padding: '12px 0',
          }}
        >
          <PhaseBar
            currentPhase={phase as Phase}
            completedPhases={completedPhases as Phase[]}
          />
        </div>
      </div>

      {/* ── CHAT ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Phase chip (first message) */}
        {phaseMeta && messages.length === 0 && !isTyping && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] mb-4"
            style={{
              background: 'rgba(58,158,106,0.08)',
              border: '1px solid rgba(58,158,106,0.15)',
            }}
          >
            <span className="text-[11px] font-semibold" style={{ color: '#3A9E6A' }}>
              {phaseMeta.label.toUpperCase()}
            </span>
            <span className="text-[10px]" style={{ color: '#7A9A8A' }}>
              · {phaseMeta.objective}
            </span>
          </div>
        )}

        {/* Welcome message */}
        {messages.length === 0 && !isTyping && (
          <ChatBubble
            role="assistant"
            content="Hola. Vamos a explorar esta idea desde cero. ¿Qué fue lo que te hizo pensar en esto — una experiencia propia, algo que viste, o algo que alguien te contó?"
          />
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
          />
        ))}

        <TypingIndicator show={isTyping} />

        {error && (
          <div
            className="rounded-[10px] mb-3"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              padding: '8px 12px',
            }}
          >
            <p className="text-[12px] m-0" style={{ color: '#E84434' }}>
              {error}
            </p>
          </div>
        )}

        <div ref={chatEndRef} style={{ height: 8 }} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="flex-shrink-0 flex flex-col">
        {/* Warning bar */}
        {remaining > 0 && remaining <= 2 && !showTransition && (
          <div
            style={{
              background: 'rgba(198,155,48,0.08)',
              borderTop: '1px solid rgba(198,155,48,0.2)',
              padding: '8px 16px',
              fontSize: 11,
              color: '#C69B30',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            <span>⚡</span>
            Quedan {remaining} mensaje{remaining !== 1 ? 's' : ''} — el coach va a cerrar esta fase con una conclusión
          </div>
        )}

        {/* Suggestions */}
        {!isTyping && showSuggestions && !showTransition && (
          <div style={{ background: '#F2F7F4' }}>
            <SuggestionChips
              phase={phase as Phase}
              show
              onSelect={handleSuggestionClick}
            />
          </div>
        )}

        {/* Input */}
        <div
          className="flex-shrink-0"
          style={{
            padding: '10px 14px 32px',
            background: '#ffffff',
            borderTop: '1px solid #EAF0EC',
          }}
        >
          <div className="flex items-end gap-[10px]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Escribí tu respuesta..."
              rows={1}
              disabled={isInputDisabled}
              className="flex-1 resize-none outline-none border-2 rounded-[22px]"
              style={{
                padding: '10px 16px',
                fontSize: 14,
                lineHeight: 1.5,
                maxHeight: 100,
                fontFamily: '"IBM Plex Sans", sans-serif',
                background: '#F2F7F4',
                color: '#141F19',
                borderColor: input.trim() ? '#2E7D52' : '#EAF0EC',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || isInputDisabled}
              className="flex-shrink-0 flex items-center justify-center border-none rounded-full"
              style={{
                width: 42,
                height: 42,
                background:
                  input.trim() && !isInputDisabled
                    ? 'linear-gradient(135deg, #2E7D52, #1A5C3A)'
                    : '#EAF0EC',
                color:
                  input.trim() && !isInputDisabled ? '#fff' : '#7A9A8A',
                fontSize: 18,
                lineHeight: 1,
                fontFamily: '"IBM Plex Sans", sans-serif',
                cursor:
                  input.trim() && !isInputDisabled ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                boxShadow:
                  input.trim() && !isInputDisabled
                    ? '0 2px 12px rgba(46,125,82,0.35)'
                    : 'none',
                animation:
                  input.trim() && !isInputDisabled
                    ? 'pulseGlow 2s infinite'
                    : 'none',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ── PHASE TRANSITION ── */}
      {showTransition && transitionSummary && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{ maxWidth: 480, margin: '0 auto' }}
        >
          <PhaseTransition
            phase={phase as Phase}
            summary={transitionSummary}
            onContinue={handleContinueTransition}
          />
        </div>
      )}
    </div>
  )
}
