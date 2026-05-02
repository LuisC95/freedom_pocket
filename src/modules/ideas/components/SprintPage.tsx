'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Sprint, Idea } from '@/modules/ideas/types'
import { completeDayProgress, updateDayNotes, completeSprint, abandonSprint } from '@/modules/ideas/actions/sprints'

interface Props {
  sprint: Sprint
  idea:   Idea
}

export function SprintPage({ sprint: initialSprint, idea }: Props) {
  const router                       = useRouter()
  const [sprint, setSprint]          = useState(initialSprint)
  const [diaActivo, setDiaActivo]    = useState(() => {
    const lastCompleted = (initialSprint.progress ?? []).filter(p => p.completed).length
    return Math.min(lastCompleted, 4)
  })
  const [notes, setNotes]            = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    ;(initialSprint.progress ?? []).forEach(p => { if (p.notes) map[p.day_number] = p.notes })
    return map
  })
  const [isPending, startTransition] = useTransition()

  const progress    = sprint.progress ?? []
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.day_number))
  const totalDays   = sprint.tasks_json.length
  const progresoPct = Math.round((completedIds.size / totalDays) * 100)
  const allDone     = completedIds.size === totalDays
  const dia         = sprint.tasks_json[diaActivo]

  const handleComplete = () => {
    startTransition(async () => {
      const dayNum = diaActivo + 1
      const result = await completeDayProgress({ sprintId: sprint.id, dayNumber: dayNum, notes: notes[dayNum] })
      if (result.ok) {
        setSprint(prev => {
          const existing = prev.progress ?? []
          return { ...prev, progress: [...existing.filter(p => p.day_number !== dayNum), result.data] }
        })
        if (diaActivo < totalDays - 1) setDiaActivo(d => d + 1)
      }
    })
  }

  const handleNoteBlur = (dayNum: number) => {
    if (!notes[dayNum]) return
    startTransition(async () => {
      await updateDayNotes({ sprintId: sprint.id, dayNumber: dayNum, notes: notes[dayNum] })
    })
  }

  const handleCompleteSprint = () => {
    startTransition(async () => {
      const result = await completeSprint(sprint.id)
      if (result.ok) setSprint(prev => ({ ...prev, status: 'completed' }))
    })
  }

  const handleAbandon = () => {
    startTransition(async () => {
      const result = await abandonSprint(sprint.id)
      if (result.ok) router.push('/ideas/banco')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        onClick={() => router.push('/ideas/banco')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
      >
        ← Volver
      </button>

      {/* Hero */}
      <div className="glass-hero p-5">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="fc-label-micro mb-1">Sprint · 5 días</div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>{idea.title}</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(198,155,48,0.15)', borderRadius: 8, padding: '3px 8px' }}>
              <span style={{ fontSize: 10 }}>✨</span>
              <span style={{ color: 'var(--text-gold)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Sprint generado por AI</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 52 }}>
            <div className="glow-gold" style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--text-gold)', lineHeight: 1 }}>{progresoPct}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>avance</div>
          </div>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progresoPct}%`, background: 'linear-gradient(90deg, var(--gold), var(--text-gold))', borderRadius: 999, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Day timeline */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {sprint.tasks_json.map((task, i) => {
          const done   = completedIds.has(i + 1)
          const active = i === diaActivo
          return (
            <button
              key={i}
              onClick={() => setDiaActivo(i)}
              style={{
                minWidth: 56,
                padding: '8px 6px',
                borderRadius: 12,
                background: active
                  ? 'linear-gradient(135deg, var(--fc-accent) 0%, #1F6B3E 100%)'
                  : done
                    ? 'rgba(58,158,106,0.12)'
                    : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${active ? 'rgba(77,201,138,0.4)' : done ? 'rgba(58,158,106,0.3)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active ? '0 4px 16px rgba(46,125,82,0.45), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 15 }}>{done && !active ? '✅' : task.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#fff' : done ? 'var(--green-bright)' : 'var(--text-muted)' }}>
                Día {task.day_number}
              </span>
            </button>
          )
        })}
      </div>

      {/* Día activo */}
      {dia && (
        <div className="glass p-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>{dia.emoji}</span>
            <div>
              <div className="fc-label-micro mb-1">Día {dia.day_number} · {dia.title}</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>{dia.task}</p>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>
            {dia.detail}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <span style={{ background: 'rgba(58,158,106,0.15)', color: 'var(--green-bright)', border: '1px solid rgba(58,158,106,0.25)', borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
              ⏱ {dia.duration_minutes} min
            </span>
            <span style={{ background: 'rgba(198,155,48,0.12)', color: 'var(--text-gold)', border: '1px solid rgba(198,155,48,0.2)', borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
              🎯 {dia.goal}
            </span>
          </div>

          <textarea
            value={notes[dia.day_number] ?? ''}
            onChange={e => setNotes(prev => ({ ...prev, [dia.day_number]: e.target.value }))}
            onBlur={() => handleNoteBlur(dia.day_number)}
            placeholder="Anota aquí lo que descubres en esta tarea..."
            rows={3}
            className="fc-input"
            style={{ resize: 'vertical', lineHeight: 1.6, marginBottom: 12 }}
          />

          {!completedIds.has(dia.day_number) ? (
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="fc-btn-primary"
              style={{ width: '100%', opacity: isPending ? 0.5 : 1 }}
            >
              {isPending ? 'Guardando...' : 'Marcar como completado ✓'}
            </button>
          ) : diaActivo < totalDays - 1 ? (
            <button
              onClick={() => setDiaActivo(d => d + 1)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, rgba(198,155,48,0.22) 0%, rgba(198,155,48,0.12) 100%)',
                border: '1px solid rgba(198,155,48,0.35)',
                borderRadius: 9999, padding: '13px', fontSize: 13, fontWeight: 700,
                color: 'var(--text-gold)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s',
              }}
            >
              Ir al Día {diaActivo + 2} →
            </button>
          ) : null}
        </div>
      )}

      {/* Sprint completado */}
      {allDone && sprint.status !== 'completed' && (
        <div style={{ borderLeft: '3px solid var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(198,155,48,0.25)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-gold)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>🎉 Sprint completado</div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
            Terminaste los 5 días. Tu idea ya tiene validación real.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleCompleteSprint} disabled={isPending} className="fc-btn-primary" style={{ width: '100%', opacity: isPending ? 0.5 : 1 }}>
              Cerrar sprint ✓
            </button>
            <button onClick={handleAbandon} disabled={isPending} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isPending ? 0.5 : 1 }}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {sprint.status === 'completed' && (
        <div style={{ background: 'rgba(58,158,106,0.10)', border: '1px solid rgba(58,158,106,0.25)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-bright)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>✅ Sprint cerrado</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>Completado exitosamente.</p>
          <button onClick={() => router.push('/ideas/banco')} className="fc-btn-primary" style={{ width: '100%' }}>
            Volver al banco de ideas
          </button>
        </div>
      )}
    </div>
  )
}
