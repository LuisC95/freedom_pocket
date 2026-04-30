import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getObservations, getStreak } from '@/modules/ideas/actions/observations'
import { getLatestPattern } from '@/modules/ideas/actions/patterns'
import { getActiveSprint } from '@/modules/ideas/actions/sprints'
import { CazadorPage } from '@/modules/ideas/components/CazadorPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'
import { IdeasModuleNav } from '@/modules/ideas/components/IdeasModuleNav'

export default async function CazadorPageRoute() {
  await requireAdmin()

  const [obsResult, streakResult, patternResult, activeSprintResult] = await Promise.all([
    getObservations(),
    getStreak(),
    getLatestPattern(),
    getActiveSprint(),
  ])

  const observations = obsResult.ok  ? obsResult.data    : []
  const streak       = streakResult.ok ? streakResult.data : { id: '', user_id: '', feature: 'cazador' as const, current_count: 0, longest_count: 0, last_activity: null }
  const pattern      = patternResult.ok ? patternResult.data : null
  const activeSprintId = activeSprintResult.ok ? activeSprintResult.data?.id : null

  return (
    <>
      <div className="ideas-v2-page">
        <IdeasModuleNav activeSprintId={activeSprintId} />
        <CazadorPage observations={observations} pattern={pattern} streak={streak} />
      </div>
      <MiniChat context={{ screen: 'cazador' }} />
    </>
  )
}
