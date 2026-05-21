'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { randomBytes } from 'crypto'

export async function updateProfile(formData: FormData) {
  const userId = await getDevUserId()
  const supabase = createAdminClient()

  const display_name = formData.get('display_name') as string
  const occupation = formData.get('occupation') as string

  const { error } = await supabase
    .from('profiles')
    .update({ display_name, occupation, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  const userId = await getDevUserId()
  const supabase = createAdminClient()

  const base_currency = formData.get('base_currency') as string
  const timezone = formData.get('timezone') as string
  const working_days_per_week = Number(formData.get('working_days_per_week'))
  const default_payment_source = formData.get('default_payment_source') as string

  const { error } = await supabase
    .from('user_settings')
    .update({
      base_currency,
      timezone,
      working_days_per_week,
      default_payment_source,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return { success: true }
}

/* ── Admin guard ── */
async function requireAdminUserId(): Promise<string | { error: string }> {
  const userId = await getDevUserId()
  const supabase = createAdminClient()
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  if (!data?.is_admin) return { error: 'Solo administradores' }
  return userId
}

function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O/1/I
  let code = ''
  const bytes = randomBytes(16)
  for (let i = 0; i < bytes.length && code.length < 8; i++) {
    const idx = bytes[i] % alphabet.length
    if (idx < alphabet.length) code += alphabet[idx]
  }
  return code
}

export async function createInvitationCode(): Promise<{ error: string } | { success: true; code: string }> {
  const result = await requireAdminUserId()
  if (typeof result !== 'string') return result

  const userId = result
  const supabase = createAdminClient()

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    const { error } = await supabase
      .from('invitation_codes')
      .insert({ code, created_by: userId })

    if (!error) {
      revalidatePath('/configuracion')
      return { success: true, code }
    }
    // Only retry on unique violation (code 23505)
    if (!error.code || error.code !== '23505') return { error: error.message }
  }

  return { error: 'No se pudo generar un código único, intenta de nuevo' }
}

export async function revokeInvitationCode(id: string): Promise<{ error: string } | { success: true }> {
  const result = await requireAdminUserId()
  if (typeof result !== 'string') return result

  const supabase = createAdminClient()

  const { data: code } = await supabase
    .from('invitation_codes')
    .select('used_by')
    .eq('id', id)
    .single()

  if (!code) return { error: 'Código no encontrado' }
  if (code.used_by) return { error: 'No se puede eliminar un código ya utilizado' }

  const { error } = await supabase.from('invitation_codes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return { success: true }
}

export async function updateHousehold(formData: FormData) {
  const userId = await getDevUserId()
  const supabase = createAdminClient()

  const householdId = formData.get('household_id') as string
  const name = formData.get('name') as string
  const shared_incomes = formData.get('shared_incomes') === 'true'
  const shared_expenses = formData.get('shared_expenses') === 'true'
  const proportional_split = formData.get('proportional_split') === 'true'

  const { data: member } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .single()

  if (member?.role !== 'owner') return { error: 'Solo el propietario puede modificar estas opciones' }

  const { error } = await supabase
    .from('households')
    .update({
      name,
      shared_incomes,
      shared_expenses,
      proportional_split,
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId)

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return { success: true }
}
