// src/modules/ideas/actions/sessions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult }       from '@/types/actions'
import {
  IdeaSession,
  CreateSessionInput,
} from '@/modules/ideas/types'
import { ENTRY_POINTS } from '@/modules/ideas/constants'
import { mapSession, mapMessage, mapIdea } from '@/modules/ideas/mappers'

const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

// ─────────────────────────────────────────────
// 1. createSession
// ─────────────────────────────────────────────

export async function createSession(
  input: CreateSessionInput
): Promise<ActionResult<IdeaSession>> {
  try {
    const entryPoint = ENTRY_POINTS.find(e => e.key === input.entry_point)
    if (!entryPoint) {
      return { ok: false, error: 'entry_point inválido' }
    }

    if (entryPoint.requires_raw_input && !input.raw_input?.trim()) {
      return { ok: false, error: 'Este punto de entrada requiere una idea inicial' }
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('idea_sessions')
      .insert({
        user_id:     DEV_USER_ID,
        entry_point: input.entry_point,
        raw_input:   input.raw_input?.trim() ?? null,
        status:      'in_progress',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapSession(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al crear la sesión' }
  }
}

// ─────────────────────────────────────────────
// 2. getSession (con flags opcionales)
// ─────────────────────────────────────────────

interface GetSessionOptions {
  includeMessages?: boolean
  includeIdeas?:    boolean
}

export async function getSession(
  sessionId: string,
  options: GetSessionOptions = {}
): Promise<ActionResult<IdeaSession>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('idea_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (error || !data) return { ok: false, error: 'Sesión no encontrada' }

    const session = mapSession(data)

    if (options.includeMessages) {
      const { data: messages } = await supabase
        .from('idea_session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_order', { ascending: true })

      const mapped = (messages ?? []).map(mapMessage)
      session.messages       = mapped
      session.messages_count = mapped.length
    }

    if (options.includeIdeas) {
      const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', DEV_USER_ID)
        .order('created_at', { ascending: true })

      session.ideas = (ideas ?? []).map(mapIdea)
    }

    return { ok: true, data: session }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener la sesión' }
  }
}

// ─────────────────────────────────────────────
// 3. completeSession
// ─────────────────────────────────────────────

export async function completeSession(
  sessionId: string
): Promise<ActionResult<IdeaSession>> {
  return updateSessionStatus(sessionId, 'completed')
}

// ─────────────────────────────────────────────
// 4. abandonSession
// ─────────────────────────────────────────────

export async function abandonSession(
  sessionId: string
): Promise<ActionResult<IdeaSession>> {
  return updateSessionStatus(sessionId, 'abandoned')
}

// Helper interno
async function updateSessionStatus(
  sessionId: string,
  newStatus: 'completed' | 'abandoned'
): Promise<ActionResult<IdeaSession>> {
  try {
    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('idea_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (fetchError || !existing) return { ok: false, error: 'Sesión no encontrada' }

    if (existing.status !== 'in_progress') {
      return { ok: false, error: `La sesión ya está ${existing.status}` }
    }

    const { data, error } = await supabase
      .from('idea_sessions')
      .update({ status: newStatus })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapSession(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al actualizar la sesión' }
  }
}
