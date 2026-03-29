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
  start_date: string       // date ISO string
  end_date: string | null  // null = período activo/abierto
  is_active: boolean
  label: string | null
  created_at: string
}

// ------------------------------------------------------------
// INCOME
// Refleja tabla: incomes
// ------------------------------------------------------------
export type IncomeType = 'principal' | 'extra' | 'passive'

export interface Income {
  id: string
  user_id: string
  period_id: string
  household_id: string | null
  contributed_by: string   // FK → profiles.id
  type: IncomeType
  amount: number
  currency: string         // default 'USD'
  label: string
  effective_from: string   // date ISO string
  effective_to: string | null
  updates_retroactively: boolean
  created_at: string
  updated_at: string
}

// Para crear un ingreso nuevo (sin campos auto-generados)
export type IncomeInsert = Omit<Income, 'id' | 'created_at' | 'updated_at'>

// Para editar (todos los campos opcionales excepto id)
export type IncomeUpdate = Partial<Omit<Income, 'id' | 'user_id' | 'period_id' | 'created_at'>> & {
  id: string
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
  extra_hours_per_week: number           // default 0
  commute_minutes_per_day: number        // default 0
  preparation_minutes_per_day: number    // default 0
  recovery_start_time: string            // time HH:MM:SS — contexto AI, no entra al cálculo base
  arrival_home_time: string              // time HH:MM:SS — contexto AI, no entra al cálculo base
  mental_load_hours_per_week: number     // default 0
  working_days_per_week: number          // 1–7
  created_at: string
  updated_at: string
}

// Para crear / upsert (sin campos auto-generados)
export type RealHoursUpsert = Omit<RealHours, 'id' | 'created_at' | 'updated_at'>

// ------------------------------------------------------------
// ALGORITMO 1 — PRECIO REAL POR HORA
// Resultado calculado en servidor, nunca se persiste directamente
// ------------------------------------------------------------
export interface PrecioRealPorHora {
  // Inputs
  total_ingresos_mes: number     // Σ incomes activos del período
  horas_reales_semana: number    // horas totales reales por semana

  // Desglose de horas (para mostrar en UI)
  desglose_horas: {
    contratadas: number
    extra: number
    desplazamiento: number        // commute × working_days × 2 / 60
    preparacion: number           // preparation × working_days / 60
    carga_mental: number
  }

  // Resultado final
  precio_por_hora: number         // total_ingresos_mes / (horas_reales_semana × 4.33)
  currency: string

  // Metadata
  calculado_con_periodo_id: string
}

// ------------------------------------------------------------
// ESTADO DEL MÓDULO
// Controla qué se muestra en la UI
// ------------------------------------------------------------
export type MiRealidadEstado =
  | 'sin_datos'           // ni ingresos ni horas
  | 'solo_ingresos'       // tiene ingresos pero no horas
  | 'solo_horas'          // tiene horas pero no ingresos
  | 'completo'            // tiene ambos → muestra precio por hora

// ------------------------------------------------------------
// TIPO AGREGADO — lo que devuelve la page action principal
// ------------------------------------------------------------
export interface MiRealidadData {
  periodo_activo: Period | null
  ingresos: Income[]
  real_hours: RealHours | null
  precio_real_por_hora: PrecioRealPorHora | null  // null si faltan datos
  estado: MiRealidadEstado
}
