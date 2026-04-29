import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getObservations, getStreak } from '@/modules/ideas/actions/observations'
import { getLatestPattern } from '@/modules/ideas/actions/patterns'
import { CazadorPage } from '@/modules/ideas/components/CazadorPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'

export default async function CazadorPageRoute() {
  await requireAdmin()

  const [obsResult, streakResult, patternResult] = await Promise.all([
    getObservations(),
    getStreak(),
    getLatestPattern(),
  ])

  const observations = obsResult.ok  ? obsResult.data    : []
  const streak       = streakResult.ok ? streakResult.data : { id: '', user_id: '', feature: 'cazador' as const, current_count: 0, longest_count: 0, last_activity: null }
  const pattern      = patternResult.ok ? patternResult.data : null

  return (
    <>
      <CazadorPage observations={observations} pattern={pattern} streak={streak} />
      <MiniChat context={{ screen: 'cazador' }} />
    </>
  )
}
