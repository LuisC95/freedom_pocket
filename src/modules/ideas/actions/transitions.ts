// src/modules/ideas/actions/transitions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult }       from '@/types/actions'
import {
  Idea,
  IdeaStatus,
  PromoteToOperandoInput,
  DiscardIdeaInput,
} from '@/modules/ideas/types'
import { IDEA_STATUS_TRANSITIONS } from '@/modules/ideas/constants'
import { mapIdea } from '@/modules/ideas/mappers'

const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────

function assertValidTransition(
  currentStatus: IdeaStatus,
  newStatus:     IdeaStatus
): string | null {
  const allowed = IDEA_STATUS_TRANSITIONS[currentStatus] as readonly IdeaStatus[]
  if (!allowed.includes(newStatus)) {
    return `Transición inválida: '${currentStatus}' → '${newStatus}'`
  }
  return null
}

async function fetchIdeaForTransition(ideaId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ideas')
    .select('id, status, title')
    .eq('id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .single()
  return data ?? null
}

// ─────────────────────────────────────────────
// 10. commitIdea (generated → committed)
// ─────────────────────────────────────────────

export async function commitIdea(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'committed')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({
        status:       'committed',
        committed_at: new Date().toISOString(),
      })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al comprometer la idea' }
  }
}

// ─────────────────────────────────────────────
// 11. startValidando (committed → validando)
// ─────────────────────────────────────────────

export async function startValidando(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'validando')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({ status: 'validando' })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al iniciar validación' }
  }
}

// ─────────────────────────────────────────────
// 12. startConstruyendo (validando → construyendo)
// ─────────────────────────────────────────────

export async function startConstruyendo(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'construyendo')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({ status: 'construyendo' })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al iniciar construcción' }
  }
}

// ─────────────────────────────────────────────
// 13. promoteToOperando (construyendo → operando)
// ─────────────────────────────────────────────
// Usa transacción SQL vía rpc() para atomicidad:
// crea business en M3 + actualiza idea en una sola operación.
// Si algo falla, ambas se revierten. La función SQL
// 'promote_idea_to_operando' debe existir en DB (ver migración pendiente).

export async function promoteToOperando(
  input: PromoteToOperandoInput
): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(input.idea_id)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'operando')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('promote_idea_to_operando', {
      p_idea_id:       input.idea_id,
      p_user_id:       DEV_USER_ID,
      p_business_name: input.business_name?.trim() ?? idea.title,
    })

    if (error) return { ok: false, error: error.message }
    if (!data)  return { ok: false, error: 'La promoción no devolvió la idea actualizada' }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al promover la idea' }
  }
}

// ─────────────────────────────────────────────
// 14. discardIdea (cualquier no-terminal → discarded)
// ─────────────────────────────────────────────
// ⚠️ Requiere migración: agregar discarded_at y discard_reason a ideas
// (ver sección "Migraciones pendientes" en HANDOFF_M4_ACTIONS.md).

export async function discardIdea(
  input: DiscardIdeaInput
): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(input.idea_id)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'discarded')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({
        status:         'discarded',
        discarded_at:   new Date().toISOString(),
        discard_reason: input.reason?.trim() ?? null,
      })
      .eq('id', input.idea_id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al descartar la idea' }
  }
}
