'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type { Observation, Streak, CreateObservationInput } from '@/modules/ideas/types'
import { mapObservation, mapStreak } from '@/modules/ideas/mappers'
import { detectPatterns } from './patterns'

// ── Streak helpers ───────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

async function updateStreak(userId: string, supabase: ReturnType<typeof createAdminClient>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('feature', 'cazador')
    .maybeSingle()

  if (!existing) {
    await supabase.from('streaks').insert({
      user_id:       userId,
      feature:       'cazador',
      current_count: 1,
      longest_count: 1,
      last_activity: today,
    })
    return
  }

  const last = existing.last_activity ? new Date(existing.last_activity + 'T12:00:00') : null

  if (last && isSameDay(last, new Date())) {
    // Ya registró hoy — no incrementar
    return
  }

  const continued = last && isYesterday(last)
  const newCount  = continued ? existing.current_count + 1 : 1
  const newLongest = Math.max(existing.longest_count, newCount)

  await supabase.from('streaks').update({
    current_count: newCount,
    longest_count: newLongest,
    last_activity: today,
  }).eq('id', existing.id)
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function addObservation(
  input: CreateObservationInput
): Promise<ActionResult<Observation>> {
  try {
    const userId  = await getDevUserId()
    const content = input.content?.trim()
    if (!content) return { ok: false, error: 'La observación no puede estar vacía' }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('observations')
      .insert({ user_id: userId, content })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    // Actualizar racha
    await updateStreak(userId, supabase)

    // Disparar detección de patrones si hay 3+ observaciones
    const { count } = await supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) >= 3) {
      // Fire-and-forget — no bloqueamos la respuesta
      detectPatterns().catch(console.error)
    }

    return { ok: true, data: mapObservation(data) }
  } catch (e) {
    console.error('[addObservation]', e)
    return { ok: false, error: 'Error al guardar la observación' }
  }
}

export async function getObservations(
  options: { limit?: number } = {}
): Promise<ActionResult<Observation[]>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()
    const limit    = options.limit ?? 50

    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: (data ?? []).map(mapObservation) }
  } catch (e) {
    console.error('[getObservations]', e)
    return { ok: false, error: 'Error al obtener observaciones' }
  }
}

export async function deleteObservation(
  id: string
): Promise<ActionResult<void>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[deleteObservation]', e)
    return { ok: false, error: 'Error al eliminar la observación' }
  }
}

export async function getStreak(): Promise<ActionResult<Streak>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('feature', 'cazador')
      .maybeSingle()

    if (!data) {
      const empty: Streak = {
        id:            '',
        user_id:       userId,
        feature:       'cazador',
        current_count: 0,
        longest_count: 0,
        last_activity: null,
      }
      return { ok: true, data: empty }
    }

    return { ok: true, data: mapStreak(data) }
  } catch (e) {
    console.error('[getStreak]', e)
    return { ok: false, error: 'Error al obtener la racha' }
  }
}
