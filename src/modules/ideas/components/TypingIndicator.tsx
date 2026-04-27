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
    <div className="flex items-start gap-3 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2E7D52, #1A2520)',
          border: '1.5px solid rgba(58,158,106,0.2)',
          fontSize: 14,
        }}
      >
        🧭
      </div>

      {/* Burbuja pensando */}
      <div
        className="inline-block max-w-[85%]"
        style={{
          background: '#ffffff',
          borderRadius: '4px 18px 18px 18px',
          padding: '14px 18px',
          border: '1.5px solid #EAF0EC',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Dots animados */}
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: '#7A9A8A',
                  animation: 'bounce 1.2s ease infinite',
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
          {/* Texto contextual */}
          <span
            className="text-[12px] italic"
            style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}
          >
            {COACH_THINKING[textIndex]}
          </span>
        </div>
      </div>
    </div>
  )
}
