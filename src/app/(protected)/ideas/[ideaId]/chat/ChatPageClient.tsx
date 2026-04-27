'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Phase, IdeaMessage } from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'
import { sendMessage } from '@/modules/ideas/actions/messages'
import { completeSession } from '@/modules/ideas/actions/sessions'
import { PhaseBar } from '@/modules/ideas/components/PhaseBar'
import { ChatBubble } from '@/modules/ideas/components/ChatBubble'
import { TypingIndicator } from '@/modules/ideas/components/TypingIndicator'
import { SuggestionChips } from '@/modules/ideas/components/SuggestionChips'
import { PhaseTransition } from '@/modules/ideas/components/PhaseTransition'

const PHASE_USER_LIMITS: Record<string, number> = {
  observar: 8,
  definir: 6,
  idear: 6,
  evaluar: 10,
}

const PHASE_DESCRIPTIONS: Record<string, string> = {
  observar: 'Exploramos oportunidades que encajen con vos',
  definir: 'Delimitamos el problema concreto',
  idear: 'Generamos ideas de negocio',
  evaluar: 'Puntuamos con CENTS',
}

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
  const [showSuggestions, setShowSuggestions] = useState(false)
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

  // Scroll al último mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Contador de mensajes de usuario
  const userMsgCount = messages.filter(m => m.role === 'user').length
  const phaseLimit = PHASE_USER_LIMITS[phase] ?? 8
  const remaining = phaseLimit - userMsgCount

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
        session_id: sessionId,
        phase: phase as Phase,
        content: text,
      })

      if (!result.ok) {
        if (result.error === 'PHASE_LIMIT_REACHED') {
          setPhaseLimitReached(true)
          setSending(false)
          setIsTyping(false)

          // Completar sesión y pedir resumen
          const completeResult = await completeSession(sessionId)
          if (completeResult.ok) {
            const msgCount = messages.filter(m => m.role === 'user').length
            // Obtener resumen de la sesión ahora completada
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

  const handleContinueTransition = useCallback(async () => {
    const nextPhase = NEXT_PHASE[phase]
    if (!nextPhase) {
      router.push(`/ideas/${ideaId}`)
      return
    }

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
      style={{ background: '#F2F7F4', fontFamily: 'var(--font-sans)' }}
    >
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,82,0); }
          50% { box-shadow: 0 0 0 6px rgba(46,125,82,0.15); }
        }
      `}</style>

      {/* ── HEADER OSCURO ── */}
      <div
        className="flex-shrink-0"
        style={{
          background: '#1A2520',
          borderRadius: '0 0 20px 20px',
          padding: '52px 16px 16px',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push(`/ideas/${ideaId}`)}
            className="text-[13px] border-none cursor-pointer bg-transparent"
            style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
          >
            ←
          </button>
          <h1
            className="text-[15px] font-semibold truncate mx-2 text-center flex-1"
            style={{ color: '#fff', fontFamily: 'var(--font-sans)' }}
          >
            {ideaTitle}
          </h1>

          {/* Contador de mensajes */}
          <div className="flex-shrink-0 text-center" style={{ minWidth: 40 }}>
            <div
              className="font-mono text-[18px] font-bold leading-none"
              style={{
                color: remaining <= 1 ? '#E84434' : remaining <= 2 ? '#C69B30' : '#fff',
                transition: 'color 0.3s ease',
              }}
            >
              {userMsgCount}
            </div>
            <div
              className="text-[8px] font-semibold uppercase leading-tight"
              style={{ color: '#7A9A8A', letterSpacing: 1.5 }}
            >
              MSJ
            </div>
          </div>
        </div>

        {/* Fase actual */}
        <div className="text-center mb-2">
          <span
            className="text-[12px] font-semibold"
            style={{ color: '#3A9E6A', fontFamily: 'var(--font-sans)' }}
          >
            • {phaseMeta?.label ?? phase}
          </span>
          <span
            className="text-[11px] ml-2"
            style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
          >
            — {PHASE_DESCRIPTIONS[phase] ?? ''}
          </span>
        </div>

        {/* PhaseBar */}
        <PhaseBar currentPhase={phase as Phase} completedPhases={completedPhases as Phase[]} />
      </div>

      {/* ── CHAT SCROLLABLE ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2" style={{ scrollBehavior: 'smooth' }}>
        {/* Chip de fase actual */}
        {phaseMeta && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] mb-4"
            style={{
              background: 'rgba(58,158,106,0.08)',
              border: '1px solid rgba(58,158,106,0.15)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span
              className="text-[11px] font-semibold"
              style={{ color: '#3A9E6A' }}
            >
              {phaseMeta.label.toUpperCase()}
            </span>
            <span
              className="text-[10px]"
              style={{ color: '#7A9A8A' }}
            >
              · {phaseMeta.objective}
            </span>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
          />
        ))}

        {/* Typing indicator */}
        <TypingIndicator show={isTyping} />

        {error && (
          <div
            className="rounded-[10px] mb-3"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              padding: '8px 12px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <p className="text-[12px] m-0" style={{ color: '#E84434' }}>{error}</p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="flex-shrink-0" style={{ padding: '0 16px 24px' }}>
        {/* Warning de límite */}
        {remaining > 0 && remaining <= 2 && !showTransition && (
          <div
            className="rounded-[10px] mb-2"
            style={{
              background: '#FFFBE6',
              border: '1px solid #F5E6A0',
              padding: '8px 12px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <p className="text-[11px] font-medium m-0" style={{ color: '#C69B30' }}>
              ⚡ Quedan {remaining} mensajes — el coach va a cerrar esta fase con una conclusión
            </p>
          </div>
        )}

        {/* Sugerencias */}
        {!isTyping && showSuggestions && !showTransition && (
          <SuggestionChips
            phase={phase as Phase}
            show
            onSelect={handleSuggestionClick}
          />
        )}

        {/* Input */}
        <div className="flex items-end gap-2">
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
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={isInputDisabled}
            className="flex-1 resize-none outline-none rounded-[22px] border-2"
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              background: '#ffffff',
              borderColor: input.trim() ? '#2E7D52' : '#e0ebe4',
              color: '#141F19',
              lineHeight: 1.4,
              minHeight: 44,
              maxHeight: 120,
              transition: 'border-color 0.15s ease',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || isInputDisabled}
            className="flex-shrink-0 flex items-center justify-center border-none rounded-full cursor-pointer"
            style={{
              width: 44,
              height: 44,
              background: input.trim() && !isInputDisabled
                ? 'linear-gradient(135deg, #2E7D52, #1A5C3A)'
                : '#e0ebe4',
              color: input.trim() && !isInputDisabled ? '#fff' : '#7A9A8A',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s ease',
              animation: input.trim() && !isInputDisabled ? 'pulseGlow 2s infinite' : 'none',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* ── PHASE TRANSITION OVERLAY ── */}
      {showTransition && transitionSummary && (
        <PhaseTransition
          phase={phase as Phase}
          summary={transitionSummary}
          onContinue={handleContinueTransition}
        />
      )}
    </div>
  )
}
