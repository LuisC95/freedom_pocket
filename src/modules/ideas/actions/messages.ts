// src/modules/ideas/actions/messages.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { ActionResult } from '@/types/actions'
import {
  IdeaMessage,
  SendMessageInput,
  ToggleMessagePinInput,
  PhaseSummariesMap,
  PhaseReadySignal,
  AssistantUIData,
} from '@/modules/ideas/types'
import { mapMessage } from '@/modules/ideas/mappers'
import { resolveAIProvider } from '@/modules/ideas/ai/resolver'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { normalizeProviderForStorage } from '@/modules/ideas/ai/provider'
import { PHASES } from '@/modules/ideas/constants'
import { buildSystemPromptForPhase } from '@/modules/ideas/ai/prompts'
import { parseAssistantResponse } from '@/modules/ideas/ai/structured'
import { buildUserContext } from '@/modules/ideas/ai/context'

// Límites de mensajes de usuario por fase
const PHASE_USER_LIMITS: Record<string, number> = {
  observar: 8,
  definir: 6,
  idear: 6,
  evaluar: 10,
}

const PHASE_LIMIT_WARNING_THRESHOLD = 2

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

function hasLegacySessionSchemaError(error: PostgrestLikeError | null): boolean {
  return (
    hasMissingColumnError(error, 'current_phase') ||
    hasMissingColumnError(error, 'ready_to_save') ||
    hasMissingColumnError(error, 'phase_summaries')
  )
}

function hasPinnedSchemaError(error: PostgrestLikeError | null): boolean {
  return (
    hasMissingColumnError(error, 'is_pinned') ||
    hasMissingColumnError(error, 'pinned_at') ||
    hasMissingColumnError(error, 'pinned_by')
  )
}

function hasUiDataSchemaError(error: PostgrestLikeError | null): boolean {
  return hasMissingColumnError(error, 'ui_data')
}

interface SendMessageResult {
  userMessage: IdeaMessage
  assistantMessage: IdeaMessage
  activePhase: SendMessageInput['phase']
  phaseChanged: boolean
  readyToSave: boolean
  phaseSuggestion: PhaseReadySignal | null
}

