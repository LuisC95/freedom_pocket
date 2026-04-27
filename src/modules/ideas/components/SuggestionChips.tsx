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
      className="flex flex-wrap gap-2 px-4 pt-2 pb-1"
      style={{
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => handleClick(chip)}
          className="text-[12px] font-medium border cursor-pointer whitespace-nowrap rounded-[20px] transition-all"
          style={{
            padding: '6px 12px',
            border: '1.5px solid #EAF0EC',
            background: '#ffffff',
            color: '#141F19',
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#2E7D52'
            e.currentTarget.style.color = '#2E7D52'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#EAF0EC'
            e.currentTarget.style.color = '#141F19'
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
