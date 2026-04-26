import { createAdminClient } from '@/lib/supabase/server'
import { resolveAIProvider } from './resolver'
import { extractAndSaveProfileTags } from './context'
import type { ActionResult } from '@/types/actions'

// ═══════════════════════════════════════════════════════════════
// generatePhaseSummary
// Al cerrar una sesión (límite alcanzado o manual), genera un
// resumen de la fase + próximo paso concreto + extrae tags del perfil.
//
// Guarda:
//  - idea_sessions.phase_summary (texto del resumen)
//  - idea_sessions.next_step (próximo paso concreto)
//  - user_profile_tags (extraídos silenciosamente por la AI)
// ═══════════════════════════════════════════════════════════════
export async function generatePhaseSummary(
  userId: string,
  sessionId: string,
  phase: string
): Promise<ActionResult<string>> {
  const supabase = createAdminClient()

  // 1. Traer toda la conversación de la fase
  const { data: messages, error: msgErr } = await supabase
    .from('idea_session_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .eq('phase', phase)
    .order('sequence_order', { ascending: true })

  if (msgErr) {
    return { ok: false, error: msgErr.message }
  }

  const conversationText = (messages ?? [])
    .map(m => `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}`)
    .join('\n')

  if (!conversationText.trim()) {
    return { ok: false, error: 'NO_MESSAGES' }
  }

  // 2. Generar resumen con la AI
  const provider = await resolveAIProvider(userId)
  if (!provider.ok) {
    return { ok: false, error: provider.error }
  }

  const result = await provider.data.chat({
    system: `Eres un asistente que genera resúmenes concisos de sesiones de coaching de emprendimiento.
Devolvé SOLO un JSON válido con esta forma exacta:
{
  "summary": "2-3 oraciones que capturen lo más importante de la sesión",
  "key_insights": ["insight 1", "insight 2"],
  "next_step": "una sola acción concreta y específica que el usuario puede hacer hoy o mañana"
}
Sin preamble, solo JSON válido.`,
    messages: [
      {
        role: 'user',
        content: `Resumí esta sesión de fase ${phase}:\n\n${conversationText}`,
      },
    ],
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  // 3. Parsear y guardar en la sesión
  let parsed: { summary: string; key_insights: string[]; next_step: string }
  try {
    parsed = JSON.parse(result.data.content)
  } catch {
    return { ok: false, error: 'SUMMARY_PARSE_ERROR' }
  }

  const { error: updateErr } = await supabase
    .from('idea_sessions')
    .update({
      phase_summary: parsed.summary,
      next_step: parsed.next_step ?? '',
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  // 4. Extraer tags de perfil silenciosamente (best-effort)
  //    Se ejecuta en background — no bloquea el flujo principal
  extractAndSaveProfileTags(userId, conversationText).catch(() => {})

  return { ok: true, data: parsed.next_step ?? '' }
}
