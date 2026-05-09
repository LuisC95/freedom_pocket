'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdVisibilityScope } from '@/lib/household'
import { adjustLiquidityBalance, ensureCashLiquidityAccount, getLiquidityAccounts } from '@/lib/liquidity'
import type {
  Income,
  IncomeInsert,
  IncomeUpdate,
  IncomeEntry,
  RealHours,
  RealHoursUpsert,
  PrecioRealPorHora,
  MiRealidadData,
  MiRealidadEstado,
  RegisterPaymentPayload,
  LiquiditySplit,
} from '../types'

// ─── Algoritmo 1 — Precio Real por Hora ──────────────────────────────────────

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`)
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysInclusive(start: Date, end: Date): number {
  const startDay = parseDateOnly(toDateOnlyString(start))
  const endDay = parseDateOnly(toDateOnlyString(end))
  return Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

function isDateInRange(value: string, start: Date, end: Date): boolean {
  const date = parseDateOnly(value)
  return date >= start && date <= end
}

function calcularIngresoMensual(
  income: Income,
  entries: IncomeEntry[],
  metricStart: Date,
  metricEnd: Date
): number {
  const entriesDelPeriodo = entries.filter(e =>
    e.income_id === income.id &&
    isDateInRange(e.entry_date, metricStart, metricEnd)
  )

  if (entriesDelPeriodo.length > 0) {
    const ganancias   = entriesDelPeriodo.filter(e => e.entry_type === 'earning').reduce((s, e) => s + e.amount, 0)
    const deducciones = entriesDelPeriodo.filter(e => e.entry_type === 'deduction').reduce((s, e) => s + e.amount, 0)
    const netoPeriodo = ganancias - deducciones
    return (netoPeriodo / daysInclusive(metricStart, metricEnd)) * 30
  }

  switch (income.frequency) {
    case 'weekly':   return income.amount * 4.33
    case 'biweekly': return income.amount * 2
    case 'monthly':  return income.amount
    default:         return income.amount
  }
}

function calcularPrecioRealPorHora(
  incomes: Income[],
  allEntries: IncomeEntry[],
  realHours: RealHours,
  periodId: string,
  metricStart: Date,
  metricEnd: Date
): PrecioRealPorHora {
  const total_ingresos_mes = incomes.reduce(
    (sum, income) => sum + calcularIngresoMensual(income, allEntries, metricStart, metricEnd), 0
  )
  const currency = incomes[0]?.currency ?? 'USD'

  const desplazamiento =
    (realHours.commute_minutes_per_day * realHours.working_days_per_week * 2) / 60
  const preparacion =
    (realHours.preparation_minutes_per_day * realHours.working_days_per_week) / 60

  const horas_reales_semana =
    realHours.contracted_hours_per_week +
    realHours.extra_hours_per_week +
    desplazamiento +
    preparacion +
    realHours.mental_load_hours_per_week

  const precio_por_hora =
    horas_reales_semana > 0 ? total_ingresos_mes / (horas_reales_semana * 4.33) : 0

  return {
    total_ingresos_mes,
    horas_reales_semana,
    desglose_horas: {
      contratadas: realHours.contracted_hours_per_week,
      extra: realHours.extra_hours_per_week,
      desplazamiento,
      preparacion,
      carga_mental: realHours.mental_load_hours_per_week,
    },
    precio_por_hora,
    currency,
    calculado_con_periodo_id: periodId,
    precio_referencia: null,
    anio_referencia: null,
    delta_vs_referencia: null,
  }
}

async function getProfileNames(
  supabase: ReturnType<typeof createAdminClient>,
  userIds: string[]
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids)

  return (data ?? []).reduce<Record<string, string>>((acc, profile) => {
    acc[profile.id] = profile.display_name || 'Miembro'
    return acc
  }, {})
}

// ─── getMiRealidadData ────────────────────────────────────────────────────────

export async function getMiRealidadData(): Promise<MiRealidadData> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)
  const period = scope.activePeriod

  if (!period) {
    return {
      periodo_activo: null, ingresos: [], allEntries: [], real_hours: null, precio_real_por_hora: null, estado: 'sin_datos',
      diasDelPeriodo: null, costoRealDeTrabajar: null, rendimientoDeTuTiempo: null, valorRealDeTuTiempo: null,
      gastoMensualEstimado: null, liquidity_accounts: [],
    }
  }

  const incomesQuery = supabase
    .from('incomes')
    .select('*')
    .in('user_id', scope.visibleIncomeUserIds)
    .order('effective_from', { ascending: false })

  const scopedIncomesQuery =
    scope.visibleIncomePeriodIds.length > 0
      ? incomesQuery.in('period_id', scope.visibleIncomePeriodIds)
      : incomesQuery.eq('id', '__no_income_scope__')

  const [{ data: incomesRaw }, { data: hoursRaw }] = await Promise.all([
    scopedIncomesQuery,
    supabase
      .from('real_hours')
      .select('*')
      .eq('user_id', DEV_USER_ID)
      .eq('period_id', period.id)
      .single(),
  ])
  await ensureCashLiquidityAccount(supabase, DEV_USER_ID)
  const liquidity_accounts = await getLiquidityAccounts(supabase, DEV_USER_ID, true)

  const ingresos: Income[] = (incomesRaw ?? []).map(i => ({ ...i, amount: Number(i.amount) }))
  const incomeIds = ingresos.map(income => income.id)
  const { data: entriesRaw } =
    incomeIds.length > 0
      ? await supabase
          .from('income_entries')
          .select('*, incomes(label)')
          .in('income_id', incomeIds)
          .order('entry_date', { ascending: false })
      : { data: [] }

  const real_hours: RealHours | null = hoursRaw ?? null
  const profileNames = await getProfileNames(supabase, [
    ...ingresos.map(income => income.user_id),
    ...(entriesRaw ?? []).map(entry => entry.user_id),
  ])

  const ingresosWithOwners: Income[] = ingresos.map(income => ({
    ...income,
    registered_by_name: profileNames[income.user_id],
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEntries: IncomeEntry[] = (entriesRaw ?? []).map((e: any) => ({
    ...e,
    amount:     Number(e.amount),
    registered_by_name: profileNames[e.user_id],
    incomeName: e.incomes?.label ?? 'Sin fuente',
    incomes:    undefined,
  }))

  const today = parseDateOnly(toDateOnlyString(new Date()))
  const periodStartDate = parseDateOnly(period.start_date)
  const periodEndDate = period.is_active ? today : period.end_date ? parseDateOnly(period.end_date) : today
  const metricStartDate = periodStartDate
  const metricEndDate = periodEndDate < periodStartDate ? periodStartDate : periodEndDate
  const metricStartStr = toDateOnlyString(metricStartDate)
  const metricEndStr = toDateOnlyString(metricEndDate)
  const diasDelPeriodo = daysInclusive(metricStartDate, metricEndDate)

  let estado: MiRealidadEstado
  if (ingresosWithOwners.length === 0 && !real_hours) estado = 'sin_datos'
  else if (ingresosWithOwners.length > 0 && !real_hours) estado = 'solo_ingresos'
  else if (ingresosWithOwners.length === 0 && real_hours) estado = 'solo_horas'
  else estado = 'completo'

  const precio_real_por_hora =
    estado === 'completo' && real_hours
      ? calcularPrecioRealPorHora(ingresosWithOwners, allEntries, real_hours, period.id, metricStartDate, metricEndDate)
      : null

  const ingresosConEntries = ingresosWithOwners.map(i => ({
    ...i,
    entries: allEntries.filter(e => e.income_id === i.id),
    total_mes_calculado: calcularIngresoMensual(i, allEntries, metricStartDate, metricEndDate),
  }))

  // ── Métricas derivadas ────────────────────────────────────────────────────
  const totalIngresosMes = ingresosConEntries.reduce((s, i) => s + i.total_mes_calculado, 0)

  const costoRealDeTrabajar = precio_real_por_hora?.precio_por_hora ?? null

  // Fix: dividir entre 30×24 (horas de vida mensual normalizadas), no entre el total de horas del período
  const HORAS_MES = 30 * 24
  const rendimientoDeTuTiempo = totalIngresosMes > 0 ? totalIngresosMes / HORAS_MES : null

  // ── Gasto mensual estimado (para valorRealDeTuTiempo) ────────────────────
  const { data: txRaw } =
    scope.visibleExpensePeriodIds.length > 0
      ? await supabase
          .from('transactions')
          .select('amount, type')
          .in('user_id', scope.visibleExpenseUserIds)
          .in('period_id', scope.visibleExpensePeriodIds)
          .gte('transaction_date', metricStartStr)
          .lte('transaction_date', metricEndStr)
          .eq('exclude_from_metrics', false)
      : { data: [] }

  const totalGastoPeriodo = (txRaw ?? [])
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const gastoDiario = totalGastoPeriodo / diasDelPeriodo
  const gastoMensualEstimado = gastoDiario * 30

  // (ingreso - gasto) por hora de vida en un mes normalizado
  const valorRealDeTuTiempo =
    totalIngresosMes > 0 && gastoMensualEstimado >= 0
      ? (totalIngresosMes - gastoMensualEstimado) / HORAS_MES
      : null

  return {
    periodo_activo: period,
    ingresos: ingresosConEntries,
    allEntries,
    real_hours,
    precio_real_por_hora,
    estado,
    diasDelPeriodo,
    costoRealDeTrabajar,
    rendimientoDeTuTiempo,
    valorRealDeTuTiempo,
    gastoMensualEstimado,
    liquidity_accounts,
  }
}

// ─── createIncome ─────────────────────────────────────────────────────────────

export async function createIncome(
  data: IncomeInsert
): Promise<{ data: Income | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('incomes')
    .insert({
      ...data,
      user_id: DEV_USER_ID,
      contributed_by: DEV_USER_ID,
      household_id: data.household_id ?? (await getHouseholdVisibilityScope(supabase, DEV_USER_ID)).householdId,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: { ...row, amount: Number(row.amount) }, error: null }
}

// ─── updateIncome ─────────────────────────────────────────────────────────────

export async function updateIncome(
  data: IncomeUpdate
): Promise<{ data: Income | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const { id, ...fields } = data

  const query = supabase
    .from('incomes')
    .update(fields)
    .eq('id', id)
    .in('user_id', scope.visibleIncomeUserIds)
    .select()

  const scopedQuery =
    scope.visibleIncomePeriodIds.length > 0
      ? query.in('period_id', scope.visibleIncomePeriodIds)
      : query.eq('period_id', '__no_visible_period__')

  const { data: rows, error } = await scopedQuery

  if (error) return { data: null, error: error.message }
  const row = rows?.[0]
  if (!row) return { data: null, error: 'No tienes permiso para editar este ingreso' }
  return { data: { ...row, amount: Number(row.amount) }, error: null }
}

// ─── deleteIncome ─────────────────────────────────────────────────────────────

export async function deleteIncome(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const query = supabase
    .from('incomes')
    .delete()
    .select('id')
    .eq('id', id)
    .in('user_id', scope.visibleIncomeUserIds)

  const scopedQuery =
    scope.visibleIncomePeriodIds.length > 0
      ? query.in('period_id', scope.visibleIncomePeriodIds)
      : query.eq('period_id', '__no_visible_period__')

  const { data, error } = await scopedQuery

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para eliminar este ingreso' }
  return { error: null }
}

// ─── upsertRealHours ──────────────────────────────────────────────────────────

export async function upsertRealHours(
  data: RealHoursUpsert
): Promise<{ data: RealHours | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('real_hours')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('period_id', data.period_id)
    .single()

  let row, error

  if (existing) {
    const { user_id, ...updateData } = data
    ;({ data: row, error } = await supabase
      .from('real_hours')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ;({ data: row, error } = await supabase
      .from('real_hours')
      .insert({ ...data, user_id: DEV_USER_ID })
      .select()
      .single())
  }

  if (error) return { data: null, error: error.message }
  return { data: row, error: null }
}

// ─── deleteIncomeEntry ────────────────────────────────────────────────────────

export async function deleteIncomeEntry(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const { data: entry } = await supabase
    .from('income_entries')
    .select('id,user_id,amount,entry_type,liquidity_asset_id,batch_id')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('income_entries')
    .delete()
    .select('id')
    .eq('id', id)
    .in('user_id', scope.visibleIncomeUserIds)

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para eliminar este registro' }

  if (entry?.batch_id) {
    // Revertir todos los movimientos del batch (soporta multi-split)
    const { data: movements } = await supabase
      .from('liquidity_movements')
      .select('asset_id, amount')
      .eq('related_income_entry_batch_id', entry.batch_id)
    const deltas = new Map<string, number>()
    for (const m of movements ?? []) {
      deltas.set(m.asset_id, (deltas.get(m.asset_id) ?? 0) - Number(m.amount))
    }
    for (const [assetId, delta] of deltas) {
      await adjustLiquidityBalance(supabase, { assetId, currentUserId: DEV_USER_ID, delta, movementType: 'manual_adjustment', allowCash: true, notes: 'Eliminación de registro de pago' })
    }
  } else if (entry?.liquidity_asset_id) {
    // Fallback para entradas legacy sin batch_id
    await adjustLiquidityBalance(supabase, {
      assetId: entry.liquidity_asset_id,
      currentUserId: DEV_USER_ID,
      delta: entry.entry_type === 'deduction' ? Number(entry.amount) : -Number(entry.amount),
      movementType: 'manual_adjustment',
      allowCash: true,
      notes: 'Eliminación de registro de pago',
    })
  }
  return { error: null }
}

// ─── deleteIncomeEntries (batch) ──────────────────────────────────────────────

export async function deleteIncomeEntries(ids: string[]): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  if (ids.length === 0) return { error: null }
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const { data: entries } = await supabase
    .from('income_entries')
    .select('id,amount,entry_type,liquidity_asset_id,batch_id')
    .in('id', ids)
    .in('user_id', scope.visibleIncomeUserIds)

  const { data, error } = await supabase
    .from('income_entries')
    .delete()
    .select('id')
    .in('id', ids)
    .in('user_id', scope.visibleIncomeUserIds)

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para eliminar estos registros' }

  // Revertir por batch_id → soporta pagos multi-split
  const batchIds = Array.from(new Set((entries ?? []).map(e => e.batch_id).filter(Boolean)))
  if (batchIds.length > 0) {
    const { data: movements } = await supabase
      .from('liquidity_movements')
      .select('asset_id, amount')
      .in('related_income_entry_batch_id', batchIds)
    const deltas = new Map<string, number>()
    for (const m of movements ?? []) {
      deltas.set(m.asset_id, (deltas.get(m.asset_id) ?? 0) - Number(m.amount))
    }
    for (const [assetId, delta] of deltas) {
      await adjustLiquidityBalance(supabase, { assetId, currentUserId: DEV_USER_ID, delta, movementType: 'manual_adjustment', allowCash: true, notes: 'Eliminación de registro de pago' })
    }
  } else {
    // Fallback para entradas legacy sin batch_id
    const deltas = new Map<string, number>()
    for (const entry of entries ?? []) {
      if (!entry.liquidity_asset_id) continue
      const delta = entry.entry_type === 'deduction' ? Number(entry.amount) : -Number(entry.amount)
      deltas.set(entry.liquidity_asset_id, (deltas.get(entry.liquidity_asset_id) ?? 0) + delta)
    }
    for (const [assetId, delta] of deltas) {
      await adjustLiquidityBalance(supabase, { assetId, currentUserId: DEV_USER_ID, delta, movementType: 'manual_adjustment', allowCash: true, notes: 'Eliminación de registro de pago' })
    }
  }
  return { error: null }
}

// ─── updateIncomeEntry ────────────────────────────────────────────────────────

export async function updateIncomeEntry(
  id: string,
  fields: { amount: number; entry_date: string; hours_worked: number | null; notes: string | null }
): Promise<{ data: IncomeEntry | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const { data: previous } = await supabase
    .from('income_entries')
    .select('id,amount,entry_type,liquidity_asset_id')
    .eq('id', id)
    .maybeSingle()

  const { data: row, error } = await supabase
    .from('income_entries')
    .update(fields)
    .eq('id', id)
    .in('user_id', scope.visibleIncomeUserIds)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  if (previous?.liquidity_asset_id) {
    const previousSigned = previous.entry_type === 'deduction' ? -Number(previous.amount) : Number(previous.amount)
    const nextSigned = row.entry_type === 'deduction' ? -Number(row.amount) : Number(row.amount)
    const delta = nextSigned - previousSigned
    if (delta !== 0) {
      const liquidityResult = await adjustLiquidityBalance(supabase, {
        assetId: previous.liquidity_asset_id,
        currentUserId: DEV_USER_ID,
        delta,
        movementType: 'manual_adjustment',
        allowCash: true,
        notes: 'Edición de registro de pago',
      })
      if (liquidityResult.error) return { data: null, error: liquidityResult.error }
    }
  }
  return { data: { ...row, amount: Number(row.amount) }, error: null }
}

// ─── registerPayment ─────────────────────────────────────────────────────────

export async function registerPayment(
  payload: RegisterPaymentPayload
): Promise<{ data: IncomeEntry[] | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  if (!payload.liquidity_splits?.length) return { data: null, error: 'Selecciona al menos una cuenta de destino' }

  // Validar que todos los income_ids sean visibles dentro del grupo familiar
  const incomeIds = [...new Set(payload.components.map(c => c.income_id))]
  const incomeQuery = supabase
    .from('incomes')
    .select('id')
    .in('user_id', scope.visibleIncomeUserIds)
    .in('id', incomeIds)

  const scopedIncomeQuery =
    scope.visibleIncomePeriodIds.length > 0
      ? incomeQuery.in('period_id', scope.visibleIncomePeriodIds)
      : incomeQuery.eq('period_id', '__no_visible_period__')

  const { data: visibleIncomes } = await scopedIncomeQuery
  const visibleIds = new Set((visibleIncomes ?? []).map(i => i.id))
  const unauthorized = incomeIds.find(id => !visibleIds.has(id))
  if (unauthorized) return { data: null, error: 'Fuente de ingreso no válida' }

  const netAmount = payload.components.reduce((sum, c) => (
    c.entry_type === 'deduction' ? sum - c.amount : sum + c.amount
  ), 0)
  if (netAmount <= 0) return { data: null, error: 'El neto del pago debe ser mayor a 0' }

  // Validar que la suma de splits sea igual al neto
  const splitsTotal = payload.liquidity_splits.reduce((s, split) => s + split.amount, 0)
  if (Math.abs(splitsTotal - netAmount) > 0.01) {
    return { data: null, error: `Los montos asignados ($${splitsTotal.toFixed(2)}) no coinciden con el neto ($${netAmount.toFixed(2)})` }
  }

  const batchId = crypto.randomUUID()
  // Para un solo split guardamos su asset_id en la entrada (compatibilidad hacia atrás).
  // Para múltiples splits usamos null — los movimientos se rastrean por batch_id.
  const primaryAssetId = payload.liquidity_splits.length === 1
    ? payload.liquidity_splits[0].asset_id
    : null

  const rows = payload.components.map(c => ({
    income_id: c.income_id,
    user_id: DEV_USER_ID,
    liquidity_asset_id: primaryAssetId,
    amount: c.amount,
    currency: 'USD',
    entry_date: payload.entry_date,
    hours_worked: c.hours_worked,
    notes: c.notes,
    entry_type: c.entry_type,
    deduction_category: c.deduction_category,
    batch_id: batchId,
  }))

  const { data, error } = await supabase
    .from('income_entries')
    .insert(rows)
    .select()

  if (error) return { data: null, error: error.message }

  // Ajustar liquidez por cada split; rollback completo si alguno falla
  const doneSplits: LiquiditySplit[] = []
  for (const split of payload.liquidity_splits) {
    const liquidityResult = await adjustLiquidityBalance(supabase, {
      assetId: split.asset_id,
      currentUserId: DEV_USER_ID,
      delta: split.amount,
      movementType: 'income_deposit',
      currency: 'USD',
      allowCash: true,
      relatedIncomeEntryBatchId: batchId,
      notes: `Registro de pago ${payload.entry_date}`,
    })
    if (liquidityResult.error) {
      await supabase.from('income_entries').delete().eq('batch_id', batchId)
      for (const done of doneSplits) {
        await adjustLiquidityBalance(supabase, { assetId: done.asset_id, currentUserId: DEV_USER_ID, delta: -done.amount, movementType: 'manual_adjustment', currency: 'USD', allowCash: true, notes: 'Reversión por error en registro de pago' })
      }
      return { data: null, error: liquidityResult.error }
    }
    doneSplits.push(split)
  }

  return {
    data: (data ?? []).map(e => ({ ...e, amount: Number(e.amount) })),
    error: null,
  }
}

// ─── scanPaystub ──────────────────────────────────────────────────────────────

const PAYSTUB_PROMPT = `Analiza este paystub y extrae la información en formato JSON.
Responde SOLO con el JSON, sin texto adicional, sin backticks.

