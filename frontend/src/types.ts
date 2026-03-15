export interface Post {
  id: string
  title: string
  description: string
  image_filename: string
  created_at: number
  upvotes: number
  downvotes: number
  user_vote: 'up' | 'down' | null
}

export type SortMode = 'top' | 'best' | 'new'
