'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdScope, getHouseholdVisibilityScope } from '@/lib/household'
import type { ActionResult } from '@/types/actions'
import type {
  CreditCardOption,
  DashboardUserSettings,
  PaymentSource,
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
    payment_source: raw.payment_source ?? 'cash_debit',
    liability_id: raw.liability_id ?? null,
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

function normalizePaymentFields(input: {
  type?: string
  payment_source?: PaymentSource
  liability_id?: string | null
}): { payment_source: PaymentSource; liability_id: string | null } {
  if (input.type === 'expense' && input.payment_source === 'credit_card') {
    return {
      payment_source: 'credit_card',
      liability_id: input.liability_id ?? null,
    }
  }

  return {
    payment_source: 'cash_debit',
    liability_id: null,
  }
}

async function getPricePerHour(
  supabase: ReturnType<typeof createAdminClient>,
  periodId: string,
  userId: string
): Promise<number | null> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('precio_hora_referencia')
    .eq('user_id', userId)
    .single()

  if (settings?.precio_hora_referencia) return Number(settings.precio_hora_referencia)

  const [{ data: incomes }, { data: hours }] = await Promise.all([
    supabase.from('incomes').select('amount, frequency').eq('user_id', userId).eq('period_id', periodId),
    supabase.from('real_hours').select('contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week').eq('user_id', userId).eq('period_id', periodId).single(),
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
    case 'manual':
      return false
    default:
      return false
  }
}

// ─── Payment source helpers ──────────────────────────────────────────────────

export async function getCreditCardOptions(): Promise<ActionResult<CreditCardOption[]>> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdScope(supabase, DEV_USER_ID)

  const liabilityQuery = supabase
    .from('liabilities')
    .select('id, name, current_balance, currency, is_shared, user_id, household_id')
    .eq('liability_type', 'credit_card')
    .eq('is_active', true)

  const { data, error } = scope.householdId
    ? await liabilityQuery.in('user_id', scope.memberUserIds)
    : await liabilityQuery.eq('user_id', DEV_USER_ID)

  if (error) return { ok: false, error: error.message }

  const visibleCards = (data ?? []).filter(card =>
    card.user_id === DEV_USER_ID ||
    (scope.householdId && card.household_id === scope.householdId && card.is_shared)
  )

  const otherUserIds = Array.from(new Set(
    visibleCards
      .filter(card => card.user_id !== DEV_USER_ID && card.is_shared)
      .map(card => card.user_id)
  ))

  let ownerNames: Record<string, string> = {}
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', otherUserIds)

    ownerNames = (profiles ?? []).reduce<Record<string, string>>((acc, profile) => {
      acc[profile.id] = profile.display_name || 'Miembro'
      return acc
    }, {})
  }

  return {
    ok: true,
    data: visibleCards.map(card => ({
      id: card.id,
      name: card.name,
      current_balance: Number(card.current_balance),
      currency: card.currency ?? 'USD',
      is_shared: card.is_shared,
      owner_name: card.user_id !== DEV_USER_ID ? ownerNames[card.user_id] : undefined,
    })),
  }
}

export async function updateDefaultPayment(
  payment_source: PaymentSource,
  liability_id?: string | null
): Promise<ActionResult<void>> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const settingsPayload = {
    user_id: DEV_USER_ID,
    default_payment_source: payment_source,
    default_liability_id: payment_source === 'credit_card' ? liability_id ?? null : null,
  }

  if (settingsPayload.default_payment_source === 'credit_card' && !settingsPayload.default_liability_id) {
    return { ok: false, error: 'Selecciona una tarjeta de credito' }
  }

  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(settingsPayload, { onConflict: 'user_id' })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

