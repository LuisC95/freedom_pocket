// src/modules/ideas/types/index.ts
// Types del dominio M4 — Ideas de Negocio
//
// Arquitectura en 2 capas:
//   - *Row: shape crudo 1:1 con schema DB (basado en Supabase generated types)
//   - sin sufijo: tipo domain con relaciones opcionales y campos derivados
//
// Los Row types usan `Database['public']['Tables'][...]['Row']` como base y aplican
// `Omit` para preservar los literal unions que la generación automática tipa como `string`.
// Cada vez que se aplique una migración: correr `supabase gen types` (o MCP) → regenera
// src/types/database.types.ts → este archivo hereda los cambios automáticamente.

import type { Database } from '@/types/database.types'

import {
  CENTS_DIMENSIONS,
  PHASES,
  ENTRY_POINTS,
  IDEA_STATUSES,
  SESSION_STATUSES,
  BUSINESS_MODELS,
  MESSAGE_ROLES,
  AI_PROVIDERS,
} from '../constants'

// ══════════════════════════════════════════════════════════
// 1. Literal unions derivadas de las constantes
//    (single source of truth — si cambia constants.ts, cambia el tipo)
// ══════════════════════════════════════════════════════════

export type EntryPoint    = typeof ENTRY_POINTS[number]['key']
export type SessionStatus = typeof SESSION_STATUSES[number]['key']
export type IdeaStatus    = typeof IDEA_STATUSES[number]['key']
export type BusinessModel = typeof BUSINESS_MODELS[number]['key']
export type Phase         = typeof PHASES[number]['key']
export type MessageRole   = typeof MESSAGE_ROLES[number]['key']
export type AIProvider    = typeof AI_PROVIDERS[number]['key']
export type CENTSKey      = typeof CENTS_DIMENSIONS[number]['key']

// ══════════════════════════════════════════════════════════
// 2. Row types — basados en Supabase generated types
//    Para columnas con CHECK constraint (status, phase, etc.) Supabase
//    las tipa como `string` genérico. Aplicamos Omit + intersection para
//    reemplazarlas con los literal unions de la sección 1.
//
//    Fechas llegan como string ISO. Para `cost_usd` (numeric en Postgres)
//    los generated types dicen `number`, pero en runtime Supabase devuelve
//    string. El mapper de mensajes hace `Number(row.cost_usd)` al leer.
// ══════════════════════════════════════════════════════════

type RawIdeaSessionRow  = Database['public']['Tables']['idea_sessions']['Row']
type RawIdeaRow         = Database['public']['Tables']['ideas']['Row']
type RawIdeaDeepDiveRow = Database['public']['Tables']['idea_deep_dives']['Row']
type RawIdeaMessageRow  = Database['public']['Tables']['idea_session_messages']['Row']

export type IdeaSessionRow = Omit<
  RawIdeaSessionRow,
  'entry_point' | 'status' | 'current_phase'
> & {
  entry_point:   EntryPoint
  status:        SessionStatus
  current_phase: Phase
}

export type IdeaRow = Omit<RawIdeaRow, 'status' | 'business_model'> & {
  status:         IdeaStatus
  business_model: BusinessModel | null
}

// idea_deep_dives no tiene columnas con literal unions → passthrough directo
export type IdeaDeepDiveRow = RawIdeaDeepDiveRow

export type IdeaMessageRow = Omit<RawIdeaMessageRow, 'role' | 'phase' | 'provider'> & {
  role:     MessageRole
  phase:    Phase
  provider: AIProvider
}

// ══════════════════════════════════════════════════════════
// 3. Domain types — Row + relaciones opcionales + derived fields
//    Los campos opcionales se rellenan cuando el action hace JOIN
//    o calcula algo. No todos los actions los devuelven — son hints.
// ══════════════════════════════════════════════════════════

// Payload de UI estructurado que la IA emite dentro del bloque META
// al final de cada respuesta. Se persiste en idea_session_messages.ui_data.
export interface AssistantOption {
  id: string
  label: string
  /** Si está presente, al hacer click se abre un input para que el usuario elabore. */
  detail_prompt?: string
}

export interface PhaseReadySignal {
  target: Phase
  reason: string
}

export interface AssistantUIData {
  options?: AssistantOption[]
  phase_ready?: PhaseReadySignal | null
  /** true cuando el usuario expresó intención de guardar la idea */
  ready_to_save?: boolean
  /** Marcador especial para mensajes que representan un evento (no prosa). */
  kind?: 'phase_transition' | 'option_click'
  /** Solo para kind='phase_transition'. */
  from?: Phase
  to?: Phase
  summary?: string
  /** Solo para kind='option_click'. Útil para analytics. */
  option_id?: string
}

