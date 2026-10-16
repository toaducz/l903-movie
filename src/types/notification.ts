export type NotificationType = 'episode' | 'reply'

export interface UserNotification {
  id: string
  slug: string
  source?: string
  movie_name: string
  episode_name?: string
  type?: NotificationType
  sender_name?: string
  content?: string
  is_read: boolean
  created_at: string
}

export type CommunityActionType = 'review' | 'watched'

export interface CommunityActivity {
  id: string
  actor_id: string
  actor_name: string
  actor_avatar?: string | null
  action_type: CommunityActionType
  slug: string
  movie_name: string
  score?: number | null
  content?: string | null
  created_at: string
}

export interface InteractionItem {
  id: string
  type: 'reply' | 'community_review' | 'community_watched'
  isDirectReplyToMe: boolean
  actor_name: string
  actor_avatar?: string | null
  movie_name: string
  slug: string
  score?: number | null
  content?: string | null
  is_read?: boolean
  created_at: string
}
