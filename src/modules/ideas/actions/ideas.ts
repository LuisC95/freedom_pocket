// src/modules/ideas/actions/ideas.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult }       from '@/types/actions'
import {
  Idea,
  CreateIdeaFromSessionInput,
  UpdateCENTSInput,
  IdeaStatus,
} from '@/modules/ideas/types'
import { mapIdea, mapDeepDive, mapSession } from '@/modules/ideas/mappers'

const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

// ─────────────────────────────────────────────
// 6. createIdeaFromSession
// ─────────────────────────────────────────────

export async function createIdeaFromSession(
  input: CreateIdeaFromSessionInput
): Promise<ActionResult<Idea>> {
  try {
    if (!input.title?.trim())   return { ok: false, error: 'La idea necesita un título' }
    if (!input.concept?.trim()) return { ok: false, error: 'La idea necesita un concepto' }

    const supabase = createAdminClient()

    // Si viene session_id, validamos ownership antes de asociar
    if (input.session_id) {
      const { data: session } = await supabase
        .from('idea_sessions')
        .select('id')
        .eq('id', input.session_id)
        .eq('user_id', DEV_USER_ID)
        .single()

      if (!session) return { ok: false, error: 'Sesión no encontrada' }
    }

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id:            DEV_USER_ID,
        session_id:         input.session_id ?? null,
        title:              input.title.trim(),
        concept:            input.concept.trim(),
        need_identified:    input.need_identified?.trim()    ?? null,
        fastlane_potential: input.fastlane_potential?.trim() ?? null,
        business_model:     input.business_model             ?? null,
        status:             'generated',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al crear la idea' }
  }
}

// ─────────────────────────────────────────────
// 7. getIdea (con flags opcionales)
// ─────────────────────────────────────────────

interface GetIdeaOptions {
  includeDeepDive?: boolean
  includeSession?:  boolean
}

export async function getIdea(
  ideaId: string,
  options: GetIdeaOptions = {}
): Promise<ActionResult<Idea>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (error || !data) return { ok: false, error: 'Idea no encontrada' }

    const idea = mapIdea(data)

    if (options.includeDeepDive) {
      const { data: deepDive } = await supabase
        .from('idea_deep_dives')
        .select('*')
        .eq('idea_id', ideaId)
        .maybeSingle()

      idea.deep_dive = deepDive ? mapDeepDive(deepDive) : null
    }

    if (options.includeSession && data.session_id) {
      const { data: session } = await supabase
        .from('idea_sessions')
        .select('*')
        .eq('id', data.session_id)
        .single()

      idea.session = session ? mapSession(session) : undefined
    }

    return { ok: true, data: idea }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener la idea' }
  }
}

// ─────────────────────────────────────────────
// 8. listIdeas (filtro opcional por status)
// ─────────────────────────────────────────────

interface ListIdeasInput {
  status?: IdeaStatus
}

export async function listIdeas(
  filter: ListIdeasInput = {}
): Promise<ActionResult<Idea[]>> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('ideas')
      .select('*')
      .eq('user_id', DEV_USER_ID)
      .order('created_at', { ascending: false })

    if (filter.status) {
      query = query.eq('status', filter.status)
    }

    const { data, error } = await query

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: (data ?? []).map(mapIdea) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al listar ideas' }
  }
}

// ─────────────────────────────────────────────
// 9. updateCENTS (1 a 5 scores)
// ─────────────────────────────────────────────

export async function updateCENTS(
  input: UpdateCENTSInput
): Promise<ActionResult<Idea>> {
  try {
    // Validación de rango 1-10 por score recibido
    for (const [key, value] of Object.entries(input.scores)) {
      if (typeof value !== 'number' || value < 1 || value > 10) {
        return { ok: false, error: `Score de '${key}' debe estar entre 1 y 10` }
      }
    }

    const supabase = createAdminClient()

    // Verificar ownership
    const { data: existing } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', input.idea_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!existing) return { ok: false, error: 'Idea no encontrada' }

    // Mapear keys → nombres de columna (control → cents_score_control)
    const updates: Record<string, number> = {}
    for (const [key, value] of Object.entries(input.scores)) {
      updates[`cents_score_${key}`] = value
    }

    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', input.idea_id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al actualizar CENTS' }
  }
}