function isValidPhase(value: string | undefined): value is SendMessageInput['phase'] {
  return !!value && PHASES.some(phase => phase.key === value)
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResult<SendMessageResult>> {
  try {
    const DEV_USER_ID = await getDevUserId()
    const supabase = createAdminClient()

    const primarySessionResult = await supabase
      .from('idea_sessions')
      .select('id, status, current_phase, ready_to_save, phase_summaries')
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    let session = primarySessionResult.data as {
      id: string
      status: string
      current_phase?: string
      ready_to_save?: boolean
      phase_summaries?: PhaseSummariesMap | null
    } | null
    let sessionError = primarySessionResult.error

    if (sessionError && hasLegacySessionSchemaError(sessionError)) {
      const fallbackSessionResult = await supabase
        .from('idea_sessions')
        .select('id, status')
        .eq('id', input.session_id)
        .eq('user_id', DEV_USER_ID)
        .single()

      session = fallbackSessionResult.data
        ? {
            ...fallbackSessionResult.data,
            current_phase: input.phase,
            ready_to_save: false,
            phase_summaries: {},
          }
        : null
      sessionError = fallbackSessionResult.error
    }

    if (sessionError || !session) {
      return { ok: false, error: 'Sesión no encontrada' }
    }
    if (session.status !== 'in_progress') {
      return { ok: false, error: 'La sesión ya no está activa' }
    }

    const activePhase = isValidPhase(input.phase)
      ? input.phase
      : isValidPhase(session.current_phase)
        ? session.current_phase
        : 'observar'
    const currentReadyToSave = Boolean(session.ready_to_save)
    const phaseSummaries: PhaseSummariesMap =
      session.phase_summaries && typeof session.phase_summaries === 'object'
        ? session.phase_summaries
        : {}

    const providerResult = await resolveAIProvider(DEV_USER_ID)
    if (!providerResult.ok) return { ok: false, error: providerResult.error }
    const aiProvider = providerResult.data
    const storageProvider = normalizeProviderForStorage(aiProvider.provider)

    const { data: maxRow } = await supabase
      .from('idea_session_messages')
      .select('sequence_order')
      .eq('session_id', input.session_id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxRow?.sequence_order ?? 0) + 1

    const userInsert = {
      session_id: input.session_id,
      user_id: DEV_USER_ID,
      role: 'user',
      content: input.content.trim(),
      phase: activePhase,
      sequence_order: nextOrder,
      provider: storageProvider,
      model: aiProvider.model,
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
    }

    const { data: userRow, error: insertError } = await supabase
      .from('idea_session_messages')
      .insert(userInsert)
      .select()
      .single()

    if (insertError || !userRow) {
      return {
        ok: false,
        error: `Error al guardar el mensaje: ${insertError?.message ?? 'sin detalle'}`,
      }
    }

    const { data: history, error: historyError } = await supabase
      .from('idea_session_messages')
      .select('role, content')
      .eq('session_id', input.session_id)
      .eq('phase', activePhase)
      .order('sequence_order', { ascending: true })

    if (historyError) {
      return {
        ok: false,
        error: `Error al construir contexto: ${historyError.message}`,
      }
    }

    const messages = (history ?? []).map(message => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }))

    // ── Verificar límite de mensajes por fase ──
    const userMsgCount = (history ?? []).filter(m => m.role === 'user').length
    const phaseLimit = PHASE_USER_LIMITS[activePhase] ?? 8
    if (userMsgCount >= phaseLimit) {
      return { ok: false, error: 'PHASE_LIMIT_REACHED' }
    }
    const remainingMessages = phaseLimit - userMsgCount

    // ── Construir system prompt con contexto del usuario ──
    const userContext = await buildUserContext(DEV_USER_ID)
    const warningAddition = remainingMessages <= PHASE_LIMIT_WARNING_THRESHOLD
      ? `\n\nIMPORTANTE: Solo quedan ${remainingMessages} intercambios en esta fase. Enfocate en llegar a una conclusión accionable antes de cerrar.`
      : ''

    const phasePrompt = buildSystemPromptForPhase(activePhase, phaseSummaries)
    const systemPrompt = `${userContext}\n\n${phasePrompt}${warningAddition}`
    const aiResult = await aiProvider.chat({
      messages,
      system: systemPrompt,
    })
    if (!aiResult.ok) return { ok: false, error: aiResult.error }

    const parsed = parseAssistantResponse(aiResult.data.content)
    if (!parsed.parse_ok) {
      console.warn(
        `[ideas.sendMessage] META parse failed (session=${input.session_id}, phase=${activePhase})`
      )
    }

    const assistantStorageProvider = normalizeProviderForStorage(aiResult.data.provider)
    const assistantInsertBase = {
      session_id: input.session_id,
      user_id: DEV_USER_ID,
      role: 'assistant',
      content: parsed.message || aiResult.data.content,
      phase: activePhase,
      sequence_order: nextOrder + 1,
      provider: assistantStorageProvider,
      model: aiResult.data.model,
      tokens_input: aiResult.data.tokens_input,
      tokens_output: aiResult.data.tokens_output,
      cost_usd: aiResult.data.cost_usd,
      response_time_ms: aiResult.data.response_time_ms ?? null,
    }

    // Intento primero con ui_data; si la columna todavía no existe, reintento sin ella.
    let assistantRow: Record<string, unknown> | null = null
    let assistantError: PostgrestLikeError | null = null
    {
      const withUiData = {
        ...assistantInsertBase,
        ui_data: parsed.meta,
      }
      const attempt = await supabase
        .from('idea_session_messages')
        .insert(withUiData)
        .select()
        .single()
      assistantRow = attempt.data as Record<string, unknown> | null
      assistantError = attempt.error
    }

    if (assistantError && hasUiDataSchemaError(assistantError)) {
      const attempt = await supabase
        .from('idea_session_messages')
        .insert(assistantInsertBase)
        .select()
        .single()
      assistantRow = attempt.data as Record<string, unknown> | null
      assistantError = attempt.error
    }

    if (assistantError || !assistantRow) {
      return {
        ok: false,
        error: `Error al guardar la respuesta AI: ${assistantError?.message ?? 'sin detalle'}`,
      }
    }

    // ── Propagar ready_to_save desde la AI ──
    const aiReadyToSave = parsed.meta?.ready_to_save === true
    const newReadyToSave = aiReadyToSave || currentReadyToSave

    const { error: sessionUpdateError } = await supabase
      .from('idea_sessions')
      .update({
        current_phase: activePhase,
        ready_to_save: newReadyToSave,
      })
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)

    if (sessionUpdateError && !hasLegacySessionSchemaError(sessionUpdateError)) {
      return {
        ok: false,
        error: `Error al actualizar estado de la sesión: ${sessionUpdateError.message}`,
      }
    }

    void trackUsage({
      user_id: DEV_USER_ID,
      provider: aiResult.data.provider,
      feature: 'ideas_chat',
      tokens_input: aiResult.data.tokens_input,
      tokens_output: aiResult.data.tokens_output,
      cost_usd: aiResult.data.cost_usd,
    })

    // Si la columna ui_data no existe todavía, garantizo el meta en memoria
    // para que la UI pueda usar options/phase_ready igual en esta respuesta.
    const assistantMessage = mapMessage(assistantRow as never)
    const meta: AssistantUIData | null = assistantMessage.ui_data ?? parsed.meta

    return {
      ok: true,
      data: {
        userMessage: mapMessage(userRow),
        assistantMessage: { ...assistantMessage, ui_data: meta },
        activePhase,
        phaseChanged: false,
        readyToSave: newReadyToSave,
        phaseSuggestion: meta?.phase_ready ?? null,
      },
    }
  } catch (e) {
    return {
      ok: false,
      error: `Error inesperado en sendMessage: ${e instanceof Error ? e.message : 'sin detalle'}`,
    }
  }
}

export async function toggleMessagePin(
  input: ToggleMessagePinInput
): Promise<ActionResult<IdeaMessage>> {
  try {
    const DEV_USER_ID = await getDevUserId()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('idea_session_messages')
      .update({
        is_pinned: input.is_pinned,
        pinned_at: input.is_pinned ? new Date().toISOString() : null,
        pinned_by: input.is_pinned ? DEV_USER_ID : null,
      })
      .eq('id', input.message_id)
      .eq('user_id', DEV_USER_ID)
      .select()
      .single()

    if (error || !data) {
      if (hasPinnedSchemaError(error)) {
        return {
          ok: false,
          error: 'Pin no disponible todavía: aplica la migración más reciente y recarga.',
        }
      }
      return {
        ok: false,
        error: `No se pudo actualizar el pin: ${error?.message ?? 'mensaje no encontrado'}`,
      }
    }

    return { ok: true, data: mapMessage(data) }
  } catch (e) {
    return {
      ok: false,
      error: `Error inesperado al actualizar pin: ${e instanceof Error ? e.message : 'sin detalle'}`,
    }
  }
}
