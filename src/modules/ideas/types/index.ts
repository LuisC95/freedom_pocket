export interface Idea {
  id: string
  user_id: string
  title: string
  description: string
  tags: string[]
  status: 'draft' | 'active' | 'archived'
  created_at: string
}
