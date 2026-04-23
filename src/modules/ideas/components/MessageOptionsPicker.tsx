'use client'

import { useState } from 'react'
import type { AssistantOption } from '@/modules/ideas/types'

interface MessageOptionsPickerProps {
  options: AssistantOption[]
  disabled?: boolean
  onPick: (content: string, option: AssistantOption) => void
}

export function MessageOptionsPicker({ options, disabled, onPick }: MessageOptionsPickerProps) {
  const [expanded, setExpanded] = useState<AssistantOption | null>(null)
  const [detail, setDetail] = useState('')

  function handleClick(option: AssistantOption) {
    if (disabled) return
    if (option.detail_prompt) {
      setExpanded(option)
      setDetail(`${option.label}: `)
      return
    }
    onPick(option.label, option)
  }

  function handleSubmitDetail() {
    if (!expanded) return
    const content = detail.trim()
    if (!content) return
    onPick(content, expanded)
    setExpanded(null)
    setDetail('')
  }

  if (expanded) {
    return (
      <div
        style={{
          border: '1.5px solid #E4EDE8',
          borderRadius: 12,
          padding: 12,
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: '#7A9A8A',
            fontFamily: 'var(--font-sans)',
            margin: 0,
          }}
        >
          {expanded.detail_prompt}
        </p>
        <textarea
          autoFocus
          value={detail}
          onChange={e => setDetail(e.target.value)}
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
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setExpanded(null)
              setDetail('')
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              border: '1px solid #E4EDE8',
              backgroundColor: '#fff',
              color: '#7A9A8A',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmitDetail}
            disabled={disabled || !detail.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              border: 'none',
              backgroundColor: '#3A9E6A',
              color: '#fff',
              cursor: 'pointer',
              opacity: disabled || !detail.trim() ? 0.5 : 1,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => handleClick(option)}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            border: '1.5px solid #3A9E6A',
            backgroundColor: '#fff',
            color: '#3A9E6A',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            textAlign: 'left',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
