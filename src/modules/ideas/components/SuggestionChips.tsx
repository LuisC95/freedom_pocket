'use client'

import { useCallback } from 'react'
import type { Phase } from '@/modules/ideas/types'

const SUGGESTIONS: Record<string, string[]> = {
  observar: ['Contame más sobre ese sector', '¿Qué habilidades tengo?', 'No sé por dónde empezar'],
  definir:  ['El problema principal es...', 'Los más afectados son...', 'Todavía no lo tengo claro'],
  idear:    ['Me resuena la primera', '¿Podés darme más opciones?', 'Quiero combinar ideas'],
  evaluar:  ['¿Cómo arranco esta semana?', 'Necesito más tiempo para pensarlo', 'Estoy listo para puntuar'],
}

interface SuggestionChipsProps {
  phase: Phase
  show: boolean
  onSelect: (text: string) => void
}

export function SuggestionChips({ phase, show, onSelect }: SuggestionChipsProps) {
  const chips = SUGGESTIONS[phase] ?? SUGGESTIONS.observar

  const handleClick = useCallback((text: string) => {
    onSelect(text)
  }, [onSelect])

  if (!show) return null

  return (
    <div
      className="flex flex-wrap gap-2 px-1 mb-2"
      style={{
        animation: 'slideUp 0.25s ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => handleClick(chip)}
          className="text-[12px] font-medium border-none rounded-[20px] cursor-pointer whitespace-nowrap transition-all"
          style={{
            color: '#2E7D52',
            background: 'rgba(46,125,82,0.08)',
            padding: '6px 14px',
            fontFamily: 'var(--font-sans)',
            border: '1px solid rgba(46,125,82,0.15)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(46,125,82,0.15)'
            e.currentTarget.style.borderColor = 'rgba(46,125,82,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(46,125,82,0.08)'
            e.currentTarget.style.borderColor = 'rgba(46,125,82,0.15)'
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
