export interface UserPrivacySettings {
  is_history_public: boolean
  is_watched_public: boolean
  updated_at?: string
}

export interface PublicUserProfile {
  id: string
  name: string
  handle: string
  initial: string
  joinedYear: number | null
  avatarUrl?: string | null
  privacy: {
    is_history_public: boolean
    is_watched_public: boolean
  }
}

export interface CommunityUser {
  id: string
  name: string
  handle: string
  initial: string
  reviewCount: number
  joinedYear: number | null
  avatarUrl?: string | null
}

