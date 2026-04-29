'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type { ObservationPattern, Idea } from '@/modules/ideas/types'
import { mapPattern, mapIdea } from '@/modules/ideas/mappers'
import { AnthropicProvider } from '@/modules/ideas/ai/provider'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { AI_USAGE_FEATURES } from '@/modules/ideas/constants'

interface PatternAIResponse {
  pattern_found: boolean
  title?:        string
  description?:  string
  observation_ids?: string[]
}

function getProvider() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new AnthropicProvider(key)
}

export async function detectPatterns(): Promise<ActionResult<ObservationPattern[]>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: obs } = await supabase
      .from('observations')
      .select('id, content, category')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!obs || obs.length < 3) return { ok: true, data: [] }

    const provider = getProvider()
    const obsList  = obs.map((o, i) => `${i + 1}. "${o.content}"`).join('\n')

    const result = await provider.chat({
      system: 'Eres un analista de oportunidades de negocio. Responde SOLO con JSON válido, sin texto adicional.',
      messages: [{
        role: 'user',
        content: `Analiza estas observaciones de quejas cotidianas y detecta si hay un patrón temático claro:

${obsList}

Si hay un patrón con 2+ observaciones relacionadas, devuelve:
{"pattern_found": true, "title": "Nombre corto del patrón", "description": "1-2 oraciones sobre la oportunidad de negocio detectada"}

Si no hay patrón claro, devuelve:
{"pattern_found": false}

Responde SOLO con el JSON, sin markdown ni texto adicional.`,
      }],
    })

    if (!result.ok) return { ok: true, data: [] }

    await trackUsage({
      user_id:       userId,
      provider:      result.data.provider,
      feature:       AI_USAGE_FEATURES.PATTERN_DETECTION,
      tokens_input:  result.data.tokens_input,
      tokens_output: result.data.tokens_output,
      cost_usd:      result.data.cost_usd,
    })

    let parsed: PatternAIResponse
    try {
      const clean = result.data.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return { ok: true, data: [] }
    }

    if (!parsed.pattern_found || !parsed.title || !parsed.description) {
      return { ok: true, data: [] }
    }

    // Verificar si ya existe un patrón similar reciente (misma title)
    const { data: existing } = await supabase
      .from('observation_patterns')
      .select('id')
      .eq('user_id', userId)
      .eq('title', parsed.title)
      .maybeSingle()

    if (existing) return { ok: true, data: [] }

    const { data: newPattern, error } = await supabase
      .from('observation_patterns')
      .insert({
        user_id:           userId,
        title:             parsed.title,
        description:       parsed.description,
        observation_count: obs.length,
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: [mapPattern(newPattern)] }
  } catch (e) {
    console.error('[detectPatterns]', e)
    return { ok: false, error: 'Error al detectar patrones' }
  }
}

export async function getLatestPattern(): Promise<ActionResult<ObservationPattern | null>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('observation_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return { ok: true, data: data ? mapPattern(data) : null }
  } catch (e) {
    console.error('[getLatestPattern]', e)
    return { ok: false, error: 'Error al obtener patrón' }
  }
}

export async function convertPatternToIdea(
  patternId: string
): Promise<ActionResult<Idea>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: pattern } = await supabase
      .from('observation_patterns')
      .select('*')
      .eq('id', patternId)
      .eq('user_id', userId)
      .single()

    if (!pattern) return { ok: false, error: 'Patrón no encontrado' }
    if (pattern.idea_id) {
      // Ya tiene idea — devolver la existente
      const { data: idea } = await supabase.from('ideas').select('*').eq('id', pattern.idea_id).single()
      if (idea) return { ok: true, data: mapIdea(idea) }
    }

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        user_id: userId,
        title:   pattern.title,
        concept: pattern.description,
        source:  'cazador',
        status:  'nueva',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    // Vincular patrón con la idea creada
    await supabase
      .from('observation_patterns')
      .update({ idea_id: idea.id })
      .eq('id', patternId)

    return { ok: true, data: mapIdea(idea) }
  } catch (e) {
    console.error('[convertPatternToIdea]', e)
    return { ok: false, error: 'Error al convertir patrón a idea' }
  }
}
