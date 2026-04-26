import { createAdminClient } from '@/lib/supabase/server'

// ═══════════════════════════════════════════════════════════════
// buildUserContext
// Construye un bloque de texto con datos financieros reales del
// usuario (M1 + M2) para inyectar en el system prompt de la AI.
// Si no hay datos, devuelve string vacío — la AI opera en modo genérico.
// ═══════════════════════════════════════════════════════════════
export async function buildUserContext(userId: string): Promise<string> {
  const supabase = createAdminClient()
  const lines: string[] = ['=== CONTEXTO DEL USUARIO ===']

  // 1. Período activo del usuario
  const { data: activePeriod } = await supabase
    .from('periods')
    .select('id, start_date, end_date')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!activePeriod) {
    lines.push('(usuario sin período activo — sin datos financieros disponibles)')
    lines.push('=== FIN CONTEXTO ===\n')
    return lines.join('\n')
  }

  // 2. Ingresos del período activo
  const { data: incomes } = await supabase
    .from('incomes')
    .select('amount, type, frequency, label')
    .eq('user_id', userId)
    .eq('period_id', activePeriod.id)

  const monthlyIncome = (incomes ?? []).reduce((sum, inc) => {
    // Convertir a monto mensual según frecuencia
    const mult = inc.frequency === 'weekly' ? 4.33
      : inc.frequency === 'biweekly' ? 2.17
      : inc.frequency === 'yearly' ? 1 / 12
      : 1 // monthly o null
    return sum + inc.amount * mult
  }, 0)

  if (incomes && incomes.length > 0) {
    lines.push(`- Ingresos mensuales: ~$${Math.round(monthlyIncome)} USD`)
    lines.push(`- Fuentes de ingreso: ${incomes.map(i => i.label || i.type).join(', ')}`)
  }

  // 3. Horas reales del período activo
  const { data: realHours } = await supabase
    .from('real_hours')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', activePeriod.id)
    .maybeSingle()

  if (realHours) {
    const totalHoursPerWeek = (realHours.contracted_hours_per_week ?? 0)
      + (realHours.extra_hours_per_week ?? 0)
      + (realHours.mental_load_hours_per_week ?? 0)

    lines.push(`- Horas semanales totales: ~${Math.round(totalHoursPerWeek)}h`)

    // Estimar precio/hora si tenemos ingresos y horas
    if (monthlyIncome > 0 && totalHoursPerWeek > 0) {
      const hourlyRate = monthlyIncome / (totalHoursPerWeek * 4.33)
      lines.push(`- Precio/hora estimado: ~$${Math.round(hourlyRate)} USD`)
    }

    if (realHours.working_days_per_week) {
      lines.push(`- Días trabajados por semana: ${realHours.working_days_per_week}`)
    }
    if (realHours.commute_minutes_per_day > 0) {
      lines.push(`- Commute diario: ~${realHours.commute_minutes_per_day} min`)
    }
  }

  // 4. Metas de libertad
  const { data: goals } = await supabase
    .from('freedom_goals')
    .select('target_days, projected_date, label')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (goals && goals.length > 0) {
    const goal = goals[0]
    if (goal.target_days) {
      lines.push(`- Meta de libertad: ${goal.target_days} días libres/año`)
    }
    if (goal.label) {
      lines.push(`- Objetivo financiero: ${goal.label}`)
    }
  }

  // 5. Tags de perfil (requiere migración — catch silencioso si no existe la tabla)
  try {
    const { data: tags } = await supabase
      .from('user_profile_tags')
      .select('tag, category')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (tags && tags.length > 0) {
      lines.push(`- Perfil conocido: ${tags.map(t => t.tag).join(', ')}`)
    }
  } catch {
    // Tabla no existe aún (migración pendiente)
  }

  if (lines.length === 1) {
    // Solo está la cabecera — no hay datos
    lines.push('(usuario sin datos financieros registrados)')
  }

  lines.push('=== FIN CONTEXTO ===')
  lines.push('')
  lines.push('Usá estos datos para personalizar tus respuestas. Por ejemplo:')
  lines.push('- Si el usuario tiene $15/hora y quiere 200 días de libertad, calculá cuánto necesitaría generar un negocio para cambiar esa realidad.')
  lines.push('- Si tiene tags de "ventas" o "tech", priorizá ideas en esas áreas.')
  lines.push('- Si el usuario tiene poco capital, no propongas ideas con alta inversión inicial.')
  lines.push('- Nunca repitas estos datos mecánicamente — integralos naturalmente en la conversación.')

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// extractAndSaveProfileTags
// Al cerrar una sesión, la AI extrae tags de la conversación
// y los guarda silenciosamente en user_profile_tags.
// Falla silenciosamente si la tabla no existe.
// ═══════════════════════════════════════════════════════════════
export async function extractAndSaveProfileTags(
  userId: string,
  conversationText: string
): Promise<void> {
  const supabase = createAdminClient()

  // Verificar si la tabla existe primero
  try {
    const { error: checkErr } = await supabase
      .from('user_profile_tags')
      .select('id')
      .limit(1)

    if (checkErr && checkErr.message.includes('does not exist')) {
      return // Migración pendiente — silencioso
    }
  } catch {
    return // Error de conexión — silencioso
  }

  // Llamar a la AI para extraer tags
  // (usamos dynamic import para evitar circular deps con el resolver)
  const { resolveAIProvider } = await import('./resolver')

  const provider = await resolveAIProvider(userId)
  if (!provider.ok) return

  const result = await provider.data.chat({
    system: `Eres un extractor de datos de perfil de emprendedor.
Analizá la conversación y devolvé SOLO un JSON válido con esta forma exacta:
{ "tags": [ { "tag": "ventas", "category": "habilidad" } ] }

Categorías válidas: habilidad | industria | interes | contexto
Máximo 5 tags. Solo tags concretos y útiles.
Sin preamble, solo JSON.`,
    messages: [{ role: 'user', content: conversationText }],
  })

  if (!result.ok) return

  try {
    const parsed = JSON.parse(result.data.content)
    const tags: Array<{ tag: string; category: string }> = parsed.tags ?? []

    for (const t of tags) {
      await supabase
        .from('user_profile_tags')
        .upsert(
          {
            user_id: userId,
            tag: t.tag.toLowerCase().trim(),
            category: t.category,
            source: 'ai',
            is_active: true,
          },
          {
            onConflict: 'user_id,tag',
            ignoreDuplicates: true,
          }
        )
    }
  } catch {
    // JSON parse error — silencioso
  }
}
