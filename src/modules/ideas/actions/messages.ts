// src/modules/ideas/actions/messages.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { ActionResult } from '@/types/actions'
import {
  IdeaMessage,
  SendMessageInput,
  ToggleMessagePinInput,
} from '@/modules/ideas/types'
import { mapMessage } from '@/modules/ideas/mappers'
import { resolveAIProvider } from '@/modules/ideas/ai/resolver'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { normalizeProviderForStorage } from '@/modules/ideas/ai/provider'
import { PHASES } from '@/modules/ideas/constants'

const CONTEXT_WINDOW_HOURS = 72
const CONTEXT_RECENT_MAX_MESSAGES = 60

function getNextPhase(currentPhase: string): string | null {
  const currentIndex = PHASES.findIndex(phase => phase.key === currentPhase)
  if (currentIndex === -1) return null
  return PHASES[currentIndex + 1]?.key ?? null
}

function buildSystemPromptForPhase(phase: string): string {
  const nextPhase = getNextPhase(phase)

  return `Eres un coach de emprendimiento para Fastlane Compass. Guiás al usuario
paso a paso por una conversación continua, en español, tono cercano, sin jerga
innecesaria. Nunca reinicies el contexto: usá toda la conversación previa.

Fase actual: ${phase.toUpperCase()}.
${nextPhase ? `Siguiente fase posible: ${nextPhase.toUpperCase()}.` : 'Esta es la última fase del flujo.'}

Objetivos por fase:
- OBSERVAR: descubrir skills, intereses, ventajas, problemas observados y patrones.
- DEFINIR: convertir lo anterior en un problema concreto, una persona concreta y un contexto claro.
- IDEAR: proponer ideas de negocio específicas y ayudar a elegir una con más potencial.
- EVALUAR: analizar la idea elegida con criterio práctico y ayudar a dejarla lista para guardarse.

Reglas de avance:
- Vos decidís cuándo pasar de fase.
- Solo podés quedarte en la fase actual o avanzar una sola fase.
- No avances si todavía faltan señales claras de comprensión.
- Cuando avances, decilo de forma natural dentro del mensaje para el usuario.
- Hacé una pregunta concreta por turno salvo que estés resumiendo o cerrando una fase.

Metadatos obligatorios al FINAL del mensaje:
- Siempre agregá en la última línea exactamente un bloque XML de una sola línea.
- Formato: <fastlane_meta next_phase="${phase}" ready_to_save="false" />
- Reemplazá next_phase por la fase que corresponde después de tu análisis.
- ready_to_save="true" solo si la idea ya está suficientemente definida/evaluada para mostrar el formulario de guardado.
- No expliques este bloque. No lo menciones. No agregues nada después del bloque XML.

Ejemplo válido:
<fastlane_meta next_phase="${nextPhase ?? phase}" ready_to_save="${nextPhase ? 'false' : 'true'}" />`
}

interface ParsedAssistantControl {
  content: string
  nextPhase: SendMessageInput['phase']
  readyToSave: boolean
}

function parseAssistantControl(
  rawContent: string,
  currentPhase: SendMessageInput['phase'],
  currentReadyToSave: boolean
): ParsedAssistantControl {
  const fallback: ParsedAssistantControl = {
    content: rawContent.trim(),
    nextPhase: currentPhase,
    readyToSave: currentReadyToSave,
  }

  const metaMatch = rawContent.match(
    /<fastlane_meta\s+next_phase="([^"]+)"\s+ready_to_save="([^"]+)"\s*\/>\s*$/i
  )
  if (!metaMatch) return fallback

  const [, requestedPhase, readyToSaveRaw] = metaMatch
  const allowedPhases = new Set(
    [currentPhase, getNextPhase(currentPhase)].filter(Boolean)
  )

  const nextPhase = allowedPhases.has(requestedPhase)
    ? (requestedPhase as SendMessageInput['phase'])
    : currentPhase

  return {
    content: rawContent.replace(metaMatch[0], '').trim(),
    nextPhase,
    readyToSave: readyToSaveRaw.toLowerCase() === 'true',
  }
}

