import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'

export async function requireAdmin(): Promise<string> {
  let userId: string
  try {
    userId = await getDevUserId()
  } catch {
    redirect('/login')
    throw new Error('unreachable')
  }
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  if (!profile?.is_admin) redirect('/dashboard')
  return userId
}
