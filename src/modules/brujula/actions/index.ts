'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdScope, getHouseholdVisibilityScope } from '@/lib/household'
import { adjustLiquidityBalance, getLiquidityAccounts } from '@/lib/liquidity'
import type {
  Asset, AssetInsert, AssetUpdate,
  Liability, LiabilityInsert, LiabilityUpdate,
  Business, BusinessInsert, BusinessUpdate,
  FreedomGoal, FreedomGoalInsert, FreedomGoalUpdate,
  ProgressScore, ProgressLevel,
  DiasDeLibertad, FastlaneFormula, ScoreDeProgreso,
  BrujulaData,
  CreditCardExpenseHistoryItem,
  AssetMovementHistoryItem,
  LiabilityPaymentHistoryItem,
} from '../types'
import { PROGRESS_LEVEL_LABELS } from '../types'

// ─── Helpers internos M1 (replicados para evitar circular imports) ─────────────

function usdAmount(row: {
  currency?: string | null
  current_value?: number | null
  value_in_usd?: number | null
  current_balance?: number | null
  balance_in_usd?: number | null
}): number {
  const current = Number(row.current_value ?? row.current_balance ?? 0)
  if ((row.currency ?? 'USD') === 'USD') return current
  return Number(row.value_in_usd ?? row.balance_in_usd ?? current)
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

function calcularIngresoMes(
  income: { id: string; amount: number; frequency: string | null; type: string },
  entries: { income_id: string; entry_type: string; amount: number; entry_date: string }[]
): number {
  const hoy = new Date()
  const mesEntries = entries.filter(e =>
    e.income_id === income.id &&
    new Date(e.entry_date).getMonth() === hoy.getMonth() &&
    new Date(e.entry_date).getFullYear() === hoy.getFullYear()
  )
  if (mesEntries.length > 0) {
    const earn = mesEntries.filter(e => e.entry_type === 'earning').reduce((s, e) => s + e.amount, 0)
    const ded  = mesEntries.filter(e => e.entry_type === 'deduction').reduce((s, e) => s + e.amount, 0)
    return earn - ded
  }
  switch (income.frequency) {
    case 'weekly':   return income.amount * 4.33
    case 'biweekly': return income.amount * 2
    default:         return income.amount
  }
}

// ─── Algoritmos ───────────────────────────────────────────────────────────────

function calcularDiasDeLibertad(
  assets: Asset[],
  businesses: Business[],
  gasto_mensual: number,
  freedom_goals: FreedomGoal[]
): DiasDeLibertad {
  const ingreso_pasivo_activos = assets
    .filter(a => a.is_active)
    .reduce((s, a) => s + (a.monthly_yield ?? 0), 0)

  const ingreso_pasivo_negocios = businesses
    .filter(b => b.is_passive && b.include_in_fastlane && b.status === 'active')
    .reduce((s, b) => s + b.monthly_net_profit, 0)

  const ingreso_pasivo_mensual = ingreso_pasivo_activos + ingreso_pasivo_negocios
  const gasto_diario = gasto_mensual / 30
  const dias_libertad = gasto_diario > 0 ? ingreso_pasivo_mensual / gasto_diario : 0

  const active_goal = freedom_goals.find(g => !g.is_completed)
  const meta_dias = active_goal?.target_days ?? null
  const progreso_meta_pct = meta_dias && meta_dias > 0
    ? Math.min((dias_libertad / meta_dias) * 100, 100)
    : null

  return {
    ingreso_pasivo_mensual,
    gasto_mensual,
    dias_libertad,
    meta_dias,
    progreso_meta_pct,
    currency: 'USD',
  }
}

function calcularFastlane(
  assets: Asset[],
  liabilities: Liability[],
  businesses: Business[],
  ingreso_activo_mensual: number,
  ingreso_pasivo_mensual: number
): FastlaneFormula {
  const total_assets_usd = assets
    .filter(a => a.is_active)
    .reduce((s, a) => s + usdAmount(a), 0)

  const total_liabilities_usd = liabilities
    .filter(l => l.is_active)
    .reduce((s, l) => s + usdAmount(l), 0)

  const net_worth_usd = total_assets_usd - total_liabilities_usd

  const ingreso_total_mensual = ingreso_pasivo_mensual + ingreso_activo_mensual
  const fastlane_ratio = ingreso_total_mensual > 0
    ? ingreso_pasivo_mensual / ingreso_total_mensual
    : 0

  // Valoración de negocios: profit anual × sector_multiplier
  const business_valuation = businesses
    .filter(b => b.include_in_fastlane && b.status === 'active')
    .reduce((s, b) => s + (b.monthly_net_profit * 12 * b.sector_multiplier), 0)

  return {
    ingreso_pasivo_mensual,
    ingreso_activo_mensual,
    ingreso_total_mensual,
    fastlane_ratio,
    net_worth_usd,
    total_assets_usd,
    total_liabilities_usd,
    asset_value_estimado: total_assets_usd + business_valuation,
  }
}

function calcularScore(
  precio_real_hora: number | null,
  net_worth_usd: number,
  ingreso_mensual: number,
  dias_libertad: number,
  retention_rate: number | null
): ScoreDeProgreso {
  // D1 — Tiempo desacoplado: precio real hora vs $25/hr referencia
  const D1_REFERENCIA = 25
  const d1 = precio_real_hora !== null
    ? Math.min(precio_real_hora / D1_REFERENCIA, 1) * 100
    : 0

  // D2 — Salud patrimonial: patrimonio neto vs 10 años de ingreso mensual
  const D2_MESES_REF = 120
  const net_worth_positivo = Math.max(net_worth_usd, 0)
  const d2 = ingreso_mensual > 0
    ? Math.min(net_worth_positivo / (ingreso_mensual * D2_MESES_REF), 1) * 100
    : Math.min(net_worth_positivo / 500_000, 1) * 100

  // D3 — Libertad financiera: días de libertad / 365
  const d3 = Math.min(dias_libertad / 365, 1) * 100

  // D4 — Momentum: tasa de ahorro (retention rate de M2)
  const d4 = retention_rate !== null
    ? Math.max(0, Math.min(retention_rate, 100))
    : 0

  const total_score = (d1 + d2 + d3 + d4) / 4

  // Niveles: 0–24 acera | 25–49 via_lenta | 50–74 carril_aceleracion | 75–100 via_rapida
  let level: ProgressLevel
  let levelMin: number
  let levelMax: number
  if (total_score < 25)      { level = 'acera';              levelMin = 0;  levelMax = 25  }
  else if (total_score < 50) { level = 'via_lenta';          levelMin = 25; levelMax = 50  }
  else if (total_score < 75) { level = 'carril_aceleracion'; levelMin = 50; levelMax = 75  }
  else                       { level = 'via_rapida';         levelMin = 75; levelMax = 100 }

  const level_percentage = Math.min(
    ((total_score - levelMin) / (levelMax - levelMin)) * 100,
    100
  )

  const round2 = (n: number) => Math.round(n * 100) / 100

  return {
    d1_time_decoupling:  round2(d1),
    d2_asset_health:     round2(d2),
    d3_financial_freedom: round2(d3),
    d4_momentum:         round2(d4),
    total_score:         round2(total_score),
    level,
    level_label:         PROGRESS_LEVEL_LABELS[level],
    level_percentage:    round2(level_percentage),
  }
}

// ─── getBrujulaData ───────────────────────────────────────────────────────────

export async function getBrujulaData(): Promise<BrujulaData> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const hoy = new Date()
  const householdScope = await getHouseholdScope(supabase, DEV_USER_ID)
  const visibilityScope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)
  const visibleUserIds = householdScope.householdId ? householdScope.memberUserIds : [DEV_USER_ID]

  // ── Datos propios de M3 ────────────────────────────────────────────────────
  const [
    { data: assetsRaw },
    { data: liabsRaw },
    { data: bizsRaw },
    { data: goalsRaw },
    { data: latestScoreRaw },
  ] = await Promise.all([
    supabase.from('assets').select('*').in('user_id', visibleUserIds).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('liabilities').select('*').in('user_id', visibleUserIds).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('businesses').select('*').eq('user_id', DEV_USER_ID).order('created_at', { ascending: false }),
    supabase.from('freedom_goals').select('*').eq('user_id', DEV_USER_ID).order('created_at', { ascending: false }),
    supabase.from('progress_score_history').select('*').eq('user_id', DEV_USER_ID).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const profileNames = await getProfileNames(supabase, [
    ...(assetsRaw ?? []).map(asset => asset.user_id),
    ...(liabsRaw ?? []).map(liability => liability.user_id),
  ])
  const assets: Asset[]       = (assetsRaw ?? []).map(a => ({ ...a, registered_by_name: profileNames[a.user_id], current_value: Number(a.current_value), monthly_yield: a.monthly_yield != null ? Number(a.monthly_yield) : null, value_in_usd: a.value_in_usd != null ? Number(a.value_in_usd) : null, annual_rate_pct: a.annual_rate_pct != null ? Number(a.annual_rate_pct) : null, quantity: a.quantity != null ? Number(a.quantity) : null }))
  const liabilities: Liability[] = (liabsRaw ?? []).map(l => ({ ...l, registered_by_name: profileNames[l.user_id], current_balance: Number(l.current_balance), balance_in_usd: l.balance_in_usd != null ? Number(l.balance_in_usd) : null, credit_limit: l.credit_limit != null ? Number(l.credit_limit) : null, interest_rate_pct: l.interest_rate_pct != null ? Number(l.interest_rate_pct) : null, monthly_payment: l.monthly_payment != null ? Number(l.monthly_payment) : null }))
  const businesses: Business[] = (bizsRaw ?? []).map(b => ({ ...b, monthly_net_profit: Number(b.monthly_net_profit), reinvestment_percentage: Number(b.reinvestment_percentage), sector_multiplier: Number(b.sector_multiplier) }))
  const freedom_goals: FreedomGoal[] = (goalsRaw ?? [])
  const latest_score: ProgressScore | null = latestScoreRaw ? { ...latestScoreRaw, d1_time_decoupling: Number(latestScoreRaw.d1_time_decoupling), d2_asset_health: Number(latestScoreRaw.d2_asset_health), d3_financial_freedom: Number(latestScoreRaw.d3_financial_freedom), d4_momentum: Number(latestScoreRaw.d4_momentum), total_score: latestScoreRaw.total_score != null ? Number(latestScoreRaw.total_score) : null, level_percentage: Number(latestScoreRaw.level_percentage) } : null
  const liquidity_accounts = await getLiquidityAccounts(supabase, DEV_USER_ID, true)

  // ── Cross-module: datos de M1 ──────────────────────────────────────────────
  const period = visibilityScope.activePeriod

  let precio_real_hora: number | null = null
  let ingreso_activo_mensual = 0

  if (period) {
    const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    const [{ data: incomesRaw }, { data: hoursRaw }, { data: entriesRaw }] = await Promise.all([
      supabase.from('incomes').select('*').in('user_id', visibilityScope.visibleIncomeUserIds).in('period_id', visibilityScope.visibleIncomePeriodIds),
      supabase.from('real_hours').select('*').eq('user_id', DEV_USER_ID).eq('period_id', period.id).maybeSingle(),
      supabase.from('income_entries').select('id,income_id,entry_type,amount,entry_date').in('user_id', visibilityScope.visibleIncomeUserIds).gte('entry_date', inicioMes),
    ])

    const incomes = (incomesRaw ?? []).map(i => ({ ...i, amount: Number(i.amount) }))
    const entries = (entriesRaw ?? []).map(e => ({ ...e, amount: Number(e.amount) }))

    // Ingreso activo = todas las fuentes excepto 'passive'
    const activeIncomes = incomes.filter(i => i.type !== 'passive')
    ingreso_activo_mensual = activeIncomes.reduce((s, i) => s + calcularIngresoMes(i, entries), 0)

    // Precio Real por Hora
    if (hoursRaw) {
      const totalIngresos = incomes.reduce((s, i) => s + calcularIngresoMes(i, entries), 0)
      const desp = (hoursRaw.commute_minutes_per_day * hoursRaw.working_days_per_week * 2) / 60
      const prep = (hoursRaw.preparation_minutes_per_day * hoursRaw.working_days_per_week) / 60
      const horas_semana = hoursRaw.contracted_hours_per_week + hoursRaw.extra_hours_per_week + desp + prep + hoursRaw.mental_load_hours_per_week
      precio_real_hora = horas_semana > 0 ? totalIngresos / (horas_semana * 4.33) : null
    }
  }

  // ── Cross-module: datos de M2 ──────────────────────────────────────────────
  const diasDelMes = hoy.getDate()
  const daysBack   = Math.max(1, diasDelMes - 1)
  const ventana    = new Date(hoy)
  ventana.setDate(ventana.getDate() - daysBack)
  const ventanaStr = ventana.toISOString().split('T')[0]

  const { data: txRaw } = await supabase
    .from('transactions')
    .select('amount,type')
    .in('user_id', visibilityScope.visibleExpenseUserIds)
    .gte('transaction_date', ventanaStr)

  const total_expense_period = (txRaw ?? [])
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const gasto_diario_m2 = daysBack > 0 ? total_expense_period / daysBack : 0
  const gasto_mensual   = gasto_diario_m2 * 30

  // Retention rate: (ingreso - gasto) / ingreso * 100 en la ventana
  const ingreso_ventana = ingreso_activo_mensual * (daysBack / 30)
  const retention_rate_m2 = ingreso_ventana > 0
    ? Math.max(0, ((ingreso_ventana - total_expense_period) / ingreso_ventana) * 100)
    : null

  // ── Calcular algoritmos ────────────────────────────────────────────────────
  const dias_de_libertad = calcularDiasDeLibertad(assets, businesses, gasto_mensual, freedom_goals)
  const fastlane         = calcularFastlane(assets, liabilities, businesses, ingreso_activo_mensual, dias_de_libertad.ingreso_pasivo_mensual)
  const score            = calcularScore(precio_real_hora, fastlane.net_worth_usd, ingreso_activo_mensual + dias_de_libertad.ingreso_pasivo_mensual, dias_de_libertad.dias_libertad, retention_rate_m2)

  // ── Auto-snapshot diario ───────────────────────────────────────────────────
  const todayStr = hoy.toISOString().split('T')[0]
  const { data: todaySnap } = await supabase
    .from('progress_score_history')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .gte('recorded_at', todayStr)
    .limit(1)
    .maybeSingle()

  if (!todaySnap) {
    await supabase.from('progress_score_history').insert({
      user_id:               DEV_USER_ID,
      d1_time_decoupling:    score.d1_time_decoupling,
      d2_asset_health:       score.d2_asset_health,
      d3_financial_freedom:  score.d3_financial_freedom,
      d4_momentum:           score.d4_momentum,
      total_score:           score.total_score,
      level:                 score.level,
      level_percentage:      score.level_percentage,
      trigger_event:         'daily_view',
    })
  }

  return {
    assets,
    liabilities,
    businesses,
    freedom_goals,
    latest_score,
    dias_de_libertad,
    fastlane,
    score,
    precio_real_hora,
    gasto_diario_m2,
    retention_rate_m2,
    liquidity_accounts,
  }
}

// ─── Assets CRUD ──────────────────────────────────────────────────────────────

function mapLiquiditySchemaError(message: string): string {
  if (
    message.includes('account_ownership') ||
    message.includes('liquidity_kind') ||
    message.includes('household_manage_access') ||
    message.includes('institution')
  ) {
    return 'La base de datos todavía no tiene la migración de cuentas líquidas aplicada. Ejecuta la migración 20260430000007_liquidity_accounts.sql y vuelve a intentar.'
  }
  return message
}

export async function createAsset(data: AssetInsert): Promise<{ data: Asset | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { data: row, error } = await supabase
    .from('assets')
    .insert({
      ...data,
      user_id: DEV_USER_ID,
      household_id: data.household_id ?? household.householdId,
      is_shared: household.householdId ? true : data.is_shared,
    })
    .select()
    .single()
  if (error) return { data: null, error: mapLiquiditySchemaError(error.message) }
  return { data: { ...row, current_value: Number(row.current_value), monthly_yield: row.monthly_yield != null ? Number(row.monthly_yield) : null, value_in_usd: row.value_in_usd != null ? Number(row.value_in_usd) : null, annual_rate_pct: row.annual_rate_pct != null ? Number(row.annual_rate_pct) : null, quantity: row.quantity != null ? Number(row.quantity) : null }, error: null }
}

export async function updateAsset(data: AssetUpdate): Promise<{ data: Asset | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { id, ...fields } = data
  const { data: row, error } = await supabase
    .from('assets')
    .update(fields)
    .eq('id', id)
    .in('user_id', household.householdId ? household.memberUserIds : [DEV_USER_ID])
    .select()
    .single()
  if (error) return { data: null, error: mapLiquiditySchemaError(error.message) }
  return { data: { ...row, current_value: Number(row.current_value), monthly_yield: row.monthly_yield != null ? Number(row.monthly_yield) : null, value_in_usd: row.value_in_usd != null ? Number(row.value_in_usd) : null, annual_rate_pct: row.annual_rate_pct != null ? Number(row.annual_rate_pct) : null, quantity: row.quantity != null ? Number(row.quantity) : null }, error: null }
}

export async function deleteAsset(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { error } = await supabase.from('assets').delete().eq('id', id).in('user_id', household.householdId ? household.memberUserIds : [DEV_USER_ID])
  return { error: error?.message ?? null }
}

// ─── Liabilities CRUD ─────────────────────────────────────────────────────────

export async function createLiability(data: LiabilityInsert): Promise<{ data: Liability | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { data: row, error } = await supabase
    .from('liabilities')
    .insert({
      ...data,
      user_id: DEV_USER_ID,
      household_id: data.household_id ?? household.householdId,
      is_shared: household.householdId ? true : data.is_shared,
    })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { ...row, current_balance: Number(row.current_balance), balance_in_usd: row.balance_in_usd != null ? Number(row.balance_in_usd) : null, credit_limit: row.credit_limit != null ? Number(row.credit_limit) : null, interest_rate_pct: row.interest_rate_pct != null ? Number(row.interest_rate_pct) : null, monthly_payment: row.monthly_payment != null ? Number(row.monthly_payment) : null }, error: null }
}

