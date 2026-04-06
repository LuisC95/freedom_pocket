'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { DEV_USER_ID } from '@/lib/dev-user'
import type {
  Transaction,
  TransactionInsert,
  TransactionCategory,
  Budget,
  RecurringTemplate,
  RecurringTemplateInsert,
  TransactionGroup,
  MonthlySnapshot,
  DashboardMetrics,
  DashboardData,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function calcHorasReales(h: {
  contracted_hours_per_week: number
  extra_hours_per_week: number
  commute_minutes_per_day: number
  preparation_minutes_per_day: number
  mental_load_hours_per_week: number
  working_days_per_week: number
}): number {
  const commute = (h.commute_minutes_per_day * 2 * h.working_days_per_week) / 60
  const prep = (h.preparation_minutes_per_day * h.working_days_per_week) / 60
  return h.contracted_hours_per_week + h.extra_hours_per_week + commute + prep + h.mental_load_hours_per_week
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategory(raw: any): TransactionCategory {
  return {
    id: raw.id,
    user_id: raw.user_id,
    name: raw.name,
    icon: raw.icon,
    color: raw.color,
    is_custom: raw.is_custom,
    applies_to: raw.applies_to,
    created_at: raw.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransaction(raw: any): Transaction {
  return {
    id: raw.id,
    user_id: raw.user_id,
    period_id: raw.period_id,
    category_id: raw.category_id,
    household_id: raw.household_id,
    recurring_template_id: raw.recurring_template_id,
    type: raw.type,
    amount: Number(raw.amount),
    currency: raw.currency,
    transaction_date: raw.transaction_date,
    notes: raw.notes,
    price_per_hour_snapshot: raw.price_per_hour_snapshot ? Number(raw.price_per_hour_snapshot) : null,
    split_type: raw.split_type,
    split_percentage: raw.split_percentage,
    status: raw.status,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    category: raw.transaction_categories ? mapCategory(raw.transaction_categories) : undefined,
  }
}

async function getPricePerHour(
  supabase: ReturnType<typeof createAdminClient>,
  periodId: string
): Promise<number | null> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('precio_hora_referencia')
    .eq('user_id', DEV_USER_ID)
    .single()

  if (settings?.precio_hora_referencia) return Number(settings.precio_hora_referencia)

  const [{ data: incomes }, { data: hours }] = await Promise.all([
    supabase.from('incomes').select('amount, frequency').eq('user_id', DEV_USER_ID).eq('period_id', periodId),
    supabase.from('real_hours').select('contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week').eq('user_id', DEV_USER_ID).eq('period_id', periodId).single(),
  ])

  if (!incomes?.length || !hours) return null

  const totalMes = incomes.reduce((sum, i) => {
    const amt = Number(i.amount)
    if (i.frequency === 'weekly') return sum + amt * 4.33
    if (i.frequency === 'biweekly') return sum + amt * 2
    return sum + amt
  }, 0)

  const horasSemanales = calcHorasReales(hours)
  return horasSemanales > 0 ? totalMes / (horasSemanales * 4.33) : null
}

// ─── isTemplatePending ────────────────────────────────────────────────────────

function isTemplatePending(
  t: { frequency?: string; day_of_month: number; month_of_year?: number | null; custom_interval_days?: number | null; last_confirmed_at: string | null },
  hoy: Date,
  confirmedTemplateIds: Set<string>,
  templateId?: string
): boolean {
  const freq = t.frequency ?? 'monthly'
  const last = t.last_confirmed_at ? new Date(t.last_confirmed_at) : null

  switch (freq) {
    case 'daily': {
      const todayStr = hoy.toISOString().slice(0, 10)
      return !last || last.toISOString().slice(0, 10) !== todayStr
    }
    case 'weekly': {
      const targetDay = t.day_of_month === 7 ? 0 : t.day_of_month // 1=Lun..6=Sab, 7=Dom→0
      if (hoy.getDay() !== targetDay) return false
      const startOfWeek = new Date(hoy)
      startOfWeek.setDate(hoy.getDate() - hoy.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return !last || last < startOfWeek
    }
    case 'biweekly': {
      const targetDay = t.day_of_month === 7 ? 0 : t.day_of_month
      if (hoy.getDay() !== targetDay) return false
      if (!last) return true
      const daysSince = Math.floor((hoy.getTime() - last.getTime()) / 86400000)
      return daysSince >= 14
    }
    case 'monthly':
      return !(templateId ? confirmedTemplateIds.has(templateId) : false) && t.day_of_month <= hoy.getDate()
    case 'annual': {
      const monthOk = (hoy.getMonth() + 1) === (t.month_of_year ?? 1)
      const dayOk = hoy.getDate() >= t.day_of_month
      const yearStart = new Date(hoy.getFullYear(), 0, 1)
      return monthOk && dayOk && (!last || last < yearStart)
    }
    case 'custom': {
      const interval = t.custom_interval_days ?? 30
      if (!last) return true
      const daysSince = Math.floor((hoy.getTime() - last.getTime()) / 86400000)
      return daysSince >= interval
    }
    default:
      return false
  }
}

// ─── getDashboardData ─────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient()

  const { data: period } = await supabase
    .from('periods')
    .select('id, start_date, end_date')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  const emptyMetrics: DashboardMetrics = {
    total_income_period: 0,
    total_expense_period: 0,
    net_period: 0,
    retention_rate: 0,
    dias_autonomia: null,
    gasto_diario: null,
    price_per_hour: null,
  }

  if (!period) {
    return {
      periodo_activo: null,
      metrics: emptyMetrics,
      transaction_groups: [],
      monthly_history: [],
      budgets: [],
      recurring_templates: [],
      pending_recurring: [],
      categories: [],
    }
  }

  const hoy = new Date()
  const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const seisAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1)
  const todayStr = hoy.toISOString().slice(0, 10)
  const inicioMesStr = inicioMesActual.toISOString().slice(0, 10)
  const seisAtrasStr = seisAtras.toISOString().slice(0, 10)

  // Ventana rodante: días del mes actual - 1
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const ventanaInicio = new Date(hoy)
  ventanaInicio.setDate(ventanaInicio.getDate() - (diasDelMes - 1))
  const ventanaStr = ventanaInicio.toISOString().slice(0, 10)

  const [
    { data: txRaw },
    { data: txHistoryRaw },
    { data: budgetsRaw },
    { data: templatesRaw },
    { data: categoriesRaw },
    { data: incomesRaw },
    { data: incomeEntriesRaw },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, transaction_categories(*)')
      .eq('user_id', DEV_USER_ID)
      .eq('period_id', period.id)
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('user_id', DEV_USER_ID)
      .gte('transaction_date', seisAtrasStr)
      .lt('transaction_date', inicioMesStr),
    supabase
      .from('budgets')
      .select('*, transaction_categories(*)')
      .eq('user_id', DEV_USER_ID)
      .eq('is_active', true),
    supabase
      .from('recurring_templates')
      .select('*, transaction_categories(*)')
      .eq('user_id', DEV_USER_ID)
      .eq('is_active', true),
    supabase
      .from('transaction_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${DEV_USER_ID}`)
      .order('name'),
    supabase
      .from('incomes')
      .select('amount, frequency')
      .eq('user_id', DEV_USER_ID)
      .eq('period_id', period.id),
    supabase
      .from('income_entries')
      .select('amount, entry_type, entry_date')
      .eq('user_id', DEV_USER_ID)
      .gte('entry_date', ventanaStr)
      .lte('entry_date', todayStr),
  ])

  const pricePerHour = await getPricePerHour(supabase, period.id)

  // ── Transactions → TransactionGroup[] ────────────────────────────────────
  const transactions: Transaction[] = (txRaw ?? []).map(mapTransaction)
  const groupMap: Map<string, Transaction[]> = new Map()
  for (const tx of transactions) {
    const key = tx.transaction_date
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(tx)
  }
  const transaction_groups: TransactionGroup[] = Array.from(groupMap.entries()).map(([date, txs]) => ({
    date,
    transactions: txs,
    day_total_income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    day_total_expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  }))

  // ── Monthly history ───────────────────────────────────────────────────────
  const monthlyMap: Map<string, { income: number; expense: number }> = new Map()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i - 1, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { income: 0, expense: 0 })
  }
  for (const tx of txHistoryRaw ?? []) {
    const key = tx.transaction_date.slice(0, 7)
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!
      if (tx.type === 'income') entry.income += Number(tx.amount)
      else entry.expense += Number(tx.amount)
    }
  }
  const monthly_history: MonthlySnapshot[] = Array.from(monthlyMap.entries()).map(([month, v]) => {
    const [year, mon] = month.split('-').map(Number)
    return {
      month,
      month_label: MONTH_LABELS[mon - 1],
      total_income: v.income,
      total_expense: v.expense,
      net: v.income - v.expense,
    }
  })

  // ── Budgets ───────────────────────────────────────────────────────────────
  const txThisMonth = transactions.filter(t => t.transaction_date >= inicioMesStr && t.type === 'expense')
  const spentByCategory: Record<string, number> = {}
  for (const tx of txThisMonth) {
    spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] ?? 0) + tx.amount
  }

  const budgets: Budget[] = (budgetsRaw ?? []).map(b => {
    const spent = spentByCategory[b.category_id] ?? 0
    const avg = b.avg_amount ? Number(b.avg_amount) : null
    return {
      id: b.id,
      user_id: b.user_id,
      category_id: b.category_id,
      expense_type: b.expense_type,
      source: b.source,
      is_active: b.is_active,
      avg_amount: avg,
      suggested_amount: b.suggested_amount ? Number(b.suggested_amount) : null,
      created_at: b.created_at,
      updated_at: b.updated_at,
      category: b.transaction_categories ? mapCategory(b.transaction_categories) : undefined,
      spent_this_month: spent,
      pct_of_avg: avg && avg > 0 ? Math.round((spent / avg) * 100) : undefined,
    }
  })

  // ── Recurring templates ───────────────────────────────────────────────────
  const confirmedTemplateIds = new Set(
    transactions.filter(t => t.recurring_template_id).map(t => t.recurring_template_id!)
  )

  const recurring_templates: RecurringTemplate[] = (templatesRaw ?? []).map(t => ({
    id: t.id,
    user_id: t.user_id,
    household_id: t.household_id,
    category_id: t.category_id,
    name: t.name,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    frequency: (t.frequency ?? 'monthly') as RecurringTemplate['frequency'],
    day_of_month: t.day_of_month,
    month_of_year: t.month_of_year ?? null,
    custom_interval_days: t.custom_interval_days ?? null,
    is_active: t.is_active,
    contract_start_date: t.contract_start_date,
    contract_end_date: t.contract_end_date,
    total_debt_amount: t.total_debt_amount ? Number(t.total_debt_amount) : null,
    ping_frequency_days: t.ping_frequency_days,
    last_confirmed_at: t.last_confirmed_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
    category: t.transaction_categories ? mapCategory(t.transaction_categories) : undefined,
    is_pending_this_period: isTemplatePending(t, hoy, confirmedTemplateIds, t.id),
  }))

  const pending_recurring = recurring_templates.filter(t => t.is_pending_this_period)

  // ── Categories ────────────────────────────────────────────────────────────
  const categories: TransactionCategory[] = (categoriesRaw ?? []).map(mapCategory)

  // ── Métricas ──────────────────────────────────────────────────────────────
  // Ingresos: entradas reales en la ventana rodante; fallback a proyección mensual
  const entries = incomeEntriesRaw ?? []
  const total_income_period = entries.length > 0
    ? entries.reduce((s, e) => {
        const amt = Number(e.amount)
        return e.entry_type === 'deduction' ? s - amt : s + amt
      }, 0)
    : (incomesRaw ?? []).reduce((s, i) => {
        const amt = Number(i.amount)
        if (i.frequency === 'weekly') return s + amt * 4.33
        if (i.frequency === 'biweekly') return s + amt * 2
        return s + amt
      }, 0)

  // Gastos: solo los que caen dentro de la ventana rodante
  const total_expense_period = transactions
    .filter(t => t.transaction_date >= ventanaStr)
    .reduce((s, t) => s + t.amount, 0)
  const net_period = total_income_period - total_expense_period
  const retention_rate = total_income_period > 0 ? Math.round((net_period / total_income_period) * 100) : 0
  const dias_en_ventana = diasDelMes - 1
  const gasto_diario = dias_en_ventana > 0 && total_expense_period > 0
    ? total_expense_period / dias_en_ventana
    : null
  const dias_autonomia = gasto_diario && gasto_diario > 0
    ? Math.round((net_period / gasto_diario) * 10) / 10
    : null

  return {
    periodo_activo: period,
    metrics: { total_income_period, total_expense_period, net_period, retention_rate, dias_autonomia, gasto_diario, price_per_hour: pricePerHour },
    transaction_groups,
    monthly_history,
    budgets,
    recurring_templates,
    pending_recurring,
    categories,
  }
}