// ─── getDashboardData ─────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)
  const period = scope.activePeriod

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
      credit_card_options: [],
      user_settings: {
        default_payment_source: 'cash_debit',
        default_liability_id: null,
      },
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
    { data: settingsRaw },
    { data: incomesRaw },
    { data: incomeEntriesRaw },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, transaction_categories(*)')
      .in('user_id', scope.visibleExpenseUserIds)
      .in('period_id', scope.visibleExpensePeriodIds)
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .in('user_id', scope.visibleExpenseUserIds)
      .gte('transaction_date', seisAtrasStr)
      .lte('transaction_date', todayStr),
    supabase
      .from('budgets')
      .select('*, transaction_categories(*)')
      .eq('user_id', DEV_USER_ID)
      .eq('is_active', true),
    supabase
      .from('recurring_templates')
      .select('*, transaction_categories(*)')
      .in('user_id', scope.visibleExpenseUserIds)
      .eq('is_active', true),
    supabase
      .from('transaction_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${DEV_USER_ID}`)
      .order('name'),
    supabase
      .from('user_settings')
      .select('hidden_category_ids, default_payment_source, default_liability_id')
      .eq('user_id', DEV_USER_ID)
      .single(),
    supabase
      .from('incomes')
      .select('amount, frequency')
      .in('user_id', scope.visibleIncomeUserIds)
      .in('period_id', scope.visibleIncomePeriodIds),
    supabase
      .from('income_entries')
      .select('amount, entry_type, entry_date')
      .in('user_id', scope.visibleIncomeUserIds)
      .gte('entry_date', seisAtrasStr)
      .lte('entry_date', todayStr),
  ])

  const pricePerHour = await getPricePerHour(supabase, period.id, DEV_USER_ID)

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
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
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
  for (const entry of incomeEntriesRaw ?? []) {
    const key = entry.entry_date.slice(0, 7)
    if (monthlyMap.has(key)) {
      const m = monthlyMap.get(key)!
      const amt = Number(entry.amount)
      if (entry.entry_type === 'earning') m.income += amt
      else m.income -= amt
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
  const hiddenIds: string[] = (settingsRaw as any)?.hidden_category_ids ?? []
  const categories: TransactionCategory[] = (categoriesRaw ?? [])
    .filter(c => !hiddenIds.includes(c.id))
    .map(mapCategory)

  const creditCardsResult = await getCreditCardOptions()
  const credit_card_options = creditCardsResult.ok ? creditCardsResult.data : []
  const defaultPaymentSource = (settingsRaw as any)?.default_payment_source === 'credit_card'
    ? 'credit_card'
    : 'cash_debit'
  const defaultLiabilityId = (settingsRaw as any)?.default_liability_id ?? null
  const defaultCardStillAvailable = defaultLiabilityId
    ? credit_card_options.some(card => card.id === defaultLiabilityId)
    : false
  const user_settings: DashboardUserSettings = {
    default_payment_source: defaultPaymentSource === 'credit_card' && defaultCardStillAvailable
      ? 'credit_card'
      : 'cash_debit',
    default_liability_id: defaultPaymentSource === 'credit_card' && defaultCardStillAvailable
      ? defaultLiabilityId
      : null,
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  // Ingresos: entradas reales en la ventana rodante; fallback a proyección mensual
  const entries = (incomeEntriesRaw ?? []).filter(e => e.entry_date >= ventanaStr)
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
    credit_card_options,
    user_settings,
  }
}

// ─── getMonthlyHistory ────────────────────────────────────────────────────────

export async function getMonthlyHistory(months: number): Promise<MonthlySnapshot[]> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = await createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)
  const hoy = new Date()
  const nAtras = new Date(hoy.getFullYear(), hoy.getMonth() - months, 1)
  const nAtrasStr = nAtras.toISOString().slice(0, 10)
  const todayStr = hoy.toISOString().slice(0, 10)

  const [{ data: txRaw }, { data: entriesRaw }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .in('user_id', scope.visibleExpenseUserIds)
      .gte('transaction_date', nAtrasStr)
      .lte('transaction_date', todayStr),
    supabase
      .from('income_entries')
      .select('amount, entry_type, entry_date')
      .in('user_id', scope.visibleIncomeUserIds)
      .gte('entry_date', nAtrasStr)
      .lte('entry_date', todayStr),
  ])

  const monthlyMap = new Map<string, { income: number; expense: number }>()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { income: 0, expense: 0 })
  }

  for (const tx of txRaw ?? []) {
    const key = tx.transaction_date.slice(0, 7)
    if (monthlyMap.has(key)) {
      const m = monthlyMap.get(key)!
      if (tx.type === 'income') m.income += Number(tx.amount)
      else m.expense += Number(tx.amount)
    }
  }

  for (const entry of entriesRaw ?? []) {
    const key = entry.entry_date.slice(0, 7)
    if (monthlyMap.has(key)) {
      const m = monthlyMap.get(key)!
      const amt = Number(entry.amount)
      if (entry.entry_type === 'earning') m.income += amt
      else m.income -= amt
    }
  }

  return Array.from(monthlyMap.entries()).map(([month, v]) => {
    const [, mon] = month.split('-').map(Number)
    return {
      month,
      month_label: MONTH_LABELS[mon - 1],
      total_income: v.income,
      total_expense: v.expense,
      net: v.income - v.expense,
    }
  })
}