export async function updateLiability(data: LiabilityUpdate): Promise<{ data: Liability | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { id, ...fields } = data
  const { data: row, error } = await supabase
    .from('liabilities')
    .update(fields)
    .eq('id', id)
    .in('user_id', household.householdId ? household.memberUserIds : [DEV_USER_ID])
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { ...row, current_balance: Number(row.current_balance), balance_in_usd: row.balance_in_usd != null ? Number(row.balance_in_usd) : null, credit_limit: row.credit_limit != null ? Number(row.credit_limit) : null, interest_rate_pct: row.interest_rate_pct != null ? Number(row.interest_rate_pct) : null, monthly_payment: row.monthly_payment != null ? Number(row.monthly_payment) : null }, error: null }
}

export async function deleteLiability(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { error } = await supabase.from('liabilities').delete().eq('id', id).in('user_id', household.householdId ? household.memberUserIds : [DEV_USER_ID])
  return { error: error?.message ?? null }
}

export async function payOffCreditCard({
  liability_id,
  liquidity_asset_id,
  amount,
}: {
  liability_id: string
  liquidity_asset_id: string
  amount: number
}): Promise<{ data: Liability | null; error: string | null }> {
  if (amount <= 0) return { data: null, error: 'El monto debe ser mayor a 0' }
  if (!liquidity_asset_id) return { data: null, error: 'Selecciona una cuenta bancaria' }
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const { data: lib } = await supabase
    .from('liabilities')
    .select('current_balance, currency, name')
    .eq('id', liability_id)
    .in('user_id', household.householdId ? household.memberUserIds : [DEV_USER_ID])
    .single()
  if (!lib) return { data: null, error: 'Tarjeta no encontrada' }

  // Crear transacción en dashboard (excluida de métricas) para que el pago
  // también aparezca en el dashboard y el historial pueda detectar si se elimina
  const { data: period } = await supabase
    .from('periods')
    .select('id')
    .eq('user_id', DEV_USER_ID)
    .eq('is_active', true)
    .single()

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      user_id: DEV_USER_ID,
      period_id: period?.id ?? null,
      type: 'expense',
      amount,
      currency: lib.currency ?? 'USD',
      transaction_date: new Date().toISOString().slice(0, 10),
      payment_source: 'cash_debit',
      liability_id: null,
      liquidity_asset_id,
      exclude_from_metrics: true,
      notes: `Pago de tarjeta: ${lib.name}`,
    } as any)
    .select('id')
    .single()

  if (txnError) return { data: null, error: txnError.message }

  // Movimiento de liquidez con related_transaction_id para tracking
  const liquidityResult = await adjustLiquidityBalance(supabase, {
    assetId: liquidity_asset_id,
    currentUserId: DEV_USER_ID,
    delta: -amount,
    movementType: 'credit_card_payment',
    allowCash: false,
    relatedTransactionId: txn.id,
    relatedLiabilityId: liability_id,
    notes: 'Pago de tarjeta desde brújula',
  })

  if (liquidityResult.error) {
    await supabase.from('transactions').delete().eq('id', txn.id)
    return { data: null, error: liquidityResult.error }
  }

  const newBalance = Math.max(0, Number(lib.current_balance) - amount)
  return updateLiability({
    id: liability_id,
    current_balance: newBalance,
    balance_in_usd: lib.currency === 'USD' ? newBalance : null,
  })
}

