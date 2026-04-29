import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { listIdeas } from '@/modules/ideas/actions/ideas'
import { BancoPage } from '@/modules/ideas/components/BancoPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'

export default async function BancoPageRoute() {
  await requireAdmin()

  const result = await listIdeas()
  const ideas  = result.ok ? result.data : []

  return (
    <>
      <div className="ideas-v2-page">
        <BancoPage ideas={ideas} />
      </div>
      <MiniChat context={{ screen: 'banco' }} />
    </>
  )
}
