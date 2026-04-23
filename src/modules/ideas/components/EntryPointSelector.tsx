'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ENTRY_POINTS } from '@/modules/ideas/constants'
import type { EntryPoint } from '@/modules/ideas/types'
import { createSession } from '@/modules/ideas/actions'

export function EntryPointSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<EntryPoint | null>(null)
  const [rawInput, setRawInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedPoint = ENTRY_POINTS.find(e => e.key === selected)

  function handleSelect(key: EntryPoint) {
    setSelected(key)
    setRawInput('')
    setError(null)
  }

  function handleStart() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await createSession({
        entry_point: selected,
        raw_input: rawInput || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/ideas/new?session=${result.data.id}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {ENTRY_POINTS.map(ep => (
        <button
          key={ep.key}
          onClick={() => handleSelect(ep.key)}
          style={{
            border: `2px solid ${selected === ep.key ? '#3A9E6A' : '#E4EDE8'}`,
            borderRadius: 12,
            padding: '14px 16px',
            backgroundColor: selected === ep.key ? '#F0FBF4' : '#fff',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {ep.label}
          </p>
          <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
            {ep.description}
          </p>
        </button>
      ))}

      {selectedPoint?.requires_raw_input && (
        <textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={
            selected === 'idea_vaga'
              ? 'Contame en qué estás pensando (aunque sea vago)…'
              : 'Describí tu idea en una o dos frases…'
          }
          rows={3}
          style={{
            width: '100%', border: '1.5px solid #E4EDE8', borderRadius: 10,
            padding: '10px 12px', fontSize: 13, color: '#141F19',
            fontFamily: 'var(--font-sans)', resize: 'none',
            backgroundColor: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#E84434', fontFamily: 'var(--font-sans)' }}>{error}</p>
      )}

      {selected && (
        <button
          onClick={handleStart}
          disabled={pending || (selectedPoint?.requires_raw_input && !rawInput.trim())}
          style={{
            backgroundColor: '#3A9E6A',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '13px 20px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            opacity: (pending || (selectedPoint?.requires_raw_input && !rawInput.trim())) ? 0.5 : 1,
          }}
        >
          {pending ? 'Preparando chat…' : 'Empezar →'}
        </button>
      )}
    </div>
  )
}
