// src/modules/ideas/actions/phases.ts
// Acción para aceptar una transición de fase: genera resumen IA de la fase
// que se cierra, lo persiste en idea_sessions.phase_summaries, actualiza
// current_phase e inserta un mensaje marcador (kind='phase_transition').
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type {
  Phase,
  IdeaSession,
  IdeaMessage,
  PhaseSummariesMap,
  PhaseSummary,
  AssistantUIData,
} from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'
import { mapSession, mapMessage } from '@/modules/ideas/mappers'
import { resolveAIProvider } from '@/modules/ideas/ai/resolver'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { normalizeProviderForStorage } from '@/modules/ideas/ai/provider'
import { buildSummaryPrompt } from '@/modules/ideas/ai/prompts'

interface PostgrestLikeError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function hasMissingColumnError(
  error: PostgrestLikeError | null,
  column: string
): boolean {
  if (!error) return false
  const blob = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    error.code === '42703' ||
    blob.includes(`'${column.toLowerCase()}'`) ||
    blob.includes(`"${column.toLowerCase()}"`) ||
    blob.includes(`${column.toLowerCase()} column`) ||
    blob.includes('schema cache')
  )
}

function phaseOrder(key: Phase): number {
  return PHASES.find(p => p.key === key)?.order ?? -1
}

function isNextPhase(from: Phase, to: Phase): boolean {
  const fromOrder = phaseOrder(from)
  const toOrder = phaseOrder(to)
  return fromOrder > 0 && toOrder === fromOrder + 1
}

export interface AcceptPhaseTransitionInput {
  session_id: string
  from_phase: Phase
  to_phase: Phase
}

export interface AcceptPhaseTransitionResult {
  session: IdeaSession
  transitionMessage: IdeaMessage
  summary: string
}

