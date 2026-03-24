export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface AIConversation {
  id: string
  user_id: string
  context: string
  messages: AIMessage[]
}
