'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type { Idea, CreateIdeaInput, CreateMapIdeaInput, IdeaSource, IdeaStatus } from '@/modules/ideas/types'
import { mapIdea } from '@/modules/ideas/mappers'
import { CAMINOS } from '@/modules/ideas/constants'

export async function createIdea(
  input: CreateIdeaInput
): Promise<ActionResult<Idea>> {
  try {
    const userId = await getDevUserId()
    if (!input.title?.trim())       return { ok: false, error: 'La idea necesita un título' }
    if (!input.description?.trim()) return { ok: false, error: 'La idea necesita una descripción' }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id:        userId,
        title:          input.title.trim(),
        concept:        input.description.trim(),
        source:         input.source,
        business_model: input.business_model ?? null,
        status:         'nueva',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    console.error('[createIdea]', e)
    return { ok: false, error: 'Error al crear la idea' }
  }
}

export async function listIdeas(
  filters: { source?: IdeaSource; status?: IdeaStatus } = {}
): Promise<ActionResult<Idea[]>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    let query = supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters.source) query = query.eq('source', filters.source)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) return { ok: false, error: error.message }
    return { ok: true, data: (data ?? []).map(mapIdea) }
  } catch (e) {
    console.error('[listIdeas]', e)
    return { ok: false, error: 'Error al listar ideas' }
  }
}

export async function createMapIdea(
  input: CreateMapIdeaInput
): Promise<ActionResult<Idea>> {
  try {
    const userId = await getDevUserId()
    const camino = CAMINOS.find(c => c.id === input.caminoId)
    if (!camino) return { ok: false, error: 'Camino no encontrado' }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'mapa')
      .eq('title', camino.titulo)
      .neq('status', 'descartada')
      .maybeSingle()

    if (existing) return { ok: true, data: mapIdea(existing) }

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id: userId,
        title: camino.titulo,
        concept: `${camino.sub}. ${camino.desc}`,
        source: 'mapa',
        status: 'nueva',
        potential_score: null,
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    console.error('[createMapIdea]', e)
    return { ok: false, error: 'Error al crear la idea desde el mapa' }
  }
}

export async function updateIdea(
  id: string,
  updates: { title?: string; description?: string }
): Promise<ActionResult<Idea>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const patch: Record<string, string> = {}
    if (updates.title)       patch.title   = updates.title.trim()
    if (updates.description) patch.concept = updates.description.trim()

    const { data, error } = await supabase
      .from('ideas')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    console.error('[updateIdea]', e)
    return { ok: false, error: 'Error al actualizar la idea' }
  }
}

export async function discardIdea(
  id: string,
  reason?: string
): Promise<ActionResult<Idea>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const patch: Record<string, unknown> = { status: 'descartada' }
    if (reason) patch.discard_reason = reason

    const { data, error } = await supabase
      .from('ideas')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    console.error('[discardIdea]', e)
    return { ok: false, error: 'Error al descartar la idea' }
  }
}