export async function acceptPhaseTransition(
  input: AcceptPhaseTransitionInput
): Promise<ActionResult<AcceptPhaseTransitionResult>> {
  try {
    if (!isNextPhase(input.from_phase, input.to_phase)) {
      return { ok: false, error: 'Secuencia de fases inválida' }
    }

    const DEV_USER_ID = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sessionRow, error: sessionError } = await supabase
      .from('idea_sessions')
      .select('*')
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (sessionError || !sessionRow) {
      return { ok: false, error: 'Sesión no encontrada' }
    }
    if ((sessionRow as { status: string }).status !== 'in_progress') {
      return { ok: false, error: 'La sesión ya no está activa' }
    }

    const existingSummaries: PhaseSummariesMap =
      ((sessionRow as unknown as { phase_summaries?: PhaseSummariesMap | null })
        .phase_summaries as PhaseSummariesMap | null) ?? {}

    const currentPhase =
      (sessionRow as unknown as { current_phase?: Phase }).current_phase ?? 'observar'

    // Idempotencia: si el resumen ya existe y ya avanzamos, devolvemos OK sin llamar IA.
    if (
      existingSummaries[input.from_phase]?.summary &&
      phaseOrder(currentPhase) >= phaseOrder(input.to_phase)
    ) {
      return {
        ok: true,
        data: {
          session: mapSession(sessionRow as never),
          summary: existingSummaries[input.from_phase]!.summary,
          // buscar el último mensaje de transición para no reinsertar
          transitionMessage: (await findExistingTransition(
            supabase,
            input.session_id,
            input.from_phase,
            input.to_phase
          )) ?? (await insertTransitionMarker(
            supabase,
            input.session_id,
            DEV_USER_ID,
            input.from_phase,
            input.to_phase,
            existingSummaries[input.from_phase]!.summary,
            { storageProvider: 'anthropic', model: 'claude-sonnet-4-6' }
          )),
        },
      }
    }

    // 1. Traer mensajes de la fase que se cierra.
    const { data: messages, error: messagesError } = await supabase
      .from('idea_session_messages')
      .select('role, content')
      .eq('session_id', input.session_id)
      .eq('phase', input.from_phase)
      .order('sequence_order', { ascending: true })

    if (messagesError) {
      return {
        ok: false,
        error: `Error al leer mensajes de la fase: ${messagesError.message}`,
      }
    }

    const conversation = (messages ?? []).map(row => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    if (conversation.length === 0) {
      return {
        ok: false,
        error: 'No hay mensajes en esta fase para resumir',
      }
    }

    // 2. Llamar a la IA con prompt de resumen.
    const providerResult = await resolveAIProvider(DEV_USER_ID)
    if (!providerResult.ok) return { ok: false, error: providerResult.error }
    const aiProvider = providerResult.data

    const summaryResult = await aiProvider.chat({
      system: buildSummaryPrompt(input.from_phase),
      messages: conversation,
    })
    if (!summaryResult.ok) return { ok: false, error: summaryResult.error }

    const summaryText = summaryResult.data.content.trim()
    const summaryEntry: PhaseSummary = {
      summary: summaryText,
      generated_at: new Date().toISOString(),
      model: summaryResult.data.model,
      tokens: summaryResult.data.tokens_output,
    }

    // 3. Update idea_sessions: merge phase_summaries + avanzar current_phase.
    const nextSummaries: PhaseSummariesMap = {
      ...existingSummaries,
      [input.from_phase]: summaryEntry,
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('idea_sessions')
      .update({
        current_phase: input.to_phase,
        phase_summaries: nextSummaries,
      })
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .select()
      .single()

    if (updateError || !updatedRow) {
      if (updateError && hasMissingColumnError(updateError, 'phase_summaries')) {
        return {
          ok: false,
          error:
            'La columna phase_summaries no existe todavía. Aplicá la migración más reciente y recargá.',
        }
      }
      return {
        ok: false,
        error: `Error al actualizar la sesión: ${updateError?.message ?? 'sin detalle'}`,
      }
    }

    // 4. Insertar mensaje marcador de transición.
    const storageProvider = normalizeProviderForStorage(summaryResult.data.provider)
    const transitionMessage = await insertTransitionMarker(
      supabase,
      input.session_id,
      DEV_USER_ID,
      input.from_phase,
      input.to_phase,
      summaryText,
      { storageProvider, model: summaryResult.data.model }
    )

    // 5. Tracking (fire and forget).
    void trackUsage({
      user_id: DEV_USER_ID,
      provider: summaryResult.data.provider,
      feature: 'ideas_phase_summary',
      tokens_input: summaryResult.data.tokens_input,
      tokens_output: summaryResult.data.tokens_output,
      cost_usd: summaryResult.data.cost_usd,
    })

    return {
      ok: true,
      data: {
        session: mapSession(updatedRow as never),
        transitionMessage,
        summary: summaryText,
      },
    }
  } catch (e) {
    return {
      ok: false,
      error: `Error inesperado en acceptPhaseTransition: ${
        e instanceof Error ? e.message : 'sin detalle'
      }`,
    }
  }
}

// ──────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createAdminClient>

async function findExistingTransition(
  supabase: SupabaseAdmin,
  sessionId: string,
  fromPhase: Phase,
  toPhase: Phase
): Promise<IdeaMessage | null> {
  try {
    const { data } = await supabase
      .from('idea_session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('phase', toPhase)
      .contains('ui_data', { kind: 'phase_transition', from: fromPhase, to: toPhase })
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ? mapMessage(data as never) : null
  } catch {
    return null
  }
}

async function insertTransitionMarker(
  supabase: SupabaseAdmin,
  sessionId: string,
  userId: string,
  fromPhase: Phase,
  toPhase: Phase,
  summary: string,
  ai: { storageProvider: 'anthropic' | 'openai' | 'google'; model: string }
): Promise<IdeaMessage> {
  const { data: maxRow } = await supabase
    .from('idea_session_messages')
    .select('sequence_order')
    .eq('session_id', sessionId)
    .order('sequence_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow as { sequence_order?: number } | null)?.sequence_order ?? 0) + 1

  const uiData: AssistantUIData = {
    kind: 'phase_transition',
    from: fromPhase,
    to: toPhase,
    summary,
  }

  const base = {
    session_id: sessionId,
    user_id: userId,
    role: 'assistant',
    content: `Cerramos la fase ${fromPhase}. Seguimos en ${toPhase}.`,
    phase: toPhase,
    sequence_order: nextOrder,
    provider: ai.storageProvider,
    model: ai.model,
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
  }

  // Intento con ui_data; si la columna falta, reintento sin.
  const first = await supabase
    .from('idea_session_messages')
    .insert({ ...base, ui_data: uiData })
    .select()
    .single()

  if (first.data) return mapMessage(first.data as never)

  if (first.error && hasMissingColumnError(first.error, 'ui_data')) {
    const second = await supabase
      .from('idea_session_messages')
      .insert(base)
      .select()
      .single()
    if (second.data) {
      const mapped = mapMessage(second.data as never)
      return { ...mapped, ui_data: uiData }
    }
  }

  // Fallback defensivo — no debería llegar acá.
  throw new Error(
    `No se pudo insertar el marcador de transición: ${first.error?.message ?? 'sin detalle'}`
  )
}
