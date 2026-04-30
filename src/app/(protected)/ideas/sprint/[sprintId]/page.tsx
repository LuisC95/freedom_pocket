import { notFound } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getSprint } from '@/modules/ideas/actions/sprints'
import { listIdeas } from '@/modules/ideas/actions/ideas'
import { SprintPage } from '@/modules/ideas/components/SprintPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'
import { IdeasModuleNav } from '@/modules/ideas/components/IdeasModuleNav'

interface Props {
  params: Promise<{ sprintId: string }>
}

export default async function SprintPageRoute({ params }: Props) {
  await requireAdmin()
  const { sprintId } = await params

  const sprintResult = await getSprint(sprintId)
  if (!sprintResult.ok) notFound()

  const sprint = sprintResult.data
  const ideasResult = await listIdeas()
  const idea = ideasResult.ok ? ideasResult.data.find(i => i.id === sprint.idea_id) : null
  if (!idea) notFound()

  return (
    <>
      <div className="ideas-v2-page">
        <IdeasModuleNav activeSprintId={sprint.id} />
        <SprintPage sprint={sprint} idea={idea} />
      </div>
      <MiniChat context={{ screen: 'sprint', ideaId: idea.id, sprintId: sprint.id }} />
    </>
  )
}
