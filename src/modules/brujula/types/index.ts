export interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  status: 'active' | 'paused' | 'completed'
  target_date?: string
  created_at: string
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  completed: boolean
}
