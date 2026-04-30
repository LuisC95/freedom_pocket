'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdVisibilityScope } from '@/lib/household'
import type { ActionResult } from '@/types/actions'
import type { MapaData, CaminoMatch } from '@/modules/ideas/types'
import { CAMINOS } from '@/modules/ideas/constants'

export async function getMapaData(): Promise<ActionResult<MapaData>> {
  try {
    const userId   = await getDevUserId()
    const supabase = createAdminClient()
    const scope = await getHouseholdVisibilityScope(supabase, userId)

    let hourly_rate     = 15
    let free_hours_week = 20
    let monthly_gap     = 1000
    let occupation: string | null = null

    // Perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('occupation')
      .eq('id', userId)
      .maybeSingle()

    if (profile) occupation = profile.occupation ?? null

    // Datos M1: real_hours + incomes
    const { data: realHours } = await supabase
      .from('real_hours')
      .select('contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: incomes } = await supabase
      .from('incomes')
      .select('amount, frequency')
      .in('user_id', scope.visibleIncomeUserIds)
      .eq('is_active', true)

    if (realHours) {
      const desplazamiento = (realHours.commute_minutes_per_day * realHours.working_days_per_week * 2) / 60
      const preparacion    = (realHours.preparation_minutes_per_day * realHours.working_days_per_week) / 60

      const horas_reales_semana =
        realHours.contracted_hours_per_week +
        realHours.extra_hours_per_week +
        desplazamiento +
        preparacion +
        realHours.mental_load_hours_per_week

      free_hours_week = Math.max(0, Math.round(168 - horas_reales_semana))

      const monthly_income = (incomes ?? []).reduce((sum, inc) => {
        switch (inc.frequency) {
          case 'weekly':   return sum + inc.amount * 4.33
          case 'biweekly': return sum + inc.amount * 2
          default:         return sum + inc.amount
        }
      }, 0)

      if (horas_reales_semana > 0) {
        hourly_rate = monthly_income / (horas_reales_semana * 4.33)
      }
    }

    // Datos M3: freedom_goals para calcular gap
    const { data: goals } = await supabase
      .from('freedom_goals')
      .select('monthly_income_target')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (goals && goals.length > 0 && goals[0].monthly_income_target) {
      const currentIncome = (incomes ?? []).reduce((sum, inc) => {
        switch (inc.frequency) {
          case 'weekly':   return sum + inc.amount * 4.33
          case 'biweekly': return sum + inc.amount * 2
          default:         return sum + inc.amount
        }
      }, 0)
      monthly_gap = Math.max(0, goals[0].monthly_income_target - currentIncome)
    }

    // Contar observaciones para el match de "Resuelve un problema"
    const { count: obsCount } = await supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Calcular match % para cada camino
    const caminos: CaminoMatch[] = CAMINOS.map(c => {
      let match = 50
      if (c.id === 'servicios') {
        // Match alto si tiene pocas horas libres (ya tiene trabajo) y ingreso > 0
        match = Math.min(98, 70 + Math.round(free_hours_week < 20 ? 20 : 10))
      } else if (c.id === 'problemas') {
        // Match alto si tiene observaciones en el Cazador
        const obsBonus = Math.min(30, (obsCount ?? 0) * 5)
        match = 50 + obsBonus
      } else if (c.id === 'contenido') {
        // Match alto si tiene más horas libres
        match = Math.min(80, 40 + Math.round(free_hours_week * 1.5))
      }
      return { id: c.id, match }
    })

    return {
      ok: true,
      data: { hourly_rate, free_hours_week, monthly_gap, occupation, caminos },
    }
  } catch (e) {
    console.error('[getMapaData]', e)
    // Fallback con valores por defecto
    const defaultCaminos: CaminoMatch[] = [
      { id: 'servicios', match: 94 },
      { id: 'problemas', match: 78 },
      { id: 'contenido', match: 61 },
    ]
    return {
      ok: true,
      data: { hourly_rate: 15, free_hours_week: 20, monthly_gap: 1000, occupation: null, caminos: defaultCaminos },
    }
  }
}
