'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import type { ActionResult } from '@/types/actions'

// ═══════════════════════════════════════════════════════════════
// Estos actions usan createAdminClient en vez del client de sesión
// porque `requireAdmin()` ya verifica que el usuario sea admin vía
// el client autenticado, pero necesitamos el service_role para
// acceder a user_profile_tags (RLS).
//
// Alternativa futura: migrar a client autenticado + RLS policies.
// ═══════════════════════════════════════════════════════════════

interface ProfileTag {
  id: string
  tag: string
  category: string
  source: 'ai' | 'user'
  is_active: boolean
}

// ─── Listar tags activos ─────────────────────────────────────
export async function getUserProfileTags(
  userId: string
): Promise<ActionResult<ProfileTag[]>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_profile_tags')
    .select('id, tag, category, source, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.message.includes('does not exist')) {
      return { ok: true, data: [] } // Tabla aún no migrada
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data: data ?? [] }
}

// ─── Agregar tag manual ──────────────────────────────────────
export async function addProfileTag(
  userId: string,
  tag: string,
  category: string
): Promise<ActionResult<ProfileTag>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_profile_tags')
    .upsert(
      {
        user_id: userId,
        tag: tag.toLowerCase().trim(),
        category,
        source: 'user',
        is_active: true,
      },
      {
        onConflict: 'user_id,tag',
        ignoreDuplicates: false, // overwrite (reactiva si estaba desactivado)
      }
    )
    .select('id, tag, category, source, is_active')
    .single()

  if (error) {
    if (error.message.includes('does not exist')) {
      return { ok: false, error: 'Migration pending: run supabase migrations' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data }
}

// ─── Soft-delete de tag ──────────────────────────────────────
// Marca is_active = false. No borra de DB para poder restaurar.
export async function removeProfileTag(
  userId: string,
  tagId: string
): Promise<ActionResult<void>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('user_profile_tags')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tagId)
    .eq('user_id', userId)

  if (error) {
    if (error.message.includes('does not exist')) {
      return { ok: false, error: 'Migration pending: run supabase migrations' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data: undefined }
}