// ─── createTransaction ────────────────────────────────────────────────────────

export async function createTransaction(
  data: TransactionInsert
): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = createAdminClient()

  const { data: period } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  const pricePerHour = period ? await getPricePerHour(supabase, period.id) : null

  const { data: row, error } = await supabase
    .from('transactions')
    .insert({
      ...data,
      user_id: DEV_USER_ID,
      price_per_hour_snapshot: data.price_per_hour_snapshot ?? pricePerHour,
      status: data.status ?? 'confirmed',
    })
    .select('*, transaction_categories(*)')
    .single()

  if (error) return { data: null, error: error.message }

  await recalculateBudgetAvgs()
  return { data: mapTransaction(row), error: null }
}

// ─── updateTransaction ────────────────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  data: Partial<Omit<TransactionInsert, 'period_id'>>
): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('transactions')
    .update(data)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select('*, transaction_categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapTransaction(row), error: null }
}

// ─── deleteTransaction ────────────────────────────────────────────────────────

export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  if (error) return { error: error.message }

  await recalculateBudgetAvgs()
  return { error: null }
}

// ─── getCategories ────────────────────────────────────────────────────────────

export async function getCategories(
  applies_to?: 'expense' | 'income' | 'both'
): Promise<TransactionCategory[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('transaction_categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${DEV_USER_ID}`)
    .order('name')

  if (applies_to && applies_to !== 'both') {
    query = supabase
      .from('transaction_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${DEV_USER_ID}`)
      .in('applies_to', [applies_to, 'both'])
      .order('name')
  }

  const { data } = await query
  return (data ?? []).map(mapCategory)
}

// ─── createCategory ───────────────────────────────────────────────────────────

export async function createCategory(data: {
  name: string
  applies_to: 'expense' | 'income' | 'both'
  color?: string | null
  icon?: string | null
}): Promise<{ data: TransactionCategory | null; error: string | null }> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('transaction_categories')
    .insert({ ...data, user_id: DEV_USER_ID, is_custom: true })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapCategory(row), error: null }
}

