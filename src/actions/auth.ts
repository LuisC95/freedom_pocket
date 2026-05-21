'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth'
import type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from '@/lib/validations/auth'

type ActionResult = { error: string } | { success: true }

export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Email o contraseña incorrectos' }

  redirect('/dashboard')
}

export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { email, password, inviteCode } = parsed.data

  const admin = createAdminClient()
  const { data: code } = await admin
    .from('invitation_codes')
    .select('id, used_by, expires_at')
    .eq('code', inviteCode.trim().toUpperCase())
    .single()

  if (!code) return { error: 'Código de invitación inválido' }
  if (code.used_by) return { error: 'Este código ya fue utilizado' }
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return { error: 'El código de invitación expiró' }
  }

  const supabase = await createClient()
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) return { error: signUpError.message }
  if (!authData.user) return { error: 'No se pudo crear la cuenta' }

  await admin
    .from('invitation_codes')
    .update({ used_by: authData.user.id, used_at: new Date().toISOString() })
    .eq('id', code.id)

  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) console.error('[forgotPassword]', error.message)
  // Always return success to avoid email enumeration
  return { success: true }
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: 'No se pudo actualizar la contraseña' }

  redirect('/dashboard')
}
