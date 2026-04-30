export type LiquidityKind = 'bank' | 'cash'
export type LiquidityOwnership = 'regular' | 'joint'

export interface LiquidityAccount {
  id: string
  user_id: string
  household_id: string | null
  name: string
  institution: string
  liquidity_kind: LiquidityKind
  account_ownership: LiquidityOwnership
  household_manage_access: boolean
  current_value: number
  currency: string
  registered_by_name?: string
}
