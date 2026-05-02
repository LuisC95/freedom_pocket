'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'

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
