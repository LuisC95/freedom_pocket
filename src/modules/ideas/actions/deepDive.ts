// src/modules/ideas/actions/deepDive.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult }       from '@/types/actions'
import {
  IdeaDeepDive,
  UpsertDeepDiveFieldInput,
  DeepDiveField,
} from '@/modules/ideas/types'
import { DEEP_DIVE_FIELDS } from '@/modules/ideas/constants'
import { mapDeepDive } from '@/modules/ideas/mappers'

const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

// Whitelist de seguridad: solo estos campos pueden escribirse vía upsert.
// Previene SQL injection por nombre de columna arbitrario.
const VALID_FIELDS: DeepDiveField[] = [
  ...DEEP_DIVE_FIELDS.map(f => f.key),
  'ai_notes',
] as DeepDiveField[]

// ─────────────────────────────────────────────
// 15. upsertDeepDiveField
// ─────────────────────────────────────────────
// Crea el deep dive si no existe, actualiza el campo si ya existe.
// El usuario llena los 8 campos (7 plan + ai_notes) de a uno.

export async function upsertDeepDiveField(
  input: UpsertDeepDiveFieldInput
): Promise<ActionResult<IdeaDeepDive>> {
  try {
    if (!VALID_FIELDS.includes(input.field)) {
      return { ok: false, error: `Campo '${input.field}' no es válido` }
    }

    if (typeof input.value !== 'string') {
      return { ok: false, error: 'El valor debe ser texto' }
    }

    const supabase = createAdminClient()

    // Ownership vía idea (deep_dive no tiene user_id propio)
    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', input.idea_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const { data: existing } = await supabase
      .from('idea_deep_dives')
      .select('id')
      .eq('idea_id', input.idea_id)
      .maybeSingle()

    // String vacío → null (para que fields_completed cuente bien)
    const trimmed = input.value.trim()
    const valueToStore = trimmed.length > 0 ? trimmed : null

    if (existing) {
      const { data, error } = await supabase
        .from('idea_deep_dives')
        .update({ [input.field]: valueToStore })
        .eq('idea_id', input.idea_id)
        .select()
        .single()

      if (error) return { ok: false, error: error.message }
      return { ok: true, data: mapDeepDive(data) }
    } else {
      const { data, error } = await supabase
        .from('idea_deep_dives')
        .insert({
          idea_id:       input.idea_id,
          [input.field]: valueToStore,
        })
        .select()
        .single()

      if (error) return { ok: false, error: error.message }
      return { ok: true, data: mapDeepDive(data) }
    }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al guardar el campo' }
  }
}

// ─────────────────────────────────────────────
// 16. getDeepDive
// ─────────────────────────────────────────────
// Devuelve null si no existe (caso válido, no error).
// mapDeepDive calcula fields_completed e is_complete.

export async function getDeepDive(
  ideaId: string
): Promise<ActionResult<IdeaDeepDive | null>> {
  try {
    const supabase = createAdminClient()

    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const { data, error } = await supabase
      .from('idea_deep_dives')
      .select('*')
      .eq('idea_id', ideaId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: true, data: null }

    return { ok: true, data: mapDeepDive(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener el deep dive' }
  }
}