// Resumen generado al cerrar una fase; se inyecta como contexto
// en el system prompt de fases posteriores.
export interface PhaseSummary {
  summary: string
  generated_at: string
  model: string
  tokens: number
}

export type PhaseSummariesMap = Partial<Record<Phase, PhaseSummary>>

export interface IdeaSession extends IdeaSessionRow {
  ideas?:          Idea[]
  messages?:       IdeaMessage[]
  messages_count?: number
  phase_summaries: PhaseSummariesMap
}

export interface Idea extends IdeaRow {
  session?:   IdeaSession
  deep_dive?: IdeaDeepDive | null
  /** Derived: los 5 scores CENTS están presentes (no null). */
  cents_complete?: boolean
}

export interface IdeaDeepDive extends IdeaDeepDiveRow {
  /** Derived: cuántos de los 7 campos están llenos (0-7). ai_notes no cuenta. */
  fields_completed?: number
  /** Derived: los 7 campos están llenos → idea promotable a 'operando'. */
  is_complete?: boolean
}

export interface IdeaMessage extends IdeaMessageRow {
  session?: IdeaSession
  ui_data: AssistantUIData | null
}

// ══════════════════════════════════════════════════════════
// 4. Input types para server actions
//    Lo que recibe cada función, sin id/timestamps que genera DB.
// ══════════════════════════════════════════════════════════

// --- Sesión ---

export interface CreateSessionInput {
  entry_point: EntryPoint
  /** Requerido si entry_point != 'sin_idea'. Validación en el action. */
  raw_input?: string
  /** ID de la idea asociada (requerido para flujo chat) */
  idea_id?: string
  /** Fase inicial (default: del ENTRY_POINTS según entry_point) */
  phase?: string
  /** Resúmenes de fases anteriores para persistencia entre fases */
  phase_summaries?: Record<string, unknown>
}

// --- Idea ---

export interface CreateIdeaFromSessionInput {
  session_id: string | null       // null si se crea suelta (sin sesión previa)
  title:      string
  concept:    string
  need_identified?:    string
  fastlane_potential?: string
  business_model?:     BusinessModel
}

export interface UpdateCENTSInput {
  idea_id: string
  /** Partial — el usuario puede actualizar de a uno o los 5 juntos. */
  scores: Partial<Record<CENTSKey, number>>
}

export interface ListIdeasInput {
  /** Filtro opcional por status. Sin filtro devuelve todas las ideas del usuario. */
  status?: IdeaStatus
}

// --- Transiciones de idea ---
//
// Transiciones simples reciben solo idea_id, no necesitan Input type:
//   commitIdea(ideaId)         generated → committed
//   startValidando(ideaId)     committed → validando
//   startConstruyendo(ideaId)  validando → construyendo
//
// Las siguientes sí tienen data adicional:

export interface PromoteToOperandoInput {
  idea_id: string
  /** Nombre del negocio en M3. Si se omite, usa el title de la idea. */
  business_name?: string
}

export interface DiscardIdeaInput {
  idea_id: string
  /** Razón opcional — útil para retrospectiva del usuario. */
  reason?: string
}

// --- Deep Dive ---

export type DeepDiveField =
  | 'market_analysis'
  | 'competition_analysis'
  | 'revenue_model'
  | 'required_resources'
  | 'time_to_first_revenue'
  | 'first_steps'
  | 'validation_metrics'
  | 'ai_notes'

export interface UpsertDeepDiveFieldInput {
  idea_id: string
  field:   DeepDiveField
  value:   string
}

// --- Mensaje ---

export interface SendMessageInput {
  session_id: string
  phase:      Phase
  content:    string                 // mensaje del usuario
}

export interface ToggleMessagePinInput {
  message_id: string
  is_pinned: boolean
}

// ══════════════════════════════════════════════════════════
// 5. Re-export de types de metadata (para que la UI importe desde un solo lugar)
// ══════════════════════════════════════════════════════════

export type CENTSDimension = typeof CENTS_DIMENSIONS[number]
export type PhaseMeta      = typeof PHASES[number]
export type EntryPointMeta = typeof ENTRY_POINTS[number]
export type IdeaStatusMeta = typeof IDEA_STATUSES[number]
