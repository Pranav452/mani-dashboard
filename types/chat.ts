export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string | null
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  sql_query?: string | null
  created_at: string
}

