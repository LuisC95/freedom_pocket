// ─── Tablas de Supabase (schema real) ─────────────────────────────────────────

export interface Period {
  id: string
  user_id: string
  label: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

// ─── Tipos de vista para el Dashboard ────────────────────────────────────────

export interface DashboardStats {
  total_income: number
  total_expense: number
  delta_vs_prev_month: number   // % de cambio en egresos vs periodo anterior
  month_progress: number        // 0–100 (días transcurridos / días totales)
  hourly_rate: number           // income / horas reales del periodo
  cost_in_hours: number         // total_expense / hourly_rate
}

export interface BudgetProgress {
  category: string              // nombre de la categoría
  budgeted: number              // porcentaje de ingreso asignado → en pesos
  spent: number                 // gasto real en la categoría durante el periodo
  percentage: number            // spent / budgeted * 100
  is_over: boolean
}

// Fila unificada para el listado (mezcla incomes + transactions)
export interface TransactionWithHours {
  id: string
  type: 'income' | 'expense'
  description: string           // label (ingreso) o notes (gasto)
  category: string              // tipo de ingreso o nombre de categoría
  date: string                  // ISO date
  amount: number
  cost_in_hours: number         // 0 para ingresos
}
