export type TransactionType = 'income' | 'expense'
export type PaymentSource = 'cash_debit' | 'credit_card'
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'annual' | 'custom' | 'manual'
export type ExpenseType = 'fixed' | 'variable'
export type BudgetSource = 'system' | 'user'

export interface TransactionCategory {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  is_custom: boolean
  applies_to: 'expense' | 'income' | 'both'
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  period_id: string
  category_id: string
  household_id: string | null
  recurring_template_id: string | null
  payment_source: PaymentSource
  liability_id: string | null
  type: TransactionType
  amount: number
  currency: string
  transaction_date: string
  notes: string | null
  price_per_hour_snapshot: number | null
  split_type: string | null
  split_percentage: number | null
  status: 'pending' | 'confirmed'
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
}

export interface TransactionInsert {
  period_id: string
  category_id: string
  household_id?: string | null
  type: TransactionType
  amount: number
  currency?: string
  transaction_date: string
  notes?: string | null
  price_per_hour_snapshot?: number | null
  recurring_template_id?: string | null
  payment_source?: PaymentSource
  liability_id?: string | null
  split_type?: string | null
  split_percentage?: number | null
  status?: 'pending' | 'confirmed'
}

export interface CreditCardOption {
  id: string
  name: string
  current_balance: number
  currency: string
  is_shared: boolean
  owner_name?: string
}

export interface DashboardUserSettings {
  default_payment_source: PaymentSource
  default_liability_id: string | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  expense_type: ExpenseType
  source: BudgetSource
  is_active: boolean
  avg_amount: number | null
  suggested_amount: number | null
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
  // calculado en runtime
  spent_this_month?: number
  pct_of_avg?: number
}

export interface RecurringTemplate {
  id: string
  user_id: string
  household_id: string | null
  category_id: string
  name: string
  type: TransactionType
  amount: number
  currency: string
  frequency: RecurringFrequency
  day_of_month: number
  month_of_year: number | null
  custom_interval_days: number | null
  is_active: boolean
  contract_start_date: string | null
  contract_end_date: string | null
  total_debt_amount: number | null
  ping_frequency_days: number | null
  last_confirmed_at: string | null
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
  // calculado en runtime
  is_pending_this_period?: boolean
}

export interface RecurringTemplateInsert {
  category_id: string
  household_id?: string | null
  name: string
  type: TransactionType
  amount: number
  currency?: string
  frequency?: RecurringFrequency
  day_of_month: number
  month_of_year?: number | null
  custom_interval_days?: number | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  total_debt_amount?: number | null
  ping_frequency_days?: number | null
}

export interface TransactionGroup {
  date: string
  transactions: Transaction[]
  day_total_income: number
  day_total_expense: number
}

export interface MonthlySnapshot {
  month: string
  month_label: string
  total_income: number
  total_expense: number
  net: number
}

export interface DashboardMetrics {
  total_income_period: number
  total_expense_period: number
  net_period: number
  retention_rate: number
  dias_autonomia: number | null
  gasto_diario: number | null
  price_per_hour: number | null
}

export interface DashboardData {
  periodo_activo: { id: string; start_date: string; end_date: string | null } | null
  metrics: DashboardMetrics
  transaction_groups: TransactionGroup[]
  monthly_history: MonthlySnapshot[]
  budgets: Budget[]
  recurring_templates: RecurringTemplate[]
  pending_recurring: RecurringTemplate[]
  categories: TransactionCategory[]
  credit_card_options: CreditCardOption[]
  user_settings: DashboardUserSettings
}
