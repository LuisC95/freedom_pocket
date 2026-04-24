'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdVisibilityScope } from '@/lib/household'
import * as pdfParseModule from 'pdf-parse'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule
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
} from '../types'

// ─── Algoritmo 1 — Precio Real por Hora ──────────────────────────────────────

function calcularIngresoMensual(income: Income, entries: IncomeEntry[]): number {
  const hoy = new Date()
  const entriesEsteMes = entries.filter(e =>
    e.income_id === income.id &&
    new Date(e.entry_date).getMonth() === hoy.getMonth() &&
    new Date(e.entry_date).getFullYear() === hoy.getFullYear()
  )

  if (entriesEsteMes.length > 0) {
    const ganancias   = entriesEsteMes.filter(e => e.entry_type === 'earning').reduce((s, e) => s + e.amount, 0)
    const deducciones = entriesEsteMes.filter(e => e.entry_type === 'deduction').reduce((s, e) => s + e.amount, 0)
    return ganancias - deducciones
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
  periodId: string
): PrecioRealPorHora {
  const total_ingresos_mes = incomes.reduce(
    (sum, income) => sum + calcularIngresoMensual(income, allEntries), 0
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEntries: IncomeEntry[] = (entriesRaw ?? []).map((e: any) => ({
    ...e,
    amount:     Number(e.amount),
    incomeName: e.incomes?.label ?? 'Sin fuente',
    incomes:    undefined,
  }))

  let estado: MiRealidadEstado
  if (ingresos.length === 0 && !real_hours) estado = 'sin_datos'
  else if (ingresos.length > 0 && !real_hours) estado = 'solo_ingresos'
  else if (ingresos.length === 0 && real_hours) estado = 'solo_horas'
  else estado = 'completo'

  const precio_real_por_hora =
    estado === 'completo' && real_hours
      ? calcularPrecioRealPorHora(ingresos, allEntries, real_hours, period.id)
      : null

  const ingresosConEntries = ingresos.map(i => ({
    ...i,
    entries: allEntries.filter(e => e.income_id === i.id),
    total_mes_calculado: calcularIngresoMensual(i, allEntries),
  }))

  // ── Métricas derivadas ────────────────────────────────────────────────────
  const endDate   = period.end_date ? new Date(period.end_date) : new Date()
  const startDate = new Date(period.start_date)
  const diasDelPeriodo = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const totalIngresosMes = ingresosConEntries.reduce((s, i) => s + i.total_mes_calculado, 0)

  const costoRealDeTrabajar = precio_real_por_hora?.precio_por_hora ?? null

  const rendimientoDeTuTiempo =
    totalIngresosMes > 0 && diasDelPeriodo > 0
      ? totalIngresosMes / (diasDelPeriodo * 24)
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
    valorRealDeTuTiempo: null,
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

  const { id, ...fields } = data

  const { data: row, error } = await supabase
    .from('incomes')
    .update(fields)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: { ...row, amount: Number(row.amount) }, error: null }
}

// ─── deleteIncome ─────────────────────────────────────────────────────────────

export async function deleteIncome(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
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

  const { error } = await supabase
    .from('income_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}

// ─── deleteIncomeEntries (batch) ──────────────────────────────────────────────

export async function deleteIncomeEntries(ids: string[]): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  if (ids.length === 0) return { error: null }
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('income_entries')
    .delete()
    .in('id', ids)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}

// ─── updateIncomeEntry ────────────────────────────────────────────────────────

export async function updateIncomeEntry(
  id: string,
  fields: { amount: number; entry_date: string; hours_worked: number | null; notes: string | null }
): Promise<{ data: IncomeEntry | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('income_entries')
    .update(fields)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: { ...row, amount: Number(row.amount) }, error: null }
}

// ─── registerPayment ─────────────────────────────────────────────────────────

export async function registerPayment(
  payload: RegisterPaymentPayload
): Promise<{ data: IncomeEntry[] | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Validar que todos los income_ids pertenecen al usuario
  const incomeIds = [...new Set(payload.components.map(c => c.income_id))]
  const { data: ownedIncomes } = await supabase
    .from('incomes')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .in('id', incomeIds)

  const ownedIds = new Set((ownedIncomes ?? []).map(i => i.id))
  const unauthorized = incomeIds.find(id => !ownedIds.has(id))
  if (unauthorized) return { data: null, error: 'Fuente de ingreso no válida' }

  const batchId = crypto.randomUUID()

  const rows = payload.components.map(c => ({
    income_id: c.income_id,
    user_id: DEV_USER_ID,
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

export async function scanPaystub(
  fileBase64: string,
  mimeType: string
): Promise<{ data: unknown | null; error: string | null }> {
  if (mimeType !== 'application/pdf') {
    return { data: null, error: 'Solo se soportan PDFs. Convierte la imagen a PDF primero.' }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return { data: null, error: 'DEEPSEEK_API_KEY no configurada' }
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64')
    const { text: rawText } = await pdfParse(buffer)

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: null, error: `DeepSeek error: ${(err as any)?.error?.message ?? response.status}` }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = await response.json() as any
    const content: string = payload?.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(content)
    return { data: parsed, error: null }
  } catch (err) {
    console.error('[scanPaystub]', err)
    const msg = err instanceof Error ? err.message : 'Error al procesar el archivo'
    return { data: null, error: msg }
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
