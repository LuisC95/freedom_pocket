// ============================================================
// MÓDULO 1 — MI REALIDAD ACTUAL
// Types — src/modules/mi-realidad/types/index.ts
// ============================================================

// ------------------------------------------------------------
// PERIOD
// ------------------------------------------------------------
export interface Period {
  id: string
  user_id: string
  start_date: string
  end_date: string | null
  is_active: boolean
  label: string | null
  created_at: string
}

// ------------------------------------------------------------
// INCOME
// Refleja tabla: incomes
// ------------------------------------------------------------
export type IncomeType = 'hourly' | 'commission' | 'fixed' | 'passive' | 'project'
export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular'

export interface Income {
  id: string
  user_id: string
  period_id: string
  household_id: string | null
  contributed_by: string
  type: IncomeType
  frequency: IncomeFrequency | null
  amount: number
  currency: string
  label: string
  effective_from: string
  effective_to: string | null
  updates_retroactively: boolean
  created_at: string
  updated_at: string
}

export type IncomeInsert = Omit<Income, 'id' | 'created_at' | 'updated_at'>
export type IncomeUpdate = Partial<Omit<Income, 'id' | 'user_id' | 'period_id' | 'created_at'>> & { id: string }

// ------------------------------------------------------------
// INCOME ENTRY
// Refleja tabla: income_entries — pagos reales registrados
// ------------------------------------------------------------
export type EntryType = 'earning' | 'deduction'

export type DeductionCategory =
  | 'federal_tax'
  | 'state_tax'
  | 'social_security'
  | 'medicare'
  | 'health_insurance'
  | 'dental_insurance'
  | 'vision_insurance'
  | 'retirement_401k'
  | 'other'

export interface IncomeEntry {
  id: string
  income_id: string
  user_id: string
  amount: number
  currency: string
  entry_date: string
  hours_worked: number | null       // solo tipo 'hourly'
  notes: string | null
  entry_type: EntryType
  deduction_category: DeductionCategory | null  // requerido si entry_type = 'deduction'
  batch_id: string | null           // UUID compartido por todos los entries de una llamada a registerPayment
  created_at: string
  incomeName: string                // join con incomes.label — resuelto en server action
}

export type IncomeEntryInsert = Omit<IncomeEntry, 'id' | 'created_at'>

// Un componente del formulario de registro de pago
export interface PaymentComponent {
  income_id: string
  amount: number
  hours_worked: number | null
  entry_type: EntryType
  deduction_category: DeductionCategory | null
  notes: string | null
}

// Payload completo del modal de registro
export interface RegisterPaymentPayload {
  entry_date: string
  components: PaymentComponent[]
}

// Income con sus entries ya calculadas
export interface IncomeConEntries extends Income {
  entries: IncomeEntry[]
  total_mes_calculado: number
}

// ------------------------------------------------------------
// REAL HOURS
// Refleja tabla: real_hours
// ------------------------------------------------------------
export interface RealHours {
  id: string
  user_id: string
  period_id: string
  contracted_hours_per_week: number
  extra_hours_per_week: number
  commute_minutes_per_day: number
  preparation_minutes_per_day: number
  recovery_start_time: string   // time HH:MM:SS — contexto AI, no entra al cálculo
  arrival_home_time: string     // time HH:MM:SS — contexto AI, no entra al cálculo
  mental_load_hours_per_week: number
  working_days_per_week: number
  created_at: string
  updated_at: string
}

export type RealHoursUpsert = Omit<RealHours, 'id' | 'created_at' | 'updated_at'>

// ------------------------------------------------------------
// ALGORITMO 1 — PRECIO REAL POR HORA
// Resultado calculado en servidor, nunca se persiste directamente
// ------------------------------------------------------------
export interface PrecioRealPorHora {
  total_ingresos_mes: number
  horas_reales_semana: number
  desglose_horas: {
    contratadas: number
    extra: number
    desplazamiento: number
    preparacion: number
    carga_mental: number
  }
  precio_por_hora: number
  currency: string
  calculado_con_periodo_id: string
  precio_referencia: number | null
  anio_referencia: number | null
  delta_vs_referencia: number | null
}

// ------------------------------------------------------------
// ESTADO DEL MÓDULO
// ------------------------------------------------------------
export type MiRealidadEstado =
  | 'sin_datos'       // ni ingresos ni horas
  | 'solo_ingresos'   // tiene ingresos pero no horas
  | 'solo_horas'      // tiene horas pero no ingresos
  | 'completo'        // tiene ambos → muestra precio por hora

// ------------------------------------------------------------
// TIPO AGREGADO — lo que devuelve getMiRealidadData
// ------------------------------------------------------------
export interface MiRealidadData {
  periodo_activo: Period | null
  ingresos: IncomeConEntries[]
  allEntries: IncomeEntry[]             // todos los entries del usuario sin filtro de período
  real_hours: RealHours | null
  precio_real_por_hora: PrecioRealPorHora | null
  estado: MiRealidadEstado
  // ── Métricas derivadas ──────────────────────────────────────────────────
  diasDelPeriodo: number | null          // días reales del período activo
  costoRealDeTrabajar: number | null     // ingreso ÷ horas reales (ya en precioRealPorHora, alias explícito)
  rendimientoDeTuTiempo: number | null   // ingreso ÷ horas de vida del período
  valorRealDeTuTiempo: null              // Módulo 2 — pendiente
}
