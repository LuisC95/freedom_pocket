'use client'

import { useState, useTransition, useRef, useEffect, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/navigation'
import type {
  IdeaSession,
  IdeaMessage,
  Phase,
  AIProvider,
  PhaseSummariesMap,
  AssistantOption,
} from '@/modules/ideas/types'
import { PHASES, ENTRY_POINTS } from '@/modules/ideas/constants'
import {
  sendMessage,
  createIdeaFromSession,
  acceptPhaseTransition,
} from '@/modules/ideas/actions'
import { PhaseIndicator } from './PhaseIndicator'
import { MessageOptionsPicker } from './MessageOptionsPicker'
import { PhaseAdvanceSuggestion } from './PhaseAdvanceSuggestion'
import { PreviousPhaseContext } from './PreviousPhaseContext'
import { PhaseDivider } from './PhaseDivider'

interface IdeaChatProps {
  session: IdeaSession
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

function getOptimisticProvider(messages: IdeaMessage[]): AIProvider {
  const lastProvider = messages.at(-1)?.provider
  return lastProvider ?? 'anthropic'
}

export function IdeaChat({ session }: IdeaChatProps) {
  const router = useRouter()
  const availablePhases = getPhasesFromEntryPoint(session.entry_point)
  const [currentPhase, setCurrentPhase] = useState<Phase>(
    getInitialPhase(session, availablePhases)
  )
  const [allMessages, setAllMessages] = useState<IdeaMessage[]>(session.messages ?? [])
  const [phaseSummaries, setPhaseSummaries] = useState<PhaseSummariesMap>(
    session.phase_summaries ?? {}
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [advancePending, startAdvanceTransition] = useTransition()
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null)

  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveConcept, setSaveConcept] = useState('')
  const [savePending, startSaveTransition] = useTransition()

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = allMessages.filter(message => message.phase === currentPhase)
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
  const lastAssistantMeta = lastAssistant?.ui_data ?? null
  const pickerOptions =
    lastAssistantMeta?.kind !== 'phase_transition' && lastAssistantMeta?.options
      ? lastAssistantMeta.options
      : null
  const phaseReady =
    lastAssistantMeta?.kind !== 'phase_transition' && lastAssistantMeta?.phase_ready
      ? lastAssistantMeta.phase_ready
      : null
  const showSuggestion =
    !!phaseReady && !pending && dismissedSuggestion !== lastAssistant?.id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, pending, showSaveForm, advancePending])

  useEffect(() => {
    if (!pending) textareaRef.current?.focus()
  }, [pending, currentPhase, showSaveForm])

  function handlePhaseChange(phase: Phase) {
    setCurrentPhase(phase)
    setInput('')
    setError(null)
    setShowSaveForm(false)
  }

  function doSend(content: string, extraUiData?: IdeaMessage['ui_data']) {
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
      sequence_order: (allMessages.at(-1)?.sequence_order ?? 0) + 1,
      provider: getOptimisticProvider(allMessages),
      model: '',
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      response_time_ms: null,
      created_at: new Date().toISOString(),
      is_pinned: false,
      pinned_at: null,
      pinned_by: null,
      ui_data: extraUiData ?? null,
    }
    setAllMessages(prev => [...prev, optimisticMsg])

    startTransition(async () => {
      const result = await sendMessage({
        session_id: session.id,
        phase: currentPhase,
        content,
      })
      if (!result.ok) {
        setAllMessages(prev => prev.filter(message => message.id !== optimisticMsg.id))
        setError(
          result.error === 'AI_NOT_AVAILABLE'
            ? 'AI no disponible para este usuario. Contactá al admin.'
            : result.error
        )
        return
      }
      setAllMessages(prev => [
        ...prev.filter(message => message.id !== optimisticMsg.id),
        result.data.userMessage,
        result.data.assistantMessage,
      ])
    })
  }

  function handleSend() {
    doSend(input.trim())
  }

  function handleOptionPick(content: string, option: AssistantOption) {
    doSend(content, { kind: 'option_click', option_id: option.id })
  }

  function handleAcceptPhase(target: Phase) {
    if (advancePending) return
    setError(null)
    startAdvanceTransition(async () => {
      const result = await acceptPhaseTransition({
        session_id: session.id,
        from_phase: currentPhase,
        to_phase: target,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPhaseSummaries(result.data.session.phase_summaries ?? {})
      setAllMessages(prev => {
        const exists = prev.some(m => m.id === result.data.transitionMessage.id)
        return exists ? prev : [...prev, result.data.transitionMessage]
      })
      setCurrentPhase(target)
      setInput('')
    })
  }

  function handleNextPhase() {
    const currentIdx = availablePhases.indexOf(currentPhase)
    const next = availablePhases[currentIdx + 1]
    if (next) handleAcceptPhase(next)
    else setShowSaveForm(true)
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

  const isLastPhase = availablePhases.indexOf(currentPhase) === availablePhases.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E4EDE8',
          backgroundColor: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <PhaseIndicator currentPhase={currentPhase} />
        {availablePhases.length > 1 && (
          <div className="flex gap-1 overflow-x-auto mt-2">
            {availablePhases.map(phase => {
              const meta = PHASES.find(item => item.key === phase)
              return (
                <button
                  key={phase}
                  onClick={() => handlePhaseChange(phase)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontFamily: 'var(--font-sans)',
                    border: `1px solid ${currentPhase === phase ? '#3A9E6A' : '#E4EDE8'}`,
                    backgroundColor: currentPhase === phase ? '#F0FBF4' : '#fff',
                    color: currentPhase === phase ? '#3A9E6A' : '#7A9A8A',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {meta?.label ?? phase}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <PreviousPhaseContext currentPhase={currentPhase} summaries={phaseSummaries} />

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
              Enviá tu primer mensaje para empezar la conversación.
            </p>
          </div>
        )}

        {messages.map(message => {
          if (message.ui_data?.kind === 'phase_transition' && message.ui_data.from && message.ui_data.to) {
            return (
              <PhaseDivider
                key={message.id}
                from={message.ui_data.from}
                to={message.ui_data.to}
                summary={message.ui_data.summary}
              />
            )
          }
          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  minWidth: 0,
                  padding: '10px 14px',
                  borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: message.role === 'user' ? '#3A9E6A' : '#F0FBF4',
                  color: message.role === 'user' ? '#fff' : '#141F19',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere',
                }}
              >
                {message.role === 'user' ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#0F1A14' }}>{children}</strong>,
                      em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                      ul: ({ children }) => <ul style={{ margin: '4px 0 6px', paddingLeft: 18 }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '4px 0 6px', paddingLeft: 18 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                      code: ({ children }) => (
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, backgroundColor: 'rgba(46,125,82,0.1)', borderRadius: 4, padding: '1px 4px' }}>{children}</code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          )
        })}

        {pending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: '#F0FBF4',
                color: '#7A9A8A',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            >
              ...
            </div>
          </div>
        )}

        {pickerOptions && !pending && !showSaveForm && (
          <MessageOptionsPicker
            options={pickerOptions}
            disabled={pending || advancePending}
            onPick={handleOptionPick}
          />
        )}

        {showSuggestion && phaseReady && (
          <PhaseAdvanceSuggestion
            signal={phaseReady}
            currentPhase={currentPhase}
            pending={advancePending}
            onAccept={handleAcceptPhase}
            onDismiss={() => setDismissedSuggestion(lastAssistant?.id ?? null)}
          />
        )}

        {messages.length > 0 && !pending && !showSaveForm && !showSuggestion && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              onClick={handleNextPhase}
              disabled={advancePending}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                border: '1.5px solid #3A9E6A',
                backgroundColor: '#F0FBF4',
                color: '#3A9E6A',
                cursor: advancePending ? 'not-allowed' : 'pointer',
                opacity: advancePending ? 0.6 : 1,
              }}
            >
              {advancePending
                ? 'Resumiendo fase...'
                : isLastPhase
                  ? 'Guardar idea y continuar →'
                  : 'Siguiente fase →'}
            </button>
          </div>
        )}

        {showSaveForm && (
          <div
            style={{
              border: '1.5px solid #E4EDE8',
              borderRadius: 12,
              padding: '16px',
              backgroundColor: '#fff',
              marginTop: 8,
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#141F19',
                fontFamily: 'var(--font-sans)',
                margin: '0 0 12px',
              }}
            >
              Guardá tu idea
            </p>
            <input
              value={saveTitle}
              onChange={event => setSaveTitle(event.target.value)}
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
              onChange={event => setSaveConcept(event.target.value)}
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
                opacity: savePending || !saveTitle.trim() || !saveConcept.trim() ? 0.5 : 1,
              }}
            >
              {savePending ? 'Guardando...' : 'Guardar idea →'}
            </button>
          </div>
        )}

        {error && (
          <p
            style={{
              fontSize: 12,
              color: '#E84434',
              fontFamily: 'var(--font-sans)',
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {!showSaveForm && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E4EDE8',
            backgroundColor: '#fff',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={pending}
            style={{
              flex: 1,
              minWidth: 0,
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
              opacity: pending || !input.trim() ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  )
}
