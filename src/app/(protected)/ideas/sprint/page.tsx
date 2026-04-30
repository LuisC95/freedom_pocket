import { redirect } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getActiveSprint } from '@/modules/ideas/actions/sprints'

export default async function ActiveSprintRedirectPage() {
  await requireAdmin()

  const result = await getActiveSprint()
  if (result.ok && result.data) {
    redirect(`/ideas/sprint/${result.data.id}`)
  }

  redirect('/ideas/banco')
}
