'use client'

import { useState, useRef } from 'react'
import { DEEP_DIVE_FIELDS } from '@/modules/ideas/constants'
import type { IdeaDeepDive, DeepDiveField } from '@/modules/ideas/types'
import { upsertDeepDiveField } from '@/modules/ideas/actions'

interface DeepDivePlanProps {
  ideaId: string
  deepDive: IdeaDeepDive | null
  readOnly?: boolean
}

export function DeepDivePlan({ ideaId, deepDive, readOnly = false }: DeepDivePlanProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of DEEP_DIVE_FIELDS) {
      init[f.key] = (deepDive as Record<string, unknown> | null)?.[f.key] as string ?? ''
    }
    return init
  })
  const [aiNotes, setAiNotes] = useState<string>(
    ((deepDive as Record<string, unknown> | null)?.ai_notes as string) ?? ''
  )
  const [showAiNotes, setShowAiNotes] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const filledCount = DEEP_DIVE_FIELDS.filter(f => values[f.key]?.trim()).length

  function handleChange(key: string, value: string) {
    if (readOnly) return
    setValues(prev => ({ ...prev, [key]: value }))
    clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(async () => {
      setSaving(prev => ({ ...prev, [key]: true }))
      await upsertDeepDiveField({ idea_id: ideaId, field: key as DeepDiveField, value })
      setSaving(prev => ({ ...prev, [key]: false }))
    }, 800)
  }

  async function handleAiNotesBlur() {
    if (readOnly) return
    setSaving(prev => ({ ...prev, ai_notes: true }))
    await upsertDeepDiveField({ idea_id: ideaId, field: 'ai_notes', value: aiNotes })
    setSaving(prev => ({ ...prev, ai_notes: false }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {filledCount}/7 completados
        </p>
        {filledCount === 7 && (
          <span style={{ fontSize: 11, color: '#3A9E6A', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            ✓ Plan completo
          </span>
        )}
      </div>

      {DEEP_DIVE_FIELDS.map(field => (
        <div key={field.key}>
          <div className="flex items-center justify-between mb-1">
            <label style={{ fontSize: 13, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)' }}>
              {field.label}
            </label>
            {saving[field.key] && (
              <span style={{ fontSize: 10, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>guardando…</span>
            )}
            {!saving[field.key] && values[field.key]?.trim() && (
              <span style={{ fontSize: 10, color: '#3A9E6A', fontFamily: 'var(--font-sans)' }}>✓</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 4px' }}>
            {field.question}
          </p>
          <textarea
            value={values[field.key]}
            onChange={e => handleChange(field.key, e.target.value)}
            readOnly={readOnly}
            rows={3}
            placeholder={readOnly ? '—' : 'Escribí tu respuesta…'}
            style={{
              width: '100%', border: `1.5px solid ${values[field.key]?.trim() ? '#C8E6C9' : '#E4EDE8'}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#141F19',
              fontFamily: 'var(--font-sans)', resize: 'none',
              backgroundColor: readOnly ? '#FAFAFA' : '#fff', outline: 'none',
              boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>
      ))}

      <div style={{ borderTop: '1px solid #E4EDE8', paddingTop: 6 }}>
        <button
          type="button"
          onClick={() => setShowAiNotes(prev => !prev)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            fontSize: 12,
            fontWeight: 600,
            color: '#3A9E6A',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          {showAiNotes ? 'Ocultar notas AI' : 'Ver notas AI (opcional)'}
        </button>

        {showAiNotes && (
          <div style={{ marginTop: 8 }}>
            <div className="flex items-center justify-between mb-1">
              <label style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
                Contexto extra generado por AI
              </label>
              {saving.ai_notes && (
                <span style={{ fontSize: 10, color: '#7A9A8A', fontFamily: 'var(--font-sans)' }}>
                  guardando...
                </span>
              )}
            </div>
            <textarea
              value={aiNotes}
              onChange={e => setAiNotes(e.target.value)}
              onBlur={handleAiNotesBlur}
              readOnly={readOnly}
              rows={3}
              placeholder={readOnly ? '—' : 'Notas internas de contexto...'}
              style={{
                width: '100%',
                border: '1.5px solid #E4EDE8',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: '#141F19',
                fontFamily: 'var(--font-sans)',
                resize: 'none',
                backgroundColor: readOnly ? '#FAFAFA' : '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
