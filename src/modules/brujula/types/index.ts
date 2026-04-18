// ============================================================
// MÓDULO 3 — MI BRÚJULA
// Types — src/modules/brujula/types/index.ts
// ============================================================

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AssetType =
  | 'liquid'
  | 'fixed_yield'
  | 'variable_yield'
  | 'cashflow'
  | 'appreciation'
  | 'mixed'

export type LiabilityType =
  | 'mortgage'
  | 'car'
  | 'credit_card'
  | 'student_loan'
  | 'personal_loan'
  | 'other'

export type BusinessModel =
  | 'saas'
  | 'producto_fisico'
  | 'servicio'
  | 'contenido'
  | 'renta'
  | 'custom'

export type BusinessStatus = 'active' | 'paused' | 'sold'

export type ProgressLevel =
  | 'acera'
  | 'via_lenta'
  | 'carril_aceleracion'
  | 'via_rapida'

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  user_id: string
  household_id: string | null
  is_shared: boolean
  name: string
  asset_type: AssetType
  notes: string | null
  current_value: number
  currency: string
  value_in_usd: number | null
  monthly_yield: number | null
  annual_rate_pct: number | null
  ticker_symbol: string | null
  quantity: number | null
  is_liquid: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AssetInsert = Omit<Asset, 'id' | 'created_at' | 'updated_at'>
export type AssetUpdate = Partial<Omit<Asset, 'id' | 'user_id' | 'created_at'>> & { id: string }

// ─── Liabilities ──────────────────────────────────────────────────────────────

export interface Liability {
  id: string
  user_id: string
  household_id: string | null
  is_shared: boolean
  name: string
  liability_type: LiabilityType
  notes: string | null
  current_balance: number
  currency: string
  balance_in_usd: number | null
  interest_rate_pct: number | null
  monthly_payment: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LiabilityInsert = Omit<Liability, 'id' | 'created_at' | 'updated_at'>
export type LiabilityUpdate = Partial<Omit<Liability, 'id' | 'user_id' | 'created_at'>> & { id: string }

// ─── Businesses ───────────────────────────────────────────────────────────────

export interface Business {
  id: string
  user_id: string
  source_idea_id: string | null
  name: string
  business_model: BusinessModel
  status: BusinessStatus
  monthly_net_profit: number
  reinvestment_percentage: number
  sector_multiplier: number
  currency: string
  started_at: string | null
  is_passive: boolean
  include_in_fastlane: boolean
  created_at: string
  updated_at: string
}

export type BusinessInsert = Omit<Business, 'id' | 'created_at' | 'updated_at'>
export type BusinessUpdate = Partial<Omit<Business, 'id' | 'user_id' | 'created_at'>> & { id: string }

// ─── Freedom Goals ────────────────────────────────────────────────────────────

export interface FreedomGoal {
  id: string
  user_id: string
  label: string
  target_days: number | null
  is_system_suggested: boolean
  is_completed: boolean
  completed_at: string | null
  projected_date: string | null
  created_at: string
}

export type FreedomGoalInsert = Omit<FreedomGoal, 'id' | 'created_at'>
export type FreedomGoalUpdate = Partial<Omit<FreedomGoal, 'id' | 'user_id' | 'created_at'>> & { id: string }

// ─── Progress Score ───────────────────────────────────────────────────────────

export interface ProgressScore {
  id: string
  user_id: string
  d1_time_decoupling: number   // 0–100
  d2_asset_health: number      // 0–100
  d3_financial_freedom: number // 0–100
  d4_momentum: number          // 0–100
  total_score: number | null
  level: ProgressLevel
  level_percentage: number
  trigger_event: string
  recorded_at: string
}

// ─── Algorithm outputs ────────────────────────────────────────────────────────

// Algorithm 4 — Días de Libertad
export interface DiasDeLibertad {
  ingreso_pasivo_mensual: number
  gasto_mensual: number
  dias_libertad: number
  meta_dias: number | null
  progreso_meta_pct: number | null
  currency: string
}

// Algorithm 5 — Fórmula Fastlane
export interface FastlaneFormula {
  ingreso_pasivo_mensual: number
  ingreso_activo_mensual: number
  ingreso_total_mensual: number
  fastlane_ratio: number       // 0–1 (passive / total)
  net_worth_usd: number
  total_assets_usd: number
  total_liabilities_usd: number
  asset_value_estimado: number // activos + valoración negocios
}

// Algorithm 6 — Score de Progreso
export interface ScoreDeProgreso {
  d1_time_decoupling: number
  d2_asset_health: number
  d3_financial_freedom: number
  d4_momentum: number
  total_score: number
  level: ProgressLevel
  level_label: string
  level_percentage: number
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  liquid:         'Líquido',
  fixed_yield:    'Renta fija',
  variable_yield: 'Renta variable',
  cashflow:       'Flujo de caja',
  appreciation:   'Apreciación',
  mixed:          'Mixto',
}

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage:      'Hipoteca',
  car:           'Auto',
  credit_card:   'Tarjeta de crédito',
  student_loan:  'Préstamo estudiantil',
  personal_loan: 'Préstamo personal',
  other:         'Otro',
}

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  saas:            'SaaS',
  producto_fisico: 'Producto físico',
  servicio:        'Servicio',
  contenido:       'Contenido',
  renta:           'Renta',
  custom:          'Personalizado',
}

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  sold:   'Vendido',
}

export const PROGRESS_LEVEL_LABELS: Record<ProgressLevel, string> = {
  acera:              'Acera',
  via_lenta:          'Vía Lenta',
  carril_aceleracion: 'Carril de Aceleración',
  via_rapida:         'Vía Rápida',
}

// ─── Aggregate — retorno de getBrujulaData ────────────────────────────────────

export interface BrujulaData {
  assets: Asset[]
  liabilities: Liability[]
  businesses: Business[]
  freedom_goals: FreedomGoal[]
  latest_score: ProgressScore | null

  // Algorithms (calculados en servidor)
  dias_de_libertad: DiasDeLibertad
  fastlane: FastlaneFormula
  score: ScoreDeProgreso

  // Cross-module inputs usados en cálculos
  precio_real_hora: number | null
  gasto_diario_m2: number | null
  retention_rate_m2: number | null
}
