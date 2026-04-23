// src/modules/ideas/mappers.ts
// Conversión pura de filas crudas (Supabase) → tipos domain (M4).
//
// Los mappers reciben el tipo Raw de los generated types de Supabase
// (donde status/phase/provider son `string`) y devuelven el tipo domain
// con literal unions y campos derivados calculados.
//
// Los casts internos son seguros: los CHECK constraints de Postgres
// garantizan que solo valores válidos llegan desde la DB.
//
// Los mappers son FUNCIONES PURAS — no tocan I/O, no llaman a otros
// servicios, no hidratan relaciones. Las relaciones opcionales (ideas,
// messages, deep_dive, session) las llenan los actions con sus flags.

import type { Database } from '@/types/database.types'

import type {
  IdeaSession,
  Idea,
  IdeaMessage,
  IdeaDeepDive,
  IdeaStatus,
  SessionStatus,
  BusinessModel,
  EntryPoint,
  Phase,
  MessageRole,
  AIProvider,
  AssistantUIData,
  PhaseSummariesMap,
} from './types'

// ──────────────────────────────────────────────────────────
// Tipos Raw (alias para lecturas más cortas)
// ──────────────────────────────────────────────────────────

type RawIdeaSessionRow  = Database['public']['Tables']['idea_sessions']['Row']
type RawIdeaRow         = Database['public']['Tables']['ideas']['Row']
type RawIdeaDeepDiveRow = Database['public']['Tables']['idea_deep_dives']['Row']
type RawIdeaMessageRow  = Database['public']['Tables']['idea_session_messages']['Row']

// ──────────────────────────────────────────────────────────
// Helper: ¿el campo text del deep dive cuenta como "lleno"?
// ──────────────────────────────────────────────────────────
// Cuenta como lleno si no es null Y tiene contenido no-whitespace.
// Defensa contra strings vacíos o solo-whitespace que podrían
// llegar de imports, migraciones o edge cases no previstos hoy.

function isFilled(value: string | null): boolean {
  return value !== null && value.trim().length > 0
}

// ══════════════════════════════════════════════════════════
// 1. mapSession
// ══════════════════════════════════════════════════════════
// Cast de entry_point y status a literal unions. Sin campos
// derivados propios — ideas/messages/messages_count los
// llena getSession según sus flags.

export function mapSession(row: RawIdeaSessionRow): IdeaSession {
  // phase_summaries todavía no está en los generated types (migración pendiente de regen).
  // Leemos con cast seguro: default a {} si la columna no existe o es null.
  const rawSummaries = (row as unknown as { phase_summaries?: PhaseSummariesMap | null })
    .phase_summaries
  const phaseSummaries: PhaseSummariesMap =
    rawSummaries && typeof rawSummaries === 'object' ? rawSummaries : {}

  return {
    ...row,
    entry_point: row.entry_point as EntryPoint,
    status: row.status as SessionStatus,
    current_phase: (row.current_phase as Phase | undefined) ?? 'observar',
    ready_to_save: Boolean(row.ready_to_save),
    phase_summaries: phaseSummaries,
  }
}

// ══════════════════════════════════════════════════════════
// 2. mapIdea
// ══════════════════════════════════════════════════════════
// Cast de status y business_model a literal unions.
// Calcula `cents_complete`: true si los 5 scores están
// presentes (no null). El rango 1-10 lo garantiza el CHECK
// constraint de Postgres — el mapper no re-valida.

export function mapIdea(row: RawIdeaRow): Idea {
  const centsComplete =
    row.cents_score_control !== null &&
    row.cents_score_entry   !== null &&
    row.cents_score_need    !== null &&
    row.cents_score_time    !== null &&
    row.cents_score_scale   !== null

  return {
    ...row,
    status:         row.status         as IdeaStatus,
    business_model: row.business_model as BusinessModel | null,
    cents_complete: centsComplete,
  }
}

// ══════════════════════════════════════════════════════════
// 3. mapDeepDive
// ══════════════════════════════════════════════════════════
// Calcula `fields_completed` (0-7) e `is_complete` (boolean).
// `ai_notes` NO cuenta — no es parte del plan, son notas AI.
// `is_complete = fields_completed === 7` → desbloquea promoción
// de idea a 'operando' (crea business en M3).

const DEEP_DIVE_PLAN_FIELDS = [
  'market_analysis',
  'competition_analysis',
  'revenue_model',
  'required_resources',
  'time_to_first_revenue',
  'first_steps',
  'validation_metrics',
] as const

export function mapDeepDive(row: RawIdeaDeepDiveRow): IdeaDeepDive {
  const fieldsCompleted = DEEP_DIVE_PLAN_FIELDS.reduce(
    (count, field) => count + (isFilled(row[field]) ? 1 : 0),
    0
  )

  return {
    ...row,
    fields_completed: fieldsCompleted,
    is_complete:      fieldsCompleted === DEEP_DIVE_PLAN_FIELDS.length,
  }
}

// ══════════════════════════════════════════════════════════
// 4. mapMessage
// ══════════════════════════════════════════════════════════
// Cast de role, phase, provider a literal unions.
// Convierte `cost_usd` de string (lo que Supabase devuelve
// para columnas `numeric`) a number. Si por alguna razón
// llega null, default a 0 (NOT NULL en DB, no debería pasar).

export function mapMessage(row: RawIdeaMessageRow): IdeaMessage {
  // ui_data todavía no está en los generated types (migración pendiente de regen).
  const rawUiData = (row as unknown as { ui_data?: AssistantUIData | null }).ui_data
  const uiData: AssistantUIData | null =
    rawUiData && typeof rawUiData === 'object' ? rawUiData : null

  return {
    ...row,
    role:     row.role     as MessageRole,
    phase:    row.phase    as Phase,
    provider: row.provider as AIProvider,
    cost_usd: Number(row.cost_usd) || 0,
    is_pinned: Boolean(row.is_pinned),
    pinned_at: row.pinned_at ?? null,
    pinned_by: row.pinned_by ?? null,
    ui_data: uiData,
  }
}
