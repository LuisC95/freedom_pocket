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

  const progress     = sprint.progress ?? []
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.day_number))
  const totalDays    = sprint.tasks_json.length
  const progresoPct  = Math.round((completedIds.size / totalDays) * 100)
  const allDone      = completedIds.size === totalDays

  const dia = sprint.tasks_json[diaActivo]

  const handleComplete = () => {
    startTransition(async () => {
      const dayNum = diaActivo + 1
      const result = await completeDayProgress({
        sprintId:  sprint.id,
        dayNumber: dayNum,
        notes:     notes[dayNum],
      })
      if (result.ok) {
        setSprint(prev => {
          const existingProgress = prev.progress ?? []
          const updated = existingProgress.filter(p => p.day_number !== dayNum)
          updated.push(result.data)
          return { ...prev, progress: updated }
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
        className="flex items-center gap-1 pb-2 text-[13px] text-[#7A9A8A]"
      >
        ← Volver
      </button>

      {/* Hero */}
      <div className="rounded-2xl bg-[#1A2520] p-5">
        <div className="mb-2.5 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#7A9A8A]">Sprint · 5 días</div>
            <h1 className="mb-2 text-[18px] font-black leading-tight text-white">{idea.title}</h1>
            <div className="inline-flex items-center gap-1 rounded-md bg-[#C69B30]/25 px-2 py-1">
              <span className="text-[10px]">✨</span>
              <span className="text-[11px] font-semibold text-[#C69B30]">Sprint generado por AI</span>
            </div>
          </div>
          <div className="min-w-[52px] text-center">
            <div className="font-mono text-[26px] font-black text-[#C69B30]">{progresoPct}%</div>
            <div className="text-[10px] text-[#7A9A8A]">avance</div>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-[#C69B30] transition-all duration-500"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
      </div>

      {/* Day timeline */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sprint.tasks_json.map((task, i) => {
          const done   = completedIds.has(i + 1)
          const active = i === diaActivo
          return (
            <button
              key={i}
              onClick={() => setDiaActivo(i)}
              className="flex min-w-[56px] flex-col items-center rounded-xl px-1.5 py-2 transition-all"
              style={{
                background:  active ? '#2E7D52' : done ? '#EAF0EC' : '#fff',
                border:      `1.5px solid ${active ? '#2E7D52' : done ? '#2E7D5250' : '#e0ebe4'}`,
                boxShadow:   active ? '0 4px 12px #2E7D5235' : 'none',
              }}
            >
              <span className="mb-0.5 text-[15px]">{done && !active ? '✅' : task.emoji}</span>
              <span
                className="text-[10px] font-bold"
                style={{ color: active ? '#fff' : done ? '#2E7D52' : '#7A9A8A' }}
              >
                Día {task.day_number}
              </span>
            </button>
          )
        })}
      </div>

      {/* Día activo */}
      {dia && (
        <div className="rounded-2xl border border-[#e0ebe4] bg-white p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="text-[30px] leading-none">{dia.emoji}</span>
            <div>
              <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#7A9A8A]">
                Día {dia.day_number} · {dia.title}
              </div>
              <p className="text-[15px] font-bold leading-snug text-[#141F19]">{dia.task}</p>
            </div>
          </div>

          <div className="mb-3 rounded-xl bg-[#F2F7F4] px-3 py-3 text-[13px] leading-relaxed text-[#7A9A8A]">
            {dia.detail}
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#2E7D5230] bg-[#2E7D5218] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#2E7D52]">
              ⏱ {dia.duration_minutes} min
            </span>
            <span className="rounded-full border border-[#C69B3030] bg-[#C69B3018] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#C69B30]">
              🎯 {dia.goal}
            </span>
          </div>

          <textarea
            value={notes[dia.day_number] ?? ''}
            onChange={e => setNotes(prev => ({ ...prev, [dia.day_number]: e.target.value }))}
            onBlur={() => handleNoteBlur(dia.day_number)}
            placeholder="Anota aquí lo que descubres en esta tarea..."
            rows={3}
            className="mb-3 w-full resize-y rounded-xl border border-[#e0ebe4] bg-[#F2F7F4] px-3 py-2.5 text-[12px] leading-relaxed text-[#141F19] outline-none placeholder:text-[#7A9A8A]"
          />

          {!completedIds.has(dia.day_number) ? (
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="w-full rounded-xl bg-[#2E7D52] py-3 text-[14px] font-bold text-white disabled:opacity-50"
            >
              Marcar como completado ✓
            </button>
          ) : diaActivo < totalDays - 1 ? (
            <button
              onClick={() => setDiaActivo(d => d + 1)}
              className="w-full rounded-xl bg-[#EAF0EC] py-3 text-[14px] font-bold text-[#2E7D52]"
            >
              Ir al Día {diaActivo + 2} →
            </button>
          ) : null}
        </div>
      )}

      {/* Sprint completado */}
      {allDone && sprint.status !== 'completed' && (
        <div className="rounded-2xl p-4" style={{ borderLeft: '3px solid #C69B30', background: '#C69B3008', border: '1px solid #C69B3030' }}>
          <div className="mb-1 text-[14px] font-bold text-[#C69B30]">🎉 Sprint completado</div>
          <p className="mb-3 text-[13px] leading-relaxed text-[#141F19]">
            Terminaste los 5 días. Tu idea ya tiene validación real.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCompleteSprint}
              disabled={isPending}
              className="w-full rounded-xl bg-[#2E7D52] py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              Cerrar sprint ✓
            </button>
            <button
              onClick={handleAbandon}
              disabled={isPending}
              className="w-full rounded-xl border border-[#e0ebe4] py-2.5 text-[13px] font-semibold text-[#7A9A8A] disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {sprint.status === 'completed' && (
        <div className="rounded-2xl p-4" style={{ background: '#2E7D5218', border: '1px solid #2E7D5230' }}>
          <div className="mb-1 text-[14px] font-bold text-[#2E7D52]">✅ Sprint cerrado</div>
          <p className="mb-3 text-[13px] text-[#7A9A8A]">Este sprint fue completado exitosamente.</p>
          <button
            onClick={() => router.push('/ideas/banco')}
            className="w-full rounded-xl bg-[#2E7D52] py-2.5 text-[13px] font-bold text-white"
          >
            Volver al banco de ideas
          </button>
        </div>
      )}
    </div>
  )
}
