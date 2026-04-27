// src/app/(protected)/ideas/[ideaId]/chat/page.tsx
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getIdea } from '@/modules/ideas/actions'
import { getSession } from '@/modules/ideas/actions/sessions'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { ChatPageClient } from './ChatPageClient'
import { RenderErrorBoundary } from '@/modules/ideas/components/RenderErrorBoundary'

interface Props {
  params: Promise<{ ideaId: string }>
}

export default async function ChatPage(props: Props) {
  try {
    await requireAdmin()
  } catch (e) {
    console.error('[ChatPage] requireAdmin failed:', e)
    redirect('/login')
  }
  const { ideaId } = await props.params
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Cargar idea
  let idea
  try {
    const ideaResult = await getIdea(ideaId)
    if (!ideaResult.ok) {
      console.error('[ChatPage] idea not found:', ideaId)
      redirect('/ideas')
    }
    idea = ideaResult.data
  } catch (e) {
    console.error('[ChatPage] getIdea error:', e)
    redirect('/ideas')
  }

  // Buscar sesión activa o crear una
  let phase: string = 'observar'
  let sessionId: string | null = null

  try {
    let { data: activeSession } = await supabase
      .from('idea_sessions')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeSession) {
      const { data: lastCompleted } = await supabase
        .from('idea_sessions')
        .select('current_phase, id')
        .eq('idea_id', ideaId)
        .eq('user_id', DEV_USER_ID)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastCompleted?.current_phase) {
        const NEXT_PHASE: Record<string, string> = {
          observar: 'definir',
          definir: 'idear',
          idear: 'evaluar',
          evaluar: '',
        }
        phase = NEXT_PHASE[lastCompleted.current_phase] ?? 'observar'
        if (!phase) redirect(`/ideas/${ideaId}`)
      }

      const sessionData: Record<string, unknown> = {
        idea_id: ideaId,
        user_id: DEV_USER_ID,
        entry_point: 'sin_idea',
        status: 'in_progress',
        current_phase: phase,
      }
      const { data: newSession } = await supabase
        .from('idea_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (newSession) {
        sessionId = newSession.id
        activeSession = newSession
      }
    } else {
      sessionId = activeSession.id
      phase = (activeSession as Record<string, unknown>).current_phase as string || 'observar'
    }
  } catch (e) {
    console.error('[ChatPage] session query error:', e)
    redirect(`/ideas/${ideaId}`)
  }

  if (!sessionId) redirect(`/ideas/${ideaId}`)

  // Cargar mensajes existentes
  let messages: unknown[] = []
  try {
    const { data: msgs } = await supabase
      .from('idea_session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('sequence_order', { ascending: true })
    messages = msgs ?? []
  } catch (e) {
    console.error('[ChatPage] messages query error:', e)
  }

  // Fases completadas
  let completedPhases: string[] = []
  try {
    const { data: completedSessions } = await supabase
      .from('idea_sessions')
      .select('current_phase')
      .eq('idea_id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    completedPhases = [
      ...new Set((completedSessions ?? []).map(s => s.current_phase).filter(Boolean)),
    ] as string[]
  } catch (e) {
    console.error('[ChatPage] completed sessions query error:', e)
  }

  return (
    <RenderErrorBoundary source="ChatPage">
      <ChatPageClient
      ideaId={ideaId}
      ideaTitle={idea.title}
      sessionId={sessionId}
      initialPhase={phase as string}
      completedPhases={completedPhases}
      initialMessages={messages as any}
    />
    </RenderErrorBoundary>
  )
}
