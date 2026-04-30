'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import type { ActionResult } from '@/types/actions'
import type { Sprint, DayProgress, SprintTask, CompleteDayInput, UpdateDayNotesInput } from '@/modules/ideas/types'
import { mapSprint, mapDayProgress } from '@/modules/ideas/mappers'
import { AnthropicProvider } from '@/modules/ideas/ai/provider'
import { trackUsage } from '@/modules/ideas/ai/usage'
import { AI_USAGE_FEATURES } from '@/modules/ideas/constants'

function getProvider() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new AnthropicProvider(key)
}

interface SprintGenerationContext {
  hourly_rate:     number
  free_hours_week: number
  monthly_gap:     number
}

async function getUserContext(
  userId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<SprintGenerationContext> {
  // Intentar obtener datos de M1 (mi-realidad)
  try {
    const { data: realHours } = await supabase
      .from('real_hours')
      .select('contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: incomes } = await supabase
      .from('incomes')
      .select('amount, frequency')
      .eq('user_id', userId)
      .eq('is_active', true)

    let hourly_rate     = 15
    let free_hours_week = 20
    let monthly_gap     = 1000

    if (realHours) {
      const totalHours =
        realHours.contracted_hours_per_week +
        realHours.extra_hours_per_week +
        ((realHours.commute_minutes_per_day * realHours.working_days_per_week * 2) / 60) +
        ((realHours.preparation_minutes_per_day * realHours.working_days_per_week) / 60) +
        realHours.mental_load_hours_per_week

      free_hours_week = Math.max(0, Math.round(168 - totalHours))

      if (incomes && incomes.length > 0) {
        const monthly = incomes.reduce((sum, inc) => {
          switch (inc.frequency) {
            case 'weekly':   return sum + inc.amount * 4.33
            case 'biweekly': return sum + inc.amount * 2
            default:         return sum + inc.amount
          }
        }, 0)
        hourly_rate = totalHours > 0 ? monthly / (totalHours * 4.33) : 15
      }
    }

    // Intentar obtener gap de M3 (brujula)
    const { data: goals } = await supabase
      .from('freedom_goals')
      .select('monthly_income_target')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (goals && goals.length > 0) {
      const target = goals[0].monthly_income_target ?? 0
      const currentIncome = (incomes ?? []).reduce((sum, inc) => {
        switch (inc.frequency) {
          case 'weekly':   return sum + inc.amount * 4.33
          case 'biweekly': return sum + inc.amount * 2
          default:         return sum + inc.amount
        }
      }, 0)
      monthly_gap = Math.max(0, target - currentIncome)
    }

    return { hourly_rate, free_hours_week, monthly_gap }
  } catch {
    return { hourly_rate: 15, free_hours_week: 20, monthly_gap: 1000 }
  }
}

export async function generateSprint(
  ideaId: string
): Promise<ActionResult<Sprint>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: idea } = await supabase
      .from('ideas')
      .select('id, title, concept, status')
      .eq('id', ideaId)
      .eq('user_id', userId)
      .single()

    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const active = await getActiveSprintForIdea(ideaId)
    if (active.ok && active.data) return { ok: true, data: active.data }

    const ctx     = await getUserContext(userId, supabase)
    const provider = getProvider()

    const prompt = `Eres un coach de negocios práctico. El usuario es un empleado que quiere construir una fuente de ingreso paralela. Su idea es:

Título: ${idea.title}
Descripción: ${idea.concept ?? 'Sin descripción'}

Contexto del usuario:
- Horas libres por semana: ${ctx.free_hours_week}
- Ingreso actual por hora: $${ctx.hourly_rate.toFixed(2)}
- Gap mensual hacia su meta: $${ctx.monthly_gap.toFixed(0)}

Genera un sprint de 5 días con tareas concretas y accionables.

REGLAS:
- Cada tarea debe poderse hacer en 10-30 minutos máximo
- Las tareas van de menor a mayor compromiso (Día 1 = observar, Día 5 = acción real)
- Usa lenguaje directo en segunda persona, sin jerga de negocios
- El Día 1 siempre involucra hablar con personas reales que tengan el problema
- El Día 5 siempre termina con un experimento listo para lanzar
- NO asumas que el usuario tiene capital, equipo, o experiencia técnica

Responde SOLO en JSON con este formato exacto, sin markdown:
{
  "tasks": [
    {
      "day_number": 1,
      "emoji": "🔍",
      "title": "Nombre corto",
      "task": "Instrucción concreta en segunda persona",
      "duration_minutes": 20,
      "detail": "Explicación de cómo hacerla",
      "goal": "Qué se espera al completar"
    }
  ]
}`

    const result = await provider.chat({
      system:   'Eres un coach de negocios práctico. Responde SOLO con JSON válido, sin markdown ni texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    })

    if (!result.ok) return { ok: false, error: 'Error al generar el sprint con AI' }

    await trackUsage({
      user_id:       userId,
      provider:      result.data.provider,
      feature:       AI_USAGE_FEATURES.SPRINT_GENERATION,
      tokens_input:  result.data.tokens_input,
      tokens_output: result.data.tokens_output,
      cost_usd:      result.data.cost_usd,
    })

    let tasks: SprintTask[]
    try {
      const clean = result.data.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)
      tasks = parsed.tasks
      if (!Array.isArray(tasks) || tasks.length !== 5) throw new Error('Formato incorrecto')
    } catch {
      return { ok: false, error: 'La AI devolvió un formato inesperado' }
    }

    // Marcar idea como en_sprint (abandonar sprint previo si lo hay)
    await supabase
      .from('sprints')
      .update({ status: 'abandoned' })
      .eq('idea_id', ideaId)
      .eq('status', 'active')

    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert({ user_id: userId, idea_id: ideaId, tasks_json: tasks, status: 'active' })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    await supabase.from('ideas').update({ status: 'en_sprint' }).eq('id', ideaId)

    return { ok: true, data: mapSprint(sprint, []) }
  } catch (e) {
    console.error('[generateSprint]', e)
    return { ok: false, error: 'Error al generar el sprint' }
  }
}

