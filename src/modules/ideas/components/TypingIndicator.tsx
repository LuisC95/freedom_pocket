'use client'

import { useState, useEffect } from 'react'

const COACH_THINKING = [
  'Analizando tu contexto...',
  'Procesando lo que dijiste...',
  'Construyendo la siguiente pregunta...',
  'Conectando puntos...',
]

interface TypingIndicatorProps {
  show: boolean
}

export function TypingIndicator({ show }: TypingIndicatorProps) {
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    if (!show) return
    const interval = setInterval(() => {
      setTextIndex(i => (i + 1) % COACH_THINKING.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [show])

  if (!show) return null

  return (
    <div
      className="mb-[14px]"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      {/* Coach avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2E7D52, #1A2520)',
          border: '1.5px solid rgba(58,158,106,0.3)',
          fontSize: 13,
        }}
      >
        🧭
      </div>

      {/* Burbuja pensando */}
      <div
        className="flex gap-2 items-center"
        style={{
          padding: '10px 16px',
          background: '#ffffff',
          borderRadius: '4px 18px 18px 18px',
          border: '1px solid #EAF0EC',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Dots verdes animados */}
        <div className="flex gap-[4px]">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: '#2E7D52',
                animation: 'bounce 1.2s ease infinite',
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
        {/* Texto contextual */}
        <span
          className="text-[11px] italic"
          style={{ color: '#7A9A8A', fontFamily: '"IBM Plex Sans", sans-serif' }}
        >
          {COACH_THINKING[textIndex]}
        </span>
      </div>
    </div>
  )
}
