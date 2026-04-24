import { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

type ActivePeriod = {
  id: string
  user_id: string
  start_date: string
  end_date: string | null
  is_active: boolean
  label: string | null
  created_at: string
}

export type HouseholdScope = {
  householdId: string | null
  memberUserIds: string[]
  sharedIncomes: boolean
  sharedExpenses: boolean
}

export type HouseholdVisibilityScope = {
  activePeriod: ActivePeriod | null
  visibleIncomeUserIds: string[]
  visibleExpenseUserIds: string[]
  visibleIncomePeriodIds: string[]
  visibleExpensePeriodIds: string[]
  householdId: string | null
  sharedIncomes: boolean
  sharedExpenses: boolean
}

export async function getHouseholdScope(
  supabase: AdminClient,
  currentUserId: string
): Promise<HouseholdScope> {
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', currentUserId)
    .maybeSingle()

  if (!membership?.household_id) {
    return {
      householdId: null,
      memberUserIds: [currentUserId],
      sharedIncomes: false,
      sharedExpenses: false,
    }
  }

  const householdId = membership.household_id

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase
      .from('households')
      .select('shared_incomes, shared_expenses')
      .eq('id', householdId)
      .single(),
    supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId),
  ])

  return {
    householdId,
    memberUserIds: (members ?? []).map(member => member.user_id),
    sharedIncomes: Boolean(household?.shared_incomes),
    sharedExpenses: Boolean(household?.shared_expenses),
  }
}

export async function getHouseholdVisibilityScope(
  supabase: AdminClient,
  currentUserId: string
): Promise<HouseholdVisibilityScope> {
  const household = await getHouseholdScope(supabase, currentUserId)

  const { data: activePeriods } = await supabase
    .from('periods')
    .select('id, user_id, start_date, end_date, is_active, label, created_at')
    .in('user_id', household.memberUserIds)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const ownPeriod = (activePeriods ?? []).find(period => period.user_id === currentUserId) ?? null
  const referencePeriod = ownPeriod ?? activePeriods?.[0] ?? null

  const alignedPeriods = referencePeriod
    ? (activePeriods ?? []).filter(
        period =>
          period.start_date === referencePeriod.start_date &&
          (period.end_date ?? null) === (referencePeriod.end_date ?? null)
      )
    : []

  const ownPeriodIds = ownPeriod ? [ownPeriod.id] : []
  const alignedPeriodIds = alignedPeriods.map(period => period.id)

  return {
    activePeriod: referencePeriod,
    visibleIncomeUserIds: household.sharedIncomes ? household.memberUserIds : [currentUserId],
    visibleExpenseUserIds: household.sharedExpenses ? household.memberUserIds : [currentUserId],
    visibleIncomePeriodIds: household.sharedIncomes ? alignedPeriodIds : ownPeriodIds,
    visibleExpensePeriodIds: household.sharedExpenses ? alignedPeriodIds : ownPeriodIds,
    householdId: household.householdId,
    sharedIncomes: household.sharedIncomes,
    sharedExpenses: household.sharedExpenses,
  }
}