type CreditCardExpenseRow = {
  id: string
  user_id: string
  amount: number | string
  currency: string
  transaction_date: string
  notes: string | null
  transaction_categories:
    | { name: string | null; color: string | null }
    | { name: string | null; color: string | null }[]
    | null
}

type MovementRow = {
  id: string
  user_id: string
  amount: number | string
  currency: string
  created_at: string
  notes: string | null
  asset_id: string
}

type MovementAssetRow = {
  id: string
  name: string
}

export async function getCreditCardExpenseHistory(
  liability_id: string
): Promise<{ data: CreditCardExpenseHistoryItem[]; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdVisibilityScope(supabase, DEV_USER_ID)

  const { data: liability, error: liabilityError } = await supabase
    .from('liabilities')
    .select('id')
    .eq('id', liability_id)
    .eq('liability_type', 'credit_card')
    .in('user_id', scope.visibleExpenseUserIds)
    .maybeSingle()

  if (liabilityError) return { data: [], error: liabilityError.message }
  if (!liability) return { data: [], error: 'Tarjeta no encontrada' }

  // ── Gastos (transactions) ────────────────────────────────────────────────
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('id,user_id,amount,currency,transaction_date,notes,transaction_categories(name,color)')
    .eq('liability_id', liability_id)
    .eq('type', 'expense')
    .eq('payment_source', 'credit_card')
    .eq('exclude_from_metrics', false)
    .in('user_id', scope.visibleExpenseUserIds)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (error) return { data: [], error: error.message }

  // ── Pagos (liquidity_movements) ──────────────────────────────────────────
  // Incluimos related_transaction_id para detectar movimientos huérfanos
  // (cuando se elimina la transacción original, el movimiento queda huérfano)
  const { data: paymentMovements } = await supabase
    .from('liquidity_movements')
    .select('id, user_id, amount, currency, created_at, notes, asset_id, related_transaction_id')
    .eq('related_liability_id', liability_id)
    .eq('movement_type', 'credit_card_payment')
    .in('user_id', scope.visibleExpenseUserIds)
    .not('amount', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  // Detectar movimientos huérfanos: los que tienen related_transaction_id
  // y la transacción ya fue eliminada
  const paymentMovementsWithTx = (paymentMovements ?? []).filter(m => m.related_transaction_id)
  let validTransactionIds: Set<string> = new Set()
  if (paymentMovementsWithTx.length > 0) {
    const txIds = paymentMovementsWithTx.map(m => m.related_transaction_id!)
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('id')
      .in('id', txIds)
    validTransactionIds = new Set((existingTxs ?? []).map(t => t.id))
  }

  // Resolver nombres de las cuentas bancarias origen
  const validMovements = (paymentMovements ?? []).filter(m => {
    // Si no tiene related_transaction_id (pago hecho desde brújula), siempre válido
    if (!m.related_transaction_id) return true
    // Si tiene related_transaction_id, solo válido si la transacción aún existe
    return validTransactionIds.has(m.related_transaction_id)
  })

  const assetIds = Array.from(new Set(validMovements.map(m => m.asset_id)))
  let assetNames: Record<string, string> = {}
  if (assetIds.length > 0) {
    const { data: assetRows } = await supabase
      .from('assets')
      .select('id, name')
      .in('id', assetIds)
    assetNames = (assetRows ?? []).reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = a.name
      return acc
    }, {})
  }

  const paymentProfileUserIds = validMovements.map(m => m.user_id)
  const profileNames = await getProfileNames(supabase, [
    ...(rows ?? []).map((row: CreditCardExpenseRow) => row.user_id),
    ...paymentProfileUserIds,
  ])

  // ── Merge y ordenar ──────────────────────────────────────────────────────
  const txRows = (rows ?? []) as CreditCardExpenseRow[]
  const expenses: CreditCardExpenseHistoryItem[] = txRows.map(row => {
    const category = Array.isArray(row.transaction_categories)
      ? row.transaction_categories[0]
      : row.transaction_categories

    return {
      id: 'exp_' + row.id,
      kind: 'expense',
      amount: Number(row.amount),
      currency: row.currency,
      transaction_date: row.transaction_date,
      notes: row.notes,
      category_name: category?.name ?? null,
      category_color: category?.color ?? null,
      registered_by_name: profileNames[row.user_id],
    }
  })

  const payments: CreditCardExpenseHistoryItem[] = validMovements.map(m => ({
    id: 'pay_' + m.id,
    kind: 'payment',
    amount: Math.abs(Number(m.amount)),
    currency: m.currency,
    transaction_date: m.created_at.slice(0, 10),
    notes: m.notes,
    category_name: null,
    category_color: null,
    registered_by_name: profileNames[m.user_id],
    source_account_name: assetNames[m.asset_id] ?? null,
  }))

  const merged = [...expenses, ...payments].sort((a, b) =>
    b.transaction_date.localeCompare(a.transaction_date)
  )

  return {
    data: merged,
    error: null,
  }
}

