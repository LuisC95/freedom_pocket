// src/app/(protected)/ideas/[ideaId]/page.tsx

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getIdea } from '@/modules/ideas/actions'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { Idea } from '@/modules/ideas/types'
import { IdeaSummaryPageClient } from './IdeaSummaryPageClient'

interface Props {
  params: Promise<{ ideaId: string }>
}

export default async function IdeaSummaryPage(props: Props) {
  await requireAdmin()
  const { ideaId } = await props.params
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Cargar idea
  const ideaResult = await getIdea(ideaId, { includeDeepDive: true })
  if (!ideaResult.ok) redirect('/ideas')
  const idea = ideaResult.data as Idea

  // Determinar flujo según status
  const isGenerated = idea.status === 'generated'
  const isTerminal = idea.status === 'operando' || idea.status === 'discarded'

  // Para ideas generadas, redirigir directo al chat
  if (isGenerated) {
    redirect(`/ideas/${ideaId}/chat`)
  }

  // Obtener última sesión completada
  const { data: lastCompletedSession } = await supabase
    .from('idea_sessions')
    .select('id, current_phase, phase_summary, completed_at')
    .eq('idea_id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Obtener última pregunta del coach
  let lastCoachQuestion: string | null = null
  if (lastCompletedSession) {
    const { data: lastMsg } = await supabase
      .from('idea_session_messages')
      .select('content')
      .eq('session_id', lastCompletedSession.id)
      .eq('role', 'assistant')
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMsg) {
      lastCoachQuestion = lastMsg.content
    }
  }

  // Obtener sesión actual (in_progress) para fase actual
  const { data: currentSession } = await supabase
    .from('idea_sessions')
    .select('current_phase')
    .eq('idea_id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Todas las sesiones completadas (para saber fases completadas)
  const { data: allCompleted } = await supabase
    .from('idea_sessions')
    .select('current_phase')
    .eq('idea_id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const completedPhases: string[] = [
    ...new Set((allCompleted ?? []).map(s => s.current_phase).filter(Boolean)),
  ] as string[]

  // Fase actual: si hay sesión en progreso, usar esa; si no, la siguiente después de la última completada
  let currentPhase: string = 'observar'
  if (currentSession?.current_phase) {
    currentPhase = currentSession.current_phase
  } else if (lastCompletedSession?.current_phase) {
    const NEXT_PHASE: Record<string, string> = {
      observar: 'definir',
      definir: 'idear',
      idear: 'evaluar',
      evaluar: '',
    }
    currentPhase = NEXT_PHASE[lastCompletedSession.current_phase] ?? 'observar'
  }

  const lastSession = lastCompletedSession
    ? {
        phase: lastCompletedSession.current_phase as string,
        insight: lastCompletedSession.phase_summary,
        completedAt: lastCompletedSession.completed_at,
      }
    : null

  return (
    <IdeaSummaryPageClient
      idea={idea}
      currentPhase={currentPhase}
      completedPhases={completedPhases}
      lastCoachQuestion={lastCoachQuestion}
      lastSession={lastSession}
      hasActiveSession={!!currentSession}
    />
  )
}
