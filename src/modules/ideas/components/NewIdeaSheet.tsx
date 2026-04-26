'use client'

import { useState } from 'react'

const OPTIONS = [
  { key: 'sin_idea', icon: '🧭', label: 'No sé por dónde empezar', sub: 'La AI te ayuda a encontrar ideas basadas en tus habilidades' },
  { key: 'idea_vaga', icon: '💡', label: 'Tengo algo en mente pero vago', sub: 'Refinamos juntos hasta que tenga forma' },
  { key: 'idea_clara', icon: '🎯', label: 'Tengo una idea clara', sub: 'Evaluamos directamente con el método CENTS' },
] as const

interface NewIdeaSheetProps {
  onClose: () => void
  onSelect?: (entryPoint: 'sin_idea' | 'idea_vaga' | 'idea_clara') => void
}

export function NewIdeaSheet({ onClose, onSelect }: NewIdeaSheetProps) {
  const [selected, setSelected] = useState<'sin_idea' | 'idea_vaga' | 'idea_clara' | null>(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,31,25,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full bg-white"
        style={{
          maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 40px',
          animation: 'slideUp 0.25s ease',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Handle */}
        <div className="mx-auto mb-6 rounded-full" style={{ width: 36, height: 4, background: '#e0ebe4' }} />

        <h2
          className="text-[20px] font-bold mb-[6px]"
          style={{ color: '#141F19', fontFamily: 'var(--font-sans)' }}
        >
          Nueva idea
        </h2>
        <p className="text-[13px] mb-5" style={{ color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
          ¿En qué punto estás?
        </p>

        {/* Options */}
        <div className="flex flex-col gap-[10px] mb-5">
          {OPTIONS.map(o => (
            <div
              key={o.key}
              onClick={() => setSelected(o.key)}
              className="rounded-[14px] cursor-pointer"
              style={{
                padding: '14px 16px',
                border: `2px solid ${selected === o.key ? '#2E7D52' : '#e0ebe4'}`,
                background: selected === o.key ? '#F2F7F4' : 'white',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 20 }}>{o.icon}</span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold mb-[2px]" style={{ color: '#141F19' }}>
                    {o.label}
                  </div>
                  <div className="text-[12px]" style={{ color: '#7A9A8A' }}>
                    {o.sub}
                  </div>
                </div>
                {selected === o.key && (
                  <span style={{ marginLeft: 'auto', color: '#2E7D52', fontSize: 18 }}>✓</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={() => {
            if (selected && onSelect) onSelect(selected)
          }}
          className="w-full border-none rounded-[12px] text-[15px] font-semibold cursor-pointer"
          style={{
            padding: '14px 0',
            background: selected ? '#2E7D52' : '#e0ebe4',
            color: selected ? 'white' : '#7A9A8A',
            cursor: selected ? 'pointer' : 'default',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.2s ease',
          }}
        >
          Empezar →
        </button>
      </div>
    </div>
  )
}