Formato esperado:
{
  "check_date": "YYYY-MM-DD o null — fecha real de emisión del cheque o depósito (check date, payment date, pay date)",
  "pay_period_end": "YYYY-MM-DD o null — fecha de fin del período de pago",
  "earnings": [
    {
      "label": "nombre del concepto (ej: Regular Pay, Overtime, Commission)",
      "amount": 000.00,
      "hours": 00.0 o null si no aplica
    }
  ],
  "deductions": [
    {
      "label": "nombre del concepto (ej: Federal Tax, Medicare)",
      "amount": 000.00,
      "category": "federal_tax|state_tax|social_security|medicare|health_insurance|dental_insurance|vision_insurance|retirement_401k|other"
    }
  ],
  "net_pay": 000.00 o null,
  "gross_pay": 000.00 o null
}

Reglas:
- Todos los amounts son positivos
- Si no puedes leer un valor con certeza, ponlo en null
- Para category, mapea al más cercano de los valores permitidos
- check_date y pay_period_end son campos distintos — extrae ambos si están presentes`

function extractJsonObject(input: string): unknown {
  const cleaned = input
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {}

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La AI no devolvió JSON válido')
  }

  return JSON.parse(cleaned.slice(start, end + 1))
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { default: PDFParser } = await import('pdf2json')
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', () => {
      try {
        const pages = (parser.data as { Pages?: { Texts?: { R: { T: string }[] }[] }[] } | null)?.Pages
        if (!pages) {
          resolve('')
          return
        }
        const text = pages
          .flatMap(p => p.Texts ?? [])
          .map(t => t.R.map(r => {
            try { return decodeURIComponent(r.T) } catch { return r.T }
          }).join(''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        resolve(text)
      } catch (e) {
        reject(e)
      }
    })
    parser.on('pdfParser_dataError', (err) => {
      reject(err instanceof Error ? err : err.parserError || new Error('Error al parsear PDF'))
    })
    parser.parseBuffer(buffer)
  })
}

export async function scanPaystub(
  fileBase64: string,
  mimeType: string
): Promise<{ data: unknown | null; error: string | null }> {
  if (mimeType !== 'application/pdf') {
    return { data: null, error: 'Solo se soportan PDFs. Convierte la imagen a PDF primero.' }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return { data: null, error: 'El analizador de paystubs no está configurado' }
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64')
    const rawText = await extractPdfText(buffer)

    if (!rawText || rawText.trim().length < 50) {
      return { data: null, error: 'El PDF no contiene texto legible. ¿Es un PDF escaneado?' }
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: 'Eres un extractor de datos de paystubs. Responde SOLO con JSON válido, sin texto adicional, sin backticks, sin markdown.',
          },
          {
            role: 'user',
            content: `${PAYSTUB_PROMPT}\n\nTEXTO DEL PAYSTUB:\n${rawText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[scanPaystub] provider error', err || response.status)
      return { data: null, error: 'No se pudo analizar el paystub' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = await response.json() as any
    const content: string = payload?.choices?.[0]?.message?.content ?? ''
    const parsed = extractJsonObject(content)
    return { data: parsed, error: null }
  } catch (err) {
    console.error('[scanPaystub]', err)
    return { data: null, error: 'No se pudo procesar el archivo' }
  }
}

// ─── checkAndUnlockModule2 ────────────────────────────────────────────────────

export async function checkAndUnlockModule2(): Promise<void> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('module_unlocks')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('module_key', 'module_2')
    .single()

  if (existing) return

  const { data: period } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  if (!period) return

  const [{ data: incomes }, { data: hours }] = await Promise.all([
    supabase.from('incomes').select('id').eq('user_id', DEV_USER_ID).eq('period_id', period.id).limit(1),
    supabase.from('real_hours').select('id').eq('user_id', DEV_USER_ID).eq('period_id', period.id).single(),
  ])

  if (incomes && incomes.length > 0 && hours) {
    await supabase.from('module_unlocks').insert({
      user_id: DEV_USER_ID,
      module_key: 'module_2',
      unlock_trigger: 'module_1_complete',
    })
  }
}
