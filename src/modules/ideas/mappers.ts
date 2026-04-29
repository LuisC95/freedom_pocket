// src/modules/ideas/mappers.ts — M4 v2
// Conversión pura de filas crudas → tipos domain.

import type { Idea, Observation, ObservationPattern, Sprint, DayProgress, Streak, SprintTask, IdeaStatus, IdeaSource, SprintStatus } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIdea(row: any): Idea {
  return {
    id:              row.id,
    user_id:         row.user_id,
    title:           row.title,
    concept:         row.concept ?? null,
    description:     row.concept ?? null,
    business_model:  row.business_model ?? null,
    status:          row.status as IdeaStatus,
    source:          (row.source ?? 'manual') as IdeaSource,
    potential_score: row.potential_score ?? null,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapObservation(row: any): Observation {
  return {
    id:              row.id,
    user_id:         row.user_id,
    content:         row.content,
    category:        row.category ?? null,
    potential_score: row.potential_score ?? null,
    pattern_id:      row.pattern_id ?? null,
    created_at:      row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPattern(row: any): ObservationPattern {
  return {
    id:                row.id,
    user_id:           row.user_id,
    title:             row.title,
    description:       row.description,
    idea_id:           row.idea_id ?? null,
    observation_count: row.observation_count,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSprint(row: any, progress?: DayProgress[]): Sprint {
  return {
    id:           row.id,
    user_id:      row.user_id,
    idea_id:      row.idea_id,
    status:       row.status as SprintStatus,
    tasks_json:   Array.isArray(row.tasks_json) ? (row.tasks_json as SprintTask[]) : [],
    started_at:   row.started_at,
    completed_at: row.completed_at ?? null,
    created_at:   row.created_at,
    progress,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDayProgress(row: any): DayProgress {
  return {
    id:           row.id,
    sprint_id:    row.sprint_id,
    day_number:   row.day_number,
    notes:        row.notes ?? null,
    completed:    row.completed,
    completed_at: row.completed_at ?? null,
    created_at:   row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapStreak(row: any): Streak {
  return {
    id:            row.id,
    user_id:       row.user_id,
    feature:       row.feature,
    current_count: row.current_count,
    longest_count: row.longest_count,
    last_activity: row.last_activity ?? null,
  }
}