// ─── adjustLiabilityBalance (internal helper) ─────────────────────────────────

async function adjustLiabilityBalance(
  supabase: ReturnType<typeof createAdminClient>,
  liability_id: string,
  delta: number
) {
  const { data: lib } = await supabase
    .from('liabilities')
    .select('current_balance')
    .eq('id', liability_id)
    .single()
  if (!lib) return
  const newBalance = Math.max(0, Number(lib.current_balance) + delta)
  await supabase.from('liabilities').update({ current_balance: newBalance }).eq('id', liability_id)
}

// ─── createTransaction ────────────────────────────────────────────────────────

export async function createTransaction(
  data: TransactionInsert
): Promise<{ data: Transaction | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: period } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  const pricePerHour = period ? await getPricePerHour(supabase, period.id, DEV_USER_ID) : null
  const paymentFields = normalizePaymentFields(data)

  if (paymentFields.payment_source === 'credit_card' && !paymentFields.liability_id) {
    return { data: null, error: 'Selecciona una tarjeta de credito' }
  }

  const { data: row, error } = await supabase
    .from('transactions')
    .insert({
      ...data,
      ...paymentFields,
      user_id: DEV_USER_ID,
      price_per_hour_snapshot: data.price_per_hour_snapshot ?? pricePerHour,
      status: data.status ?? 'confirmed',
    } as any)
    .select('*, transaction_categories(*)')
    .single()

  if (error) return { data: null, error: error.message }

  if (paymentFields.payment_source === 'credit_card' && paymentFields.liability_id && data.type === 'expense') {
    await adjustLiabilityBalance(supabase, paymentFields.liability_id, Number(data.amount))
  }

  await recalculateBudgetAvgs(DEV_USER_ID)
  return { data: mapTransaction(row), error: null }
}

// ─── updateTransaction ────────────────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  data: Partial<Omit<TransactionInsert, 'period_id'>>
): Promise<{ data: Transaction | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const paymentFields: Partial<{ payment_source: PaymentSource; liability_id: string | null }> = data.payment_source
    ? normalizePaymentFields(data)
    : {}

  if (paymentFields.payment_source === 'credit_card' && !paymentFields.liability_id) {
    return { data: null, error: 'Selecciona una tarjeta de credito' }
  }

  const { data: row, error } = await supabase
    .from('transactions')
    .update({ ...data, ...paymentFields } as any)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select('*, transaction_categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapTransaction(row), error: null }
}

// ─── deleteTransaction ────────────────────────────────────────────────────────

export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: txn } = await supabase
    .from('transactions')
    .select('payment_source, liability_id, amount, type')
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .single()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  if (error) return { error: error.message }

  await recalculateBudgetAvgs(DEV_USER_ID)
  return { error: null }
}

// ─── registerCCPayment ────────────────────────────────────────────────────────

export async function registerCCPayment({
  liability_id,
  amount,
  currency,
  transaction_date,
  period_id,
  notes,
}: {
  liability_id: string
  amount: number
  currency: string
  transaction_date: string
  period_id: string
  notes?: string | null
}): Promise<{ error: string | null }> {
  if (amount <= 0) return { error: 'El monto debe ser mayor a 0' }
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Find or create the system "Pago de tarjeta" category
  let { data: category } = await supabase
    .from('transaction_categories')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('name', 'Pago de tarjeta')
    .maybeSingle()

  if (!category) {
    const { data: created, error: catErr } = await supabase
      .from('transaction_categories')
      .insert({ user_id: DEV_USER_ID, name: 'Pago de tarjeta', applies_to: 'expense', is_custom: true })
      .select('id')
      .single()
    if (catErr) return { error: catErr.message }
    category = created
  }

  const pricePerHour = await getPricePerHour(supabase, period_id, DEV_USER_ID)

  const { error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: DEV_USER_ID,
      period_id,
      category_id: category!.id,
      payment_source: 'cash_debit',
      liability_id: null,
      type: 'expense',
      amount,
      currency,
      transaction_date,
      notes: notes?.trim() || 'Pago de tarjeta de crédito',
      status: 'confirmed',
      price_per_hour_snapshot: pricePerHour,
    })

  if (txErr) return { error: txErr.message }

  // Reduce CC debt
  await adjustLiabilityBalance(supabase, liability_id, -amount)
  await recalculateBudgetAvgs(DEV_USER_ID)
  return { error: null }
}