// ─── upsertBudget ─────────────────────────────────────────────────────────────

export async function upsertBudget(
  category_id: string,
  suggested_amount: number
): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('category_id', category_id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('budgets')
      .update({ suggested_amount, source: 'user', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    return { error: error?.message ?? null }
  } else {
    const { error } = await supabase
      .from('budgets')
      .insert({
        user_id: DEV_USER_ID,
        category_id,
        expense_type: 'variable',
        source: 'user',
        suggested_amount,
        is_active: true,
      })
    return { error: error?.message ?? null }
  }
}

// ─── recalculateBudgetAvgs ────────────────────────────────────────────────────

async function recalculateBudgetAvgs(): Promise<void> {
  const supabase = createAdminClient()

  const hoy = new Date()
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
  const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const { data: txs } = await supabase
    .from('transactions')
    .select('category_id, amount, transaction_date')
    .eq('user_id', DEV_USER_ID)
    .eq('type', 'expense')
    .gte('transaction_date', tresMesesAtras.toISOString().slice(0, 10))
    .lt('transaction_date', inicioMesActual.toISOString().slice(0, 10))

  if (!txs?.length) return

  // Agrupar por categoría y por mes
  const byCategory: Record<string, Record<string, number>> = {}
  for (const tx of txs) {
    const month = tx.transaction_date.slice(0, 7)
    if (!byCategory[tx.category_id]) byCategory[tx.category_id] = {}
    byCategory[tx.category_id][month] = (byCategory[tx.category_id][month] ?? 0) + Number(tx.amount)
  }

  // Calcular promedio por categoría
  for (const [category_id, monthMap] of Object.entries(byCategory)) {
    const monthTotals = Object.values(monthMap)
    const avg_amount = monthTotals.reduce((s, v) => s + v, 0) / monthTotals.length

    const { data: existing } = await supabase
      .from('budgets')
      .select('id, source')
      .eq('user_id', DEV_USER_ID)
      .eq('category_id', category_id)
      .single()

    if (existing) {
      await supabase
        .from('budgets')
        .update({ avg_amount, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({
        user_id: DEV_USER_ID,
        category_id,
        expense_type: 'variable',
        source: 'system',
        avg_amount,
        is_active: true,
      })
    }
  }
}

// ─── getPendingRecurringTransactions ─────────────────────────────────────────

export async function getPendingRecurringTransactions(): Promise<RecurringTemplate[]> {
  const supabase = createAdminClient()

  const { data: period } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  if (!period) return []

  const { data: templates } = await supabase
    .from('recurring_templates')
    .select('*, transaction_categories(*)')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)

  if (!templates?.length) return []

  const { data: confirmed } = await supabase
    .from('transactions')
    .select('recurring_template_id')
    .eq('user_id', DEV_USER_ID)
    .eq('period_id', period.id)
    .not('recurring_template_id', 'is', null)

  const confirmedIds = new Set((confirmed ?? []).map(t => t.recurring_template_id))
  const hoy = new Date()

  return templates
    .filter(t => isTemplatePending(t, hoy, confirmedIds, t.id))
    .map(t => ({ ...t, amount: Number(t.amount), is_pending_this_period: true, category: t.transaction_categories ? mapCategory(t.transaction_categories) : undefined }))
}

// ─── approveRecurringTransaction ─────────────────────────────────────────────

export async function approveRecurringTransaction(
  template_id: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const [{ data: template }, { data: period }] = await Promise.all([
    supabase.from('recurring_templates').select('*').eq('id', template_id).single(),
    supabase.from('periods').select('id').eq('user_id', DEV_USER_ID).eq('is_active', true).single(),
  ])

  if (!template) return { error: 'Plantilla no encontrada' }
  if (!period) return { error: 'Sin período activo' }

  const pricePerHour = await getPricePerHour(supabase, period.id)

  const { error } = await supabase.from('transactions').insert({
    user_id: DEV_USER_ID,
    period_id: period.id,
    category_id: template.category_id,
    household_id: template.household_id,
    recurring_template_id: template.id,
    type: template.type,
    amount: template.amount,
    currency: template.currency,
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: template.name,
    price_per_hour_snapshot: pricePerHour,
    status: 'confirmed',
  })

  if (error) return { error: error.message }

  await supabase
    .from('recurring_templates')
    .update({ last_confirmed_at: new Date().toISOString() })
    .eq('id', template_id)

  await recalculateBudgetAvgs()
  return { error: null }
}

// ─── createRecurringTemplate ──────────────────────────────────────────────────

export async function createRecurringTemplate(
  data: RecurringTemplateInsert
): Promise<{ data: RecurringTemplate | null; error: string | null }> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('recurring_templates')
    .insert({ ...data, user_id: DEV_USER_ID, is_active: true })
    .select('*, transaction_categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return {
    data: {
      ...row,
      amount: Number(row.amount),
      category: row.transaction_categories ? mapCategory(row.transaction_categories) : undefined,
    },
    error: null,
  }
}

// ─── updateRecurringTemplate ──────────────────────────────────────────────────

export async function updateRecurringTemplate(
  id: string,
  data: Partial<RecurringTemplateInsert>
): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('recurring_templates')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}

// ─── deleteRecurringTemplate ──────────────────────────────────────────────────

export async function deleteRecurringTemplate(id: string): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('recurring_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}

// ─── confirmRecurringTemplate ─────────────────────────────────────────────────

export async function confirmRecurringTemplate(id: string): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('recurring_templates')
    .update({ last_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}
