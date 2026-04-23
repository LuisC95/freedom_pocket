import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/layout/Sidebar'
import { BottomNav } from '@/components/shared/navigation/BottomNav'
import { VALID_USER_IDS } from '@/lib/dev-auth'

async function getAuthState(): Promise<{ authenticated: boolean; isAdmin: boolean }> {
  if (VALID_USER_IDS.size > 0) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('dev_access')?.value
    if (!userId || !VALID_USER_IDS.has(userId)) return { authenticated: false, isAdmin: false }

    const supabase = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    return { authenticated: true, isAdmin: !!profile?.is_admin }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { authenticated: !!user, isAdmin: false }
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { authenticated, isAdmin } = await getAuthState()
  if (!authenticated) redirect('/dev-login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-base)' }}>
      <Sidebar isAdmin={isAdmin} />
      <BottomNav isAdmin={isAdmin} />
      <main className="md:ml-[68px] mb-[60px] md:mb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
