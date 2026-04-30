import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { listIdeas } from '@/modules/ideas/actions/ideas'
import { getActiveSprint } from '@/modules/ideas/actions/sprints'
import { BancoPage } from '@/modules/ideas/components/BancoPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'
import { IdeasModuleNav } from '@/modules/ideas/components/IdeasModuleNav'

interface BancoPageRouteProps {
  searchParams?: Promise<{ source?: string; camino?: string }>
}

export default async function BancoPageRoute({ searchParams }: BancoPageRouteProps) {
  await requireAdmin()

  const params = searchParams ? await searchParams : {}
  const [result, activeSprintResult] = await Promise.all([
    listIdeas(),
    getActiveSprint(),
  ])
  const ideas  = result.ok ? result.data : []
  const activeSprintId = activeSprintResult.ok ? activeSprintResult.data?.id : null

  return (
    <>
      <div className="ideas-v2-page">
        <IdeasModuleNav activeSprintId={activeSprintId} />
        <BancoPage
          ideas={ideas}
          initialFilter={params.source === 'mapa' ? 'mapa' : params.source === 'cazador' ? 'cazador' : undefined}
          caminoId={params.camino}
        />
      </div>
      <MiniChat context={{ screen: 'banco' }} />
    </>
  )
}
