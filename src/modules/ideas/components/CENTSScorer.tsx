'use client'

import { useState, useTransition, useRef } from 'react'
import { CENTS_DIMENSIONS, CENTS_MAX_TOTAL } from '@/modules/ideas/constants'
import type { Idea, CENTSKey } from '@/modules/ideas/types'
import { updateCENTS } from '@/modules/ideas/actions'

interface CENTSScorerProps {
  idea: Idea
  readOnly?: boolean
}

export function CENTSScorer({ idea, readOnly = false }: CENTSScorerProps) {
  const [scores, setScores] = useState<Partial<Record<CENTSKey, number>>>(() => {
    const initial: Partial<Record<CENTSKey, number>> = {}
    const raw = idea as unknown as Record<string, number | null>
    for (const dim of CENTS_DIMENSIONS) {
      const val = raw[dim.db_column]
      if (val !== null && val !== undefined) initial[dim.key] = val
    }
    return initial
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleScore(key: CENTSKey, value: number) {
    if (readOnly) return
    const next = { ...scores, [key]: value }
    setScores(next)

    clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => {
      startTransition(async () => {
        await updateCENTS({ idea_id: idea.id, scores: { [key]: value } })
      })
    }, 800)
  }

  const total = CENTS_DIMENSIONS.reduce((sum, d) => sum + (scores[d.key] ?? 0), 0)
  const filledCount = CENTS_DIMENSIONS.filter(d => scores[d.key] != null).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {filledCount}/5 completados
        </p>
        <p style={{
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)',
          color: total >= 35 ? '#3A9E6A' : total >= 25 ? '#C69B30' : '#7A9A8A',
          margin: 0,
        }}>
          {total}/{CENTS_MAX_TOTAL}
        </p>
      </div>

      {CENTS_DIMENSIONS.map(dim => {
        const score = scores[dim.key]
        const isExpanded = expanded[dim.key]

        return (
          <div key={dim.key} style={{ border: '1.5px solid #E4EDE8', borderRadius: 10, padding: '12px 14px' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {dim.label}
                </p>
                <p style={{ fontSize: 11, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                  {dim.question}
                </p>
              </div>
              {score != null && (
                <span style={{
                  fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: score >= 7 ? '#3A9E6A' : score >= 5 ? '#C69B30' : '#E84434',
                  minWidth: 28, textAlign: 'right',
                }}>
                  {score}
                </span>
              )}
            </div>

            {!readOnly && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => handleScore(dim.key, n)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, fontSize: 12,
                      fontFamily: 'var(--font-mono)', border: 'none', cursor: 'pointer',
                      fontWeight: score === n ? 700 : 400,
                      backgroundColor: score === n ? '#3A9E6A' : '#F0FBF4',
                      color: score === n ? '#fff' : '#3A9E6A',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <span style={{ fontSize: 10, color: '#B0C4BB', fontFamily: 'var(--font-sans)' }}>
                1 = {dim.anchor_low}
              </span>
              <span style={{ fontSize: 10, color: '#3A9E6A', fontFamily: 'var(--font-sans)', textAlign: 'right', maxWidth: '50%' }}>
                10 = {dim.anchor_high}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
