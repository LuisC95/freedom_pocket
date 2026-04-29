'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type { SendChatMessageInput } from '@/modules/ideas/types'
import { AnthropicProvider } from '@/modules/ideas/ai/provider'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { AI_USAGE_FEATURES, MINI_CHAT_FREE_LIMIT } from '@/modules/ideas/constants'

function getProvider() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new AnthropicProvider(key)
}

async function buildSystemPrompt(
  userId: string,
  input: SendChatMessageInput,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  const base = 'Eres un coach de negocios empático y directo en la app Fastlane Compass. Responde en máximo 3 oraciones. Sin jerga de negocios. Habla en español.'

  if (input.context.screen === 'cazador') {
    const { data: obs } = await supabase
      .from('observations')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const obsList = (obs ?? []).map((o, i) => `${i + 1}. "${o.content}"`).join('\n')
    return `${base}\n\nEl usuario está en el Cazador de Problemas. Sus últimas observaciones:\n${obsList || 'Ninguna aún.'}`
  }

  if (input.context.screen === 'banco') {
    const { data: ideas } = await supabase
      .from('ideas')
      .select('title, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const ideasList = (ideas ?? []).map(i => `- "${i.title}" (${i.status})`).join('\n')
    return `${base}\n\nEl usuario está revisando su Banco de Ideas:\n${ideasList || 'Sin ideas aún.'}`
  }

  if (input.context.screen === 'sprint' && input.context.ideaId) {
    const { data: idea } = await supabase
      .from('ideas')
      .select('title, concept')
      .eq('id', input.context.ideaId)
      .maybeSingle()

    const { data: progress } = input.context.sprintId
      ? await supabase
          .from('sprint_day_progress')
          .select('day_number, notes, completed')
          .eq('sprint_id', input.context.sprintId)
          .order('day_number', { ascending: true })
      : { data: [] }

    const progressInfo = (progress ?? []).map(p => `Día ${p.day_number}: ${p.completed ? 'completado' : 'pendiente'}${p.notes ? ` — "${p.notes}"` : ''}`).join('\n')

    return `${base}\n\nEl usuario está en el sprint de la idea "${idea?.title ?? 'su idea'}". Descripción: ${idea?.concept ?? ''}\n\nProgreso:\n${progressInfo || 'Sin avance aún.'}`
  }

  // Mapa (pantalla principal)
  return `${base}\n\nEl usuario está explorando su Mapa de Oportunidades en Fastlane Compass.`
}

export async function sendChatMessage(
  input: SendChatMessageInput
): Promise<ActionResult<{ response: string }>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    // Verificar si es admin (sin límites)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()

    const isAdmin = profile?.is_admin ?? false

    if (!isAdmin) {
      // Contar mensajes del chat este mes
      const yearMonth = new Date().toISOString().slice(0, 7)
      const { data: usageLog } = await supabase
        .from('ai_usage_logs')
        .select('request_count')
        .eq('user_id', userId)
        .eq('feature', AI_USAGE_FEATURES.MINI_CHAT)
        .eq('year_month', yearMonth)
        .maybeSingle()

      if ((usageLog?.request_count ?? 0) >= MINI_CHAT_FREE_LIMIT) {
        return { ok: false, error: `Límite de ${MINI_CHAT_FREE_LIMIT} consultas gratuitas alcanzado este mes` }
      }
    }

    const systemPrompt = await buildSystemPrompt(userId, input, supabase)
    const provider     = getProvider()

    const result = await provider.chat({
      system:   systemPrompt,
      messages: [{ role: 'user', content: input.message }],
    })

    if (!result.ok) return { ok: false, error: 'Error al conectar con el coach AI' }

    await trackUsage({
      user_id:       userId,
      provider:      result.data.provider,
      feature:       AI_USAGE_FEATURES.MINI_CHAT,
      tokens_input:  result.data.tokens_input,
      tokens_output: result.data.tokens_output,
      cost_usd:      result.data.cost_usd,
    })

    return { ok: true, data: { response: result.data.content } }
  } catch (e) {
    console.error('[sendChatMessage]', e)
    return { ok: false, error: 'Error al enviar el mensaje' }
  }
}