// ─── Asset Movement History ───────────────────────────────────────────────────

export async function getAssetMovementHistory(
  asset_id: string
): Promise<{ data: AssetMovementHistoryItem[]; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const visibleUserIds = household.householdId ? household.memberUserIds : [DEV_USER_ID]

  const { data: asset } = await supabase
    .from('assets')
    .select('id')
    .eq('id', asset_id)
    .in('user_id', visibleUserIds)
    .maybeSingle()

  if (!asset) return { data: [], error: 'Activo no encontrado' }

  const { data: rows, error } = await supabase
    .from('liquidity_movements')
    .select('id, user_id, amount, currency, movement_type, created_at, notes')
    .eq('asset_id', asset_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { data: [], error: error.message }

  const profileNames = await getProfileNames(supabase, (rows ?? []).map(r => r.user_id))

  return {
    data: (rows ?? []).map(r => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      movement_type: r.movement_type,
      created_at: r.created_at,
      notes: r.notes,
      registered_by_name: profileNames[r.user_id],
    })),
    error: null,
  }
}

// ─── Liability Payment History ────────────────────────────────────────────────

export async function getLiabilityPaymentHistory(
  liability_id: string
): Promise<{ data: LiabilityPaymentHistoryItem[]; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const household = await getHouseholdScope(supabase, DEV_USER_ID)
  const visibleUserIds = household.householdId ? household.memberUserIds : [DEV_USER_ID]

  const { data: liability } = await supabase
    .from('liabilities')
    .select('id')
    .eq('id', liability_id)
    .in('user_id', visibleUserIds)
    .maybeSingle()

  if (!liability) return { data: [], error: 'Pasivo no encontrado' }

  const { data: rows, error } = await supabase
    .from('liquidity_movements')
    .select('id, user_id, amount, currency, movement_type, created_at, notes, asset_id')
    .eq('related_liability_id', liability_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { data: [], error: error.message }

  const assetIds = Array.from(new Set((rows ?? []).map(r => r.asset_id).filter(Boolean)))
  let assetNames: Record<string, string> = {}
  if (assetIds.length > 0) {
    const { data: assetRows } = await supabase.from('assets').select('id, name').in('id', assetIds)
    assetNames = (assetRows ?? []).reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = a.name
      return acc
    }, {})
  }

  const profileNames = await getProfileNames(supabase, (rows ?? []).map(r => r.user_id))

  return {
    data: (rows ?? []).map(r => ({
      id: r.id,
      amount: Math.abs(Number(r.amount)),
      currency: r.currency,
      movement_type: r.movement_type,
      created_at: r.created_at,
      notes: r.notes,
      source_account_name: assetNames[r.asset_id] ?? null,
      registered_by_name: profileNames[r.user_id],
    })),
    error: null,
  }
}

