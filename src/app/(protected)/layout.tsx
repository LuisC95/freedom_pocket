import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/layout/Sidebar'
import { BottomNav } from '@/components/shared/navigation/BottomNav'

const VALID_USER_IDS = new Set(
  [process.env.DEV_USER_ID_LUIS, process.env.DEV_USER_ID_PAREJA].filter(Boolean) as string[]
)

async function isAuthenticated(): Promise<boolean> {
  if (VALID_USER_IDS.size > 0) {
    const cookieStore = await cookies()
    const devCookie = cookieStore.get('dev_access')
    return !!(devCookie?.value && VALID_USER_IDS.has(devCookie.value))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authenticated = await isAuthenticated()
  if (!authenticated) redirect('/dev-login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-base)' }}>
      <Sidebar />
      <BottomNav />
      <main className="md:ml-[68px] mb-[60px] md:mb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