interface SendMessageResult {
  userMessage: IdeaMessage
  assistantMessage: IdeaMessage
  activePhase: SendMessageInput['phase']
  phaseChanged: boolean
  readyToSave: boolean
}

interface ContextMessageRow {
  id: string
  role: string
  content: string
  sequence_order: number
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResult<SendMessageResult>> {
  try {
    const DEV_USER_ID = await getDevUserId()
    const supabase = createAdminClient()

    const { data: session, error: sessionError } = await supabase
      .from('idea_sessions')
      .select('id, status, current_phase, ready_to_save')
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (sessionError || !session) {
      return { ok: false, error: 'Sesión no encontrada' }
    }
    if (session.status !== 'in_progress') {
      return { ok: false, error: 'La sesión ya no está activa' }
    }

    const activePhase = session.current_phase as SendMessageInput['phase']

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

    const { data: userRow, error: insertError } = await supabase
      .from('idea_session_messages')
      .insert({
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
      })
      .select()
      .single()

    if (insertError || !userRow) {
      return {
        ok: false,
        error: `Error al guardar el mensaje: ${insertError?.message ?? 'sin detalle'}`,
      }
    }

    const cutoffISO = new Date(
      Date.now() - CONTEXT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString()

    const [pinnedResult, recentResult] = await Promise.all([
      supabase
        .from('idea_session_messages')
        .select('id, role, content, sequence_order')
        .eq('session_id', input.session_id)
        .eq('is_pinned', true)
        .order('sequence_order', { ascending: true }),
      supabase
        .from('idea_session_messages')
        .select('id, role, content, sequence_order')
        .eq('session_id', input.session_id)
        .gte('created_at', cutoffISO)
        .order('sequence_order', { ascending: false })
        .limit(CONTEXT_RECENT_MAX_MESSAGES),
    ])

    if (pinnedResult.error || recentResult.error) {
      return {
        ok: false,
        error: `Error al construir contexto: ${pinnedResult.error?.message ?? recentResult.error?.message ?? 'sin detalle'}`,
      }
    }

    const contextMap = new Map<string, ContextMessageRow>()
    for (const row of pinnedResult.data ?? []) contextMap.set(row.id, row)
    for (const row of recentResult.data ?? []) contextMap.set(row.id, row)

    const contextRows = Array.from(contextMap.values()).sort(
      (a, b) => a.sequence_order - b.sequence_order
    )

    const contextMessages = contextRows.map(row => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    const systemPrompt = buildSystemPromptForPhase(activePhase)
    const aiResult = await aiProvider.chat({
      messages: contextMessages,
      system: systemPrompt,
    })
    if (!aiResult.ok) return { ok: false, error: aiResult.error }

    const assistantStorageProvider = normalizeProviderForStorage(
      aiResult.data.provider
    )
    const control = parseAssistantControl(
      aiResult.data.content,
      activePhase,
      session.ready_to_save
    )

    const { data: assistantRow, error: assistantError } = await supabase
      .from('idea_session_messages')
      .insert({
        session_id: input.session_id,
        user_id: DEV_USER_ID,
        role: 'assistant',
        content: control.content,
        phase: control.nextPhase,
        sequence_order: nextOrder + 1,
        provider: assistantStorageProvider,
        model: aiResult.data.model,
        tokens_input: aiResult.data.tokens_input,
        tokens_output: aiResult.data.tokens_output,
        cost_usd: aiResult.data.cost_usd,
        response_time_ms: aiResult.data.response_time_ms ?? null,
      })
      .select()
      .single()

    if (assistantError || !assistantRow) {
      return {
        ok: false,
        error: `Error al guardar la respuesta AI: ${assistantError?.message ?? 'sin detalle'}`,
      }
    }

    const { error: sessionUpdateError } = await supabase
      .from('idea_sessions')
      .update({
        current_phase: control.nextPhase,
        ready_to_save: control.readyToSave,
      })
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)

    if (sessionUpdateError) {
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

    return {
      ok: true,
      data: {
        userMessage: mapMessage(userRow),
        assistantMessage: mapMessage(assistantRow),
        activePhase: control.nextPhase,
        phaseChanged: control.nextPhase !== activePhase,
        readyToSave: control.readyToSave,
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
