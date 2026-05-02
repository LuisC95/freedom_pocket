import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { VALID_USER_IDS } from '@/lib/dev-auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/modules/settings/components/SettingsClient'
import type { SettingsPageData } from '@/modules/settings/types'

export default async function ConfiguracionPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('dev_access')?.value

  if (!userId || !VALID_USER_IDS.has(userId)) redirect('/dev-login')

  const supabase = createAdminClient()

  const [{ data: profile }, { data: settings }, { data: memberRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, occupation, is_admin')
      .eq('id', userId)
      .single(),

    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),

    supabase
      .from('household_members')
      .select(`
        household_id,
        role,
        display_name,
        household:households (
          id, name, shared_incomes, shared_expenses, proportional_split
        )
      `)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  let members: { user_id: string; role: 'owner' | 'member'; display_name: string }[] = []
  if (memberRow?.household_id) {
    const { data } = await supabase
      .from('household_members')
      .select('user_id, role, display_name')
      .eq('household_id', memberRow.household_id)
    members = (data ?? []) as typeof members
  }

  const household = memberRow?.household
    ? (Array.isArray(memberRow.household) ? memberRow.household[0] : memberRow.household)
    : null

  const pageData: SettingsPageData = {
    profile: profile!,
    preferences: settings!,
    household: household ?? null,
    members,
    currentUserRole: memberRow?.role ?? null,
  }

  return (
    <div className="settings-page">
      <SettingsClient data={pageData} />
    </div>
  )
}
