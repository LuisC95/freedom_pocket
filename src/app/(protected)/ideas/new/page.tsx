import { redirect } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getSession } from '@/modules/ideas/actions'
import { IdeaChat } from '@/modules/ideas/components/IdeaChat'
import Link from 'next/link'

interface NewIdeaPageProps {
  searchParams: Promise<{ session?: string }>
}

export default async function NewIdeaPage({ searchParams }: NewIdeaPageProps) {
  await requireAdmin()
  const params = await searchParams
  const sessionId = params.session

  if (!sessionId) redirect('/ideas')

  const result = await getSession(sessionId, { includeMessages: true })
  if (!result.ok) redirect('/ideas')

  const session = result.data

  if (session.status === 'completed' && session.ideas?.length) {
    redirect(`/ideas/${session.ideas[0].id}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid #E4EDE8',
        backgroundColor: '#fff',
      }}>
        <Link href="/ideas" style={{ color: '#7A9A8A', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
          ← Ideas
        </Link>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)' }}>
          Nueva idea
        </span>
      </div>

      {/* Chat fills remaining height */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <IdeaChat session={session} />
      </div>
    </div>
  )
}
