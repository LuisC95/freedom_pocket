'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea, Phase } from '@/modules/ideas/types'
import { IdeaSummaryEntry } from '@/modules/ideas/components/IdeaSummaryEntry'

interface SessionData {
  phase: string
  insight: string | null
  completedAt: string | null
}

interface IdeaSummaryPageClientProps {
  idea: Idea
  currentPhase: string
  completedPhases: string[]
  lastCoachQuestion: string | null
  lastSession: SessionData | null
  hasActiveSession: boolean
}

export function IdeaSummaryPageClient({
  idea,
  currentPhase,
  completedPhases,
  lastCoachQuestion,
  lastSession,
  hasActiveSession,
}: IdeaSummaryPageClientProps) {
  const router = useRouter()

  const handleContinue = useCallback(() => {
    // Si ya hay sesión activa, va al chat; si no, crear nueva
    router.push(`/ideas/${idea.id}/chat`)
  }, [idea.id, router])

  const handleBack = useCallback(() => {
    router.push('/ideas')
  }, [router])

  return (
    <IdeaSummaryEntry
      title={idea.title}
      concept={idea.concept ?? null}
      status={idea.status}
      currentPhase={currentPhase as Phase}
      completedPhases={completedPhases as Phase[]}
      lastCoachQuestion={lastCoachQuestion}
      lastSession={
        lastSession
          ? {
              phase: lastSession.phase as Phase,
              insight: lastSession.insight ?? null,
              completedAt: lastSession.completedAt,
            }
          : null
      }
      onContinue={handleContinue}
      onBack={handleBack}
    />
  )
}