// ─── getCategories ────────────────────────────────────────────────────────────

export async function getCategories(
  applies_to?: 'expense' | 'income' | 'both'
): Promise<TransactionCategory[]> {
  const DEV_USER_ID = await getDevUserId()
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
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('transaction_categories')
    .insert({ ...data, user_id: DEV_USER_ID, is_custom: true })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapCategory(row), error: null }
}

// ─── deleteCategory ───────────────────────────────────────────────────────────

export async function deleteCategory(
  id: string,
  replacementCategoryId?: string
): Promise<{ error: string | null; hasLinkedTransactions?: boolean }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  // Check if category has linked transactions
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('user_id', DEV_USER_ID)

  if (count && count > 0) {
    if (!replacementCategoryId) return { error: null, hasLinkedTransactions: true }
    // Reassign transactions to replacement
    const { error: reassignError } = await supabase
      .from('transactions')
      .update({ category_id: replacementCategoryId })
      .eq('category_id', id)
      .eq('user_id', DEV_USER_ID)
    if (reassignError) return { error: reassignError.message }
  }

  // Determine if system or custom category
  const { data: cat } = await supabase
    .from('transaction_categories')
    .select('user_id, is_custom')
    .eq('id', id)
    .single()

  if (!cat) return { error: 'Categoría no encontrada' }

  if (cat.is_custom && cat.user_id === DEV_USER_ID) {
    // Custom: hard delete from DB
    const { error } = await supabase
      .from('transaction_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', DEV_USER_ID)
    if (error) return { error: error.message }
  } else {
    // System: soft-hide via user_settings.hidden_category_ids
    const { data: settings } = await supabase
      .from('user_settings')
      .select('hidden_category_ids')
      .eq('user_id', DEV_USER_ID)
      .single()

    const current: string[] = (settings as any)?.hidden_category_ids ?? []
    if (!current.includes(id)) {
      await supabase
        .from('user_settings')
        .update({ hidden_category_ids: [...current, id] })
        .eq('user_id', DEV_USER_ID)
    }
  }

  return { error: null }
}

// ─── upsertBudget ─────────────────────────────────────────────────────────────

export async function upsertBudget(
  category_id: string,
  suggested_amount: number
): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
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

async function recalculateBudgetAvgs(userId: string): Promise<void> {
  const supabase = createAdminClient()

  const hoy = new Date()
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
  const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const { data: txs } = await supabase
    .from('transactions')
    .select('category_id, amount, transaction_date')
    .eq('user_id', userId)
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
      .eq('user_id', userId)
      .eq('category_id', category_id)
      .single()

    if (existing) {
      await supabase
        .from('budgets')
        .update({ avg_amount, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({
        user_id: userId,
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
  const DEV_USER_ID = await getDevUserId()
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
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const [{ data: template }, { data: period }] = await Promise.all([
    supabase.from('recurring_templates').select('*').eq('id', template_id).single(),
    supabase.from('periods').select('id').eq('user_id', DEV_USER_ID).eq('is_active', true).single(),
  ])

  if (!template) return { error: 'Plantilla no encontrada' }
  if (!period) return { error: 'Sin período activo' }

  const pricePerHour = await getPricePerHour(supabase, period.id, DEV_USER_ID)

  const { error } = await supabase.from('transactions').insert({
    user_id: DEV_USER_ID,
    period_id: period.id,
    category_id: template.category_id,
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

  await recalculateBudgetAvgs(DEV_USER_ID)
  return { error: null }
}

// ─── createRecurringTemplate ──────────────────────────────────────────────────

export async function createRecurringTemplate(
  data: RecurringTemplateInsert
): Promise<{ data: RecurringTemplate | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
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
  const DEV_USER_ID = await getDevUserId()
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
  const DEV_USER_ID = await getDevUserId()
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
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('recurring_templates')
    .update({ last_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)

  return { error: error?.message ?? null }
}