export async function getSprint(
  sprintId: string
): Promise<ActionResult<Sprint>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', sprintId)
      .eq('user_id', userId)
      .single()

    if (error || !sprint) return { ok: false, error: 'Sprint no encontrado' }

    const { data: progress } = await supabase
      .from('sprint_day_progress')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('day_number', { ascending: true })

    return { ok: true, data: mapSprint(sprint, (progress ?? []).map(mapDayProgress)) }
  } catch (e) {
    console.error('[getSprint]', e)
    return { ok: false, error: 'Error al obtener el sprint' }
  }
}

export async function getActiveSprintForIdea(
  ideaId: string
): Promise<ActionResult<Sprint | null>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint } = await supabase
      .from('sprints')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!sprint) return { ok: true, data: null }

    const { data: progress } = await supabase
      .from('sprint_day_progress')
      .select('*')
      .eq('sprint_id', sprint.id)
      .order('day_number', { ascending: true })

    return { ok: true, data: mapSprint(sprint, (progress ?? []).map(mapDayProgress)) }
  } catch (e) {
    console.error('[getActiveSprintForIdea]', e)
    return { ok: false, error: 'Error al obtener sprint activo' }
  }
}

export async function getActiveSprint(): Promise<ActionResult<Sprint | null>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint } = await supabase
      .from('sprints')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!sprint) return { ok: true, data: null }

    const { data: progress } = await supabase
      .from('sprint_day_progress')
      .select('*')
      .eq('sprint_id', sprint.id)
      .order('day_number', { ascending: true })

    return { ok: true, data: mapSprint(sprint, (progress ?? []).map(mapDayProgress)) }
  } catch (e) {
    console.error('[getActiveSprint]', e)
    return { ok: false, error: 'Error al obtener sprint activo' }
  }
}

export async function completeDayProgress(
  input: CompleteDayInput
): Promise<ActionResult<DayProgress>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    // Verificar ownership via sprint
    const { data: sprint } = await supabase
      .from('sprints')
      .select('id')
      .eq('id', input.sprintId)
      .eq('user_id', userId)
      .single()

    if (!sprint) return { ok: false, error: 'Sprint no encontrado' }

    const now   = new Date().toISOString()
    const patch = {
      sprint_id:    input.sprintId,
      day_number:   input.dayNumber,
      notes:        input.notes ?? null,
      completed:    true,
      completed_at: now,
    }

    const { data, error } = await supabase
      .from('sprint_day_progress')
      .upsert(patch, { onConflict: 'sprint_id,day_number' })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapDayProgress(data) }
  } catch (e) {
    console.error('[completeDayProgress]', e)
    return { ok: false, error: 'Error al completar el día' }
  }
}

export async function updateDayNotes(
  input: UpdateDayNotesInput
): Promise<ActionResult<DayProgress>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint } = await supabase
      .from('sprints')
      .select('id')
      .eq('id', input.sprintId)
      .eq('user_id', userId)
      .single()

    if (!sprint) return { ok: false, error: 'Sprint no encontrado' }

    const { data, error } = await supabase
      .from('sprint_day_progress')
      .upsert(
        { sprint_id: input.sprintId, day_number: input.dayNumber, notes: input.notes },
        { onConflict: 'sprint_id,day_number' }
      )
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapDayProgress(data) }
  } catch (e) {
    console.error('[updateDayNotes]', e)
    return { ok: false, error: 'Error al actualizar notas' }
  }
}

export async function completeSprint(
  sprintId: string
): Promise<ActionResult<Sprint>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint, error } = await supabase
      .from('sprints')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sprintId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !sprint) return { ok: false, error: 'Sprint no encontrado' }

    await supabase.from('ideas').update({ status: 'sprint_completado' }).eq('id', sprint.idea_id)

    return { ok: true, data: mapSprint(sprint) }
  } catch (e) {
    console.error('[completeSprint]', e)
    return { ok: false, error: 'Error al completar el sprint' }
  }
}

export async function abandonSprint(
  sprintId: string
): Promise<ActionResult<Sprint>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()

    const { data: sprint, error } = await supabase
      .from('sprints')
      .update({ status: 'abandoned' })
      .eq('id', sprintId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !sprint) return { ok: false, error: 'Sprint no encontrado' }

    await supabase.from('ideas').update({ status: 'nueva' }).eq('id', sprint.idea_id)

    return { ok: true, data: mapSprint(sprint) }
  } catch (e) {
    console.error('[abandonSprint]', e)
    return { ok: false, error: 'Error al abandonar el sprint' }
  }
}
