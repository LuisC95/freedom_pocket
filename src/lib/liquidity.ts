import { createAdminClient } from '@/lib/supabase/server'
import { assertServerRuntime } from '@/lib/assert-server-runtime'
import { getHouseholdScope } from '@/lib/household'
import type { LiquidityAccount, LiquidityKind } from '@/types/liquidity'

assertServerRuntime('liquidity')

type AdminClient = ReturnType<typeof createAdminClient>

export async function getLiquidityAccounts(
  supabase: AdminClient,
  currentUserId: string,
  manageOnly = false
): Promise<LiquidityAccount[]> {
  const scope = await getHouseholdScope(supabase, currentUserId)
  const visibleUserIds = scope.householdId ? scope.memberUserIds : [currentUserId]

  const { data } = await supabase
    .from('assets')
    .select('id,user_id,household_id,name,institution,liquidity_kind,account_ownership,household_manage_access,current_value,currency')
    .in('user_id', visibleUserIds)
    .eq('is_active', true)
    .eq('is_liquid', true)
    .not('liquidity_kind', 'is', null)
    .order('created_at', { ascending: false })

  const accounts = (data ?? [])
    .filter(account =>
      !manageOnly ||
      account.user_id === currentUserId ||
      account.account_ownership === 'joint' ||
      account.household_manage_access
    )

  const ownerIds = Array.from(new Set(accounts.map(account => account.user_id).filter(id => id !== currentUserId)))
  const { data: profiles } = ownerIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', ownerIds)
    : { data: [] }
  const ownerNames = (profiles ?? []).reduce<Record<string, string>>((acc, profile) => {
    acc[profile.id] = profile.display_name || 'Miembro'
    return acc
  }, {})

  return accounts.map(account => ({
    id: account.id,
    user_id: account.user_id,
    household_id: account.household_id ?? null,
    name: account.name,
    institution: account.institution ?? account.name,
    liquidity_kind: account.liquidity_kind as LiquidityKind,
    account_ownership: account.account_ownership ?? 'regular',
    household_manage_access: Boolean(account.household_manage_access),
    current_value: Number(account.current_value),
    currency: account.currency ?? 'USD',
    registered_by_name: account.user_id !== currentUserId ? ownerNames[account.user_id] : undefined,
  }))
}

export async function ensureCashLiquidityAccount(
  supabase: AdminClient,
  currentUserId: string
): Promise<LiquidityAccount | null> {
  const scope = await getHouseholdScope(supabase, currentUserId)

  const { data: existing } = await supabase
    .from('assets')
    .select('id,user_id,household_id,name,institution,liquidity_kind,account_ownership,household_manage_access,current_value,currency')
    .eq('user_id', currentUserId)
    .eq('is_active', true)
    .eq('is_liquid', true)
    .eq('liquidity_kind', 'cash')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const row = existing ?? (await supabase
    .from('assets')
    .insert({
      user_id: currentUserId,
      household_id: scope.householdId,
      name: 'Cash',
      institution: 'Cash',
      asset_type: 'liquid',
      current_value: 0,
      currency: 'USD',
      value_in_usd: 0,
      monthly_yield: null,
      annual_rate_pct: null,
      ticker_symbol: null,
      quantity: null,
      is_liquid: true,
      liquidity_kind: 'cash',
      account_ownership: 'regular',
      household_manage_access: false,
      is_shared: false,
      is_active: true,
      notes: 'Cuenta cash creada automáticamente para depósitos de ingresos',
    })
    .select('id,user_id,household_id,name,institution,liquidity_kind,account_ownership,household_manage_access,current_value,currency')
    .single()).data

  if (!row) return null

  return {
    id: row.id,
    user_id: row.user_id,
    household_id: row.household_id ?? null,
    name: row.name,
    institution: row.institution ?? 'Cash',
    liquidity_kind: row.liquidity_kind as LiquidityKind,
    account_ownership: row.account_ownership ?? 'regular',
    household_manage_access: Boolean(row.household_manage_access),
    current_value: Number(row.current_value),
    currency: row.currency ?? 'USD',
  }
}

export async function adjustLiquidityBalance(
  supabase: AdminClient,
  input: {
    assetId: string
    currentUserId: string
    delta: number
    movementType: 'income_deposit' | 'expense_payment' | 'credit_card_payment' | 'cash_deposit' | 'manual_adjustment'
    currency?: string
    allowCash?: boolean
    relatedTransactionId?: string | null
    relatedIncomeEntryBatchId?: string | null
    relatedLiabilityId?: string | null
    notes?: string | null
  }
): Promise<{ error: string | null }> {
  const scope = await getHouseholdScope(supabase, input.currentUserId)
  const visibleUserIds = scope.householdId ? scope.memberUserIds : [input.currentUserId]

  const { data: asset, error } = await supabase
    .from('assets')
    .select('id,user_id,household_id,name,current_value,currency,is_liquid,is_active,liquidity_kind,account_ownership,household_manage_access')
    .eq('id', input.assetId)
    .in('user_id', visibleUserIds)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!asset || !asset.is_active || !asset.is_liquid || !asset.liquidity_kind) {
    return { error: 'Cuenta de liquidez no encontrada' }
  }
  if (!input.allowCash && asset.liquidity_kind === 'cash') {
    return { error: 'No se puede usar cash para esta operación' }
  }

  const canManage =
    asset.user_id === input.currentUserId ||
    asset.account_ownership === 'joint' ||
    Boolean(asset.household_manage_access)

  if (!canManage) return { error: 'Esta cuenta no permite manejo por otros miembros del household' }

  const currentBalance = Number(asset.current_value)
  const nextBalance = currentBalance + input.delta
  if (nextBalance < 0) return { error: `Saldo insuficiente en ${asset.name}` }

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      current_value: nextBalance,
      value_in_usd: (asset.currency ?? input.currency ?? 'USD') === 'USD' ? nextBalance : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', asset.id)

  if (updateError) return { error: updateError.message }

  await supabase.from('liquidity_movements').insert({
    user_id: input.currentUserId,
    household_id: scope.householdId,
    asset_id: asset.id,
    movement_type: input.movementType,
    amount: input.delta,
    currency: input.currency ?? asset.currency ?? 'USD',
    related_transaction_id: input.relatedTransactionId ?? null,
    related_income_entry_batch_id: input.relatedIncomeEntryBatchId ?? null,
    related_liability_id: input.relatedLiabilityId ?? null,
    notes: input.notes ?? null,
  })

  return { error: null }
}
