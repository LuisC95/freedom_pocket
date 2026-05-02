export interface SettingsProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  occupation: string | null
  is_admin: boolean
}

export interface SettingsPreferences {
  id: string
  user_id: string
  base_currency: string
  timezone: string
  working_days_per_week: number
  default_payment_source: string
  default_liability_id: string | null
}

export interface SettingsHousehold {
  id: string
  name: string
  shared_incomes: boolean
  shared_expenses: boolean
  proportional_split: boolean
}

export interface HouseholdMember {
  user_id: string
  role: 'owner' | 'member'
  display_name: string
}

export interface SettingsPageData {
  profile: SettingsProfile
  preferences: SettingsPreferences
  household: SettingsHousehold | null
  members: HouseholdMember[]
  currentUserRole: 'owner' | 'member' | null
}

export type SettingsSection =
  | 'profile'
  | 'preferences'
  | 'household'
  | 'subscription'
  | 'about'
  | null
