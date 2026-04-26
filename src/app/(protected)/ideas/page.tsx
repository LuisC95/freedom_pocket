import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { listIdeas } from '@/modules/ideas/actions'
import { IdeasPage } from '@/modules/ideas/components/IdeasPage'

export default async function IdeasPageRoute() {
  await requireAdmin()
  const result = await listIdeas()
  const ideas = result.ok ? result.data : []

  return <IdeasPage ideas={ideas} />
}
