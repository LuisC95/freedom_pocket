'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type {
  Period,
  DashboardStats,
  BudgetProgress,
  TransactionWithHours,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodDays(start: string, end: string | null): number {
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000))
}

// Precio Real por Hora (Algoritmo 1) — horas reales por semana
function realHoursPerWeek(h: {
  contracted_hours_per_week: number
  extra_hours_per_week: number
  commute_minutes_per_day: number
  preparation_minutes_per_day: number
  mental_load_hours_per_week: number
  working_days_per_week: number
}): number {
  const commute = (h.commute_minutes_per_day * 2 * h.working_days_per_week) / 60
  const prep = (h.preparation_minutes_per_day * h.working_days_per_week) / 60
  return (
    h.contracted_hours_per_week +
    h.extra_hours_per_week +
    commute +
    prep +
    h.mental_load_hours_per_week
  )
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getActivePeriod(userId: string): Promise<Period | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('periods')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  return data
}

export async function getDashboardStats(
  userId: string,
  periodId: string
): Promise<DashboardStats> {
  const supabase = createAdminClient()

  const [
    { data: period },
    { data: incomes },
    { data: expenses },
    { data: hoursRows },
  ] = await Promise.all([
    supabase.from('periods').select('start_date, end_date').eq('id', periodId).single(),
    supabase.from('incomes').select('amount').eq('user_id', userId).eq('period_id', periodId),
    supabase.from('transactions').select('amount').eq('user_id', userId).eq('period_id', periodId).eq('type', 'expense'),
    supabase.from('real_hours').select('contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week').eq('user_id', userId).eq('period_id', periodId),
  ])

  const total_income = incomes?.reduce((s, r) => s + Number(r.amount), 0) ?? 0
  const total_expense = expenses?.reduce((s, r) => s + Number(r.amount), 0) ?? 0

  // Horas reales del periodo (Algoritmo 1)
  const totalHoursRow = hoursRows?.[0] ?? null
  let hourly_rate = 0
  if (totalHoursRow && total_income > 0) {
    const weeks = periodDays(period?.start_date ?? '', period?.end_date ?? null) / 7
    const hoursInPeriod = realHoursPerWeek(totalHoursRow) * weeks
    hourly_rate = hoursInPeriod > 0 ? total_income / hoursInPeriod : 0
  }

  const cost_in_hours = hourly_rate > 0 ? total_expense / hourly_rate : 0

  // Progreso del periodo
  const start = period?.start_date ?? new Date().toISOString()
  const end = period?.end_date ?? null
  const totalDays = periodDays(start, end)
  const elapsed = Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / 86400000))
  const month_progress = Math.min(100, Math.round((elapsed / totalDays) * 100))

  // Delta vs periodo anterior
  let delta_vs_prev_month = 0
  const { data: prevPeriod } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', false)
    .lt('end_date', period?.start_date ?? '')
    .order('end_date', { ascending: false })
    .limit(1)
    .single()

  if (prevPeriod) {
    const { data: prevExpenses } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('period_id', prevPeriod.id)
      .eq('type', 'expense')

    const prev_expense = prevExpenses?.reduce((s, r) => s + Number(r.amount), 0) ?? 0
    if (prev_expense > 0) {
      delta_vs_prev_month = Math.round(((total_expense - prev_expense) / prev_expense) * 100)
    }
  }

  return { total_income, total_expense, delta_vs_prev_month, month_progress, hourly_rate, cost_in_hours }
}

export async function getRecentTransactions(
  userId: string,
  periodId: string,
  hourlyRate: number,
  limit = 10
): Promise<TransactionWithHours[]> {
  const supabase = createAdminClient()

  const [{ data: expenses }, { data: incomes }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, amount, notes, transaction_date, transaction_categories(name)')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false })
      .limit(limit),
    supabase
      .from('incomes')
      .select('id, amount, label, type, effective_from')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .order('effective_from', { ascending: false })
      .limit(limit),
  ])

  const expenseRows: TransactionWithHours[] = (expenses ?? []).map(t => ({
    id: t.id,
    type: 'expense',
    description: t.notes ?? '',
    category: (t.transaction_categories as { name: string } | null)?.name ?? 'Sin categoría',
    date: t.transaction_date,
    amount: Number(t.amount),
    cost_in_hours: hourlyRate > 0 ? Number(t.amount) / hourlyRate : 0,
  }))

  const incomeRows: TransactionWithHours[] = (incomes ?? []).map(i => ({
    id: i.id,
    type: 'income',
    description: i.label,
    category: i.type,
    date: i.effective_from,
    amount: Number(i.amount),
    cost_in_hours: 0,
  }))

  return [...expenseRows, ...incomeRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export async function getBudgetProgress(
  userId: string,
  periodId: string
): Promise<BudgetProgress[]> {
  const supabase = createAdminClient()

  const [{ data: budgets }, { data: expenses }, { data: incomesData }] = await Promise.all([
    supabase
      .from('budgets')
      .select('percentage, expense_type, transaction_categories(name)')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('transactions')
      .select('amount, category_id, transaction_categories(name)')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('type', 'expense'),
    supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', userId)
      .eq('period_id', periodId),
  ])

  const total_income = incomesData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0

  // Gasto real agrupado por nombre de categoría
  const spentByCategory: Record<string, number> = {}
  for (const t of expenses ?? []) {
    const name = (t.transaction_categories as { name: string } | null)?.name ?? 'Sin categoría'
    spentByCategory[name] = (spentByCategory[name] ?? 0) + Number(t.amount)
  }

  return (budgets ?? []).map(b => {
    const categoryName = (b.transaction_categories as { name: string } | null)?.name ?? 'Sin categoría'
    const budgeted = (b.percentage / 100) * total_income
    const spent = spentByCategory[categoryName] ?? 0
    const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0
    return {
      category: categoryName,
      budgeted,
      spent,
      percentage: Math.round(pct),
      is_over: pct > 100,
    }
  })
}
