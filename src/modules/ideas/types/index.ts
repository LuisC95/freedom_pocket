// src/modules/ideas/types/index.ts — M4 v2

import type {
  IDEA_STATUSES_V2,
  IDEA_SOURCES,
  SPRINT_STATUSES,
  BUSINESS_MODELS,
} from '../constants'

// ── Literal unions ───────────────────────────────────────────────────────────

export type IdeaStatus    = typeof IDEA_STATUSES_V2[number]['key']
export type IdeaSource    = typeof IDEA_SOURCES[number]['key']
export type SprintStatus  = typeof SPRINT_STATUSES[number]['key']
export type BusinessModel = typeof BUSINESS_MODELS[number]['key']

// ── Domain types ─────────────────────────────────────────────────────────────

export interface Observation {
  id:              string
  user_id:         string
  content:         string
  category:        string | null
  potential_score: number | null
  pattern_id:      string | null
  created_at:      string
}

export interface ObservationPattern {
  id:                string
  user_id:           string
  title:             string
  description:       string
  idea_id:           string | null
  observation_count: number
  created_at:        string
  updated_at:        string
}

export interface Idea {
  id:              string
  user_id:         string
  title:           string
  concept:         string | null
  description?:    string | null  // alias de concept para v2
  business_model:  BusinessModel | null
  status:          IdeaStatus
  source:          IdeaSource
  potential_score: number | null
  created_at:      string
  updated_at:      string
}

export interface SprintTask {
  day_number:       number
  emoji:            string
  title:            string
  task:             string
  duration_minutes: number
  detail:           string
  goal:             string
}

export interface Sprint {
  id:           string
  user_id:      string
  idea_id:      string
  status:       SprintStatus
  tasks_json:   SprintTask[]
  started_at:   string
  completed_at: string | null
  created_at:   string
  progress?:    DayProgress[]
}

export interface DayProgress {
  id:           string
  sprint_id:    string
  day_number:   number
  notes:        string | null
  completed:    boolean
  completed_at: string | null
  created_at:   string
}

export interface Streak {
  id:            string
  user_id:       string
  feature:       'cazador'
  current_count: number
  longest_count: number
  last_activity: string | null
}

// ── Mapa de Oportunidades ────────────────────────────────────────────────────

export interface CaminoMatch {
  id:      string
  match:   number  // 0-100
}

export interface MapaData {
  hourly_rate:      number
  free_hours_week:  number
  monthly_gap:      number
  occupation:       string | null
  caminos:          CaminoMatch[]
}

// ── Chat context ─────────────────────────────────────────────────────────────

export interface ChatContext {
  screen:     'mapa' | 'cazador' | 'banco' | 'sprint'
  ideaId?:    string
  sprintId?:  string
  dayNumber?: number
  ideaTitle?: string
}

// ── Input types para server actions ──────────────────────────────────────────

export interface CreateIdeaInput {
  title:          string
  description:    string
  source:         IdeaSource
  business_model?: BusinessModel
}

export interface CreateMapIdeaInput {
  caminoId: string
}

export interface CreateObservationInput {
  content: string
}

export interface GenerateSprintInput {
  ideaId: string
}

export interface CompleteDayInput {
  sprintId:  string
  dayNumber: number
  notes?:    string
}

export interface UpdateDayNotesInput {
  sprintId:  string
  dayNumber: number
  notes:     string
}

export interface SendChatMessageInput {
  message: string
  context: ChatContext
}
