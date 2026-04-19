// src/modules/ideas/actions/messages.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { ActionResult }       from '@/types/actions'
import { IdeaMessage, SendMessageInput } from '@/modules/ideas/types'
import { mapMessage }         from '@/modules/ideas/mappers'
import { resolveAIProvider }  from '@/modules/ideas/ai/resolver'

const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

// ─────────────────────────────────────────────
// 5. sendMessage
// ─────────────────────────────────────────────
// Flujo completo:
//   1. Verificar sesión activa (status = 'in_progress')
//   2. Resolver acceso AI del usuario (suscripción + key) vía resolveAIProvider
//   3. Calcular sequence_order (MAX + 1)
//   4. Persistir mensaje del usuario (provider/model vacíos pero requeridos)
//   5. Traer historial filtrado por fase (control de costos)
//   6. Llamar AIProvider con los mensajes de la fase
//   7. Persistir respuesta AI con todos los campos de telemetría
//   8. Devolver ambos mensajes (sin re-fetch del historial)

interface SendMessageResult {
  userMessage:      IdeaMessage
  assistantMessage: IdeaMessage
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResult<SendMessageResult>> {
  try {
    const supabase = createAdminClient()

    // ── 1. Verificar sesión activa ───────────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from('idea_sessions')
      .select('id, status')
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (sessionError || !session) {
      return { ok: false, error: 'Sesión no encontrada' }
    }
    if (session.status !== 'in_progress') {
      return { ok: false, error: 'La sesión ya no está activa' }
    }

    // ── 2. Resolver acceso AI ────────────────────────────────────
    // resolveAIProvider busca en user_subscriptions y user_api_keys.
    // Si el usuario no tiene acceso AI → devuelve error directo.
    const providerResult = await resolveAIProvider(DEV_USER_ID)
    if (!providerResult.ok) return { ok: false, error: providerResult.error }
    const aiProvider = providerResult.data

    // ── 3. Calcular sequence_order (MAX + 1) ─────────────────────
    const { data: maxRow } = await supabase
      .from('idea_session_messages')
      .select('sequence_order')
      .eq('session_id', input.session_id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()  // maybeSingle porque la sesión puede no tener mensajes aún

    const nextOrder = (maxRow?.sequence_order ?? 0) + 1

    // ── 4. Persistir mensaje del usuario ─────────────────────────
    // ⚠️ user_id, provider, model, tokens_input, tokens_output, cost_usd son NOT NULL.
    // Para role='user' los defaults van en 0/''. provider/model ya vienen del AIProvider
    // resuelto — los mandamos al mensaje del usuario para consistencia de telemetría
    // (permite filtrar "mensajes enviados con key BYOK" incluso en el turno del usuario).
    const { data: userRow, error: insertError } = await supabase
      .from('idea_session_messages')
      .insert({
        session_id:     input.session_id,
        user_id:        DEV_USER_ID,
        role:           'user',
        content:        input.content.trim(),
        phase:          input.phase,
        sequence_order: nextOrder,
        provider:       aiProvider.provider,
        model:          aiProvider.model,
        tokens_input:   0,
        tokens_output:  0,
        cost_usd:       0,
      })
      .select()
      .single()

    if (insertError || !userRow) {
      return { ok: false, error: 'Error al guardar el mensaje' }
    }

    // ── 5. Traer historial filtrado por fase ─────────────────────
    // Solo mensajes de la fase actual → la AI no ve fases anteriores.
    // Esto es lo que mantiene el costo de tokens bajo control en BYOK.
    const { data: history } = await supabase
      .from('idea_session_messages')
      .select('role, content')
      .eq('session_id', input.session_id)
      .eq('phase', input.phase)
      .order('sequence_order', { ascending: true })

    const messages = (history ?? []).map((m: { role: string; content: string }) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // ── 6. Llamar AIProvider ─────────────────────────────────────
    const aiResult = await aiProvider.chat({ messages })
    if (!aiResult.ok) return { ok: false, error: aiResult.error }

    // ── 7. Persistir respuesta AI con telemetría completa ────────
    const { data: assistantRow, error: assistantError } = await supabase
      .from('idea_session_messages')
      .insert({
        session_id:       input.session_id,
        user_id:          DEV_USER_ID,
        role:             'assistant',
        content:          aiResult.data.content,
        phase:            input.phase,
        sequence_order:   nextOrder + 1,
        provider:         aiResult.data.provider,
        model:            aiResult.data.model,
        tokens_input:     aiResult.data.tokens_input,
        tokens_output:    aiResult.data.tokens_output,
        cost_usd:         aiResult.data.cost_usd,
        response_time_ms: aiResult.data.response_time_ms ?? null,
      })
      .select()
      .single()

    if (assistantError || !assistantRow) {
      return { ok: false, error: 'Error al guardar la respuesta AI' }
    }

    return {
      ok:   true,
      data: {
        userMessage:      mapMessage(userRow),
        assistantMessage: mapMessage(assistantRow),
      },
    }
  } catch (e) {
    return { ok: false, error: 'Error inesperado en sendMessage' }
  }
}
