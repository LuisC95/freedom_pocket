import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'

export async function requireAdmin(): Promise<string> {
  const userId = await getDevUserId()
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  if (!profile?.is_admin) redirect('/dashboard')
  return userId
}