// ─── Businesses CRUD ──────────────────────────────────────────────────────────

export async function createBusiness(data: BusinessInsert): Promise<{ data: Business | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('businesses')
    .insert({ ...data, user_id: DEV_USER_ID })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { ...row, monthly_net_profit: Number(row.monthly_net_profit), reinvestment_percentage: Number(row.reinvestment_percentage), sector_multiplier: Number(row.sector_multiplier) }, error: null }
}

export async function updateBusiness(data: BusinessUpdate): Promise<{ data: Business | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { id, ...fields } = data
  const { data: row, error } = await supabase
    .from('businesses')
    .update(fields)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { ...row, monthly_net_profit: Number(row.monthly_net_profit), reinvestment_percentage: Number(row.reinvestment_percentage), sector_multiplier: Number(row.sector_multiplier) }, error: null }
}

export async function deleteBusiness(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('businesses').delete().eq('id', id).eq('user_id', DEV_USER_ID)
  return { error: error?.message ?? null }
}

// ─── Freedom Goals CRUD ───────────────────────────────────────────────────────

export async function createFreedomGoal(data: FreedomGoalInsert): Promise<{ data: FreedomGoal | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('freedom_goals')
    .insert({ ...data, user_id: DEV_USER_ID })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: row, error: null }
}

export async function updateFreedomGoal(data: FreedomGoalUpdate): Promise<{ data: FreedomGoal | null; error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { id, ...fields } = data
  const { data: row, error } = await supabase
    .from('freedom_goals')
    .update(fields)
    .eq('id', id)
    .eq('user_id', DEV_USER_ID)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  return { data: row, error: null }
}

export async function deleteFreedomGoal(id: string): Promise<{ error: string | null }> {
  const DEV_USER_ID = await getDevUserId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('freedom_goals').delete().eq('id', id).eq('user_id', DEV_USER_ID)
  return { error: error?.message ?? null }
}
