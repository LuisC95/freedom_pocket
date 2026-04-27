// src/app/(protected)/ideas/[ideaId]/chat/page.tsx
'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getIdea } from '@/modules/ideas/actions'
import { getSession } from '@/modules/ideas/actions/sessions'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { ChatPageClient } from './ChatPageClient'

interface Props {
  params: Promise<{ ideaId: string }>
}

export default async function ChatPage(props: Props) {
  await requireAdmin()
  const { ideaId } = await props.params
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Cargar idea
  const ideaResult = await getIdea(ideaId)
  if (!ideaResult.ok) redirect('/ideas')
  const idea = ideaResult.data

  // Buscar sesión activa o crear una
  let { data: activeSession } = await supabase
    .from('idea_sessions')
    .select('*')
    .eq('idea_id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Si no hay sesión activa, buscar la última completada y obtener su fase siguiente
  let phase: string = 'observar'
  let sessionId: string | null = null

  if (!activeSession) {
    // Buscar completadas para saber en qué fase vamos
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

      // Si ya completó evaluar, redirigir al resumen
      if (!phase) redirect(`/ideas/${ideaId}`)
    }

    // Crear nueva sesión
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

  if (!sessionId) redirect(`/ideas/${ideaId}`)

  // Cargar mensajes existentes
  const { data: messages } = await supabase
    .from('idea_session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence_order', { ascending: true })

  // Fases completadas
  const { data: completedSessions } = await supabase
    .from('idea_sessions')
    .select('current_phase')
    .eq('idea_id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const completedPhases: string[] = [
    ...new Set((completedSessions ?? []).map(s => s.current_phase).filter(Boolean)),
  ] as string[]

  return (
    <ChatPageClient
      ideaId={ideaId}
      ideaTitle={idea.title}
      sessionId={sessionId}
      initialPhase={phase as string}
      completedPhases={completedPhases}
      initialMessages={messages ?? []}
    />
  )
}
