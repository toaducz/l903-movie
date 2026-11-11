import type { MovieSource } from '@/types/movie'

// "Xem chung": phòng xem phim cố định — khớp bảng trong supabase/xem_chung.sql

export type RoomMovie = { source: MovieSource; slug: string; title: string; poster: string }

/** Tập trong phòng = (serverName, episodeKey), episodeKey = slug || name */
export type RoomEpisode = { serverName: string; episodeKey: string; episodeName: string }

export type RoomState = {
  movie: RoomMovie | null
  episode: RoomEpisode | null
  positionSec: number
  isPlaying: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export type RoomMember = { userId: string; displayName: string; joinedAt: string; isOwner: boolean }

export type RoomSummary = {
  id: string
  name: string
  members: RoomMember[]
  state: RoomState
  lastActivityAt: string
}

export type RoomEventType = 'pause' | 'play' | 'seek' | 'episode' | 'movie' | 'join' | 'leave' | 'rename' | 'create'

/** Sự kiện client được phép ghi (qua RPC log_room_event) */
export type LoggableRoomEventType = Extract<RoomEventType, 'pause' | 'play' | 'seek' | 'episode' | 'movie'>

export type RoomMessage = {
  id: string
  roomId: string
  userId: string
  kind: 'text' | 'event'
  text: string | null
  event: { type: RoomEventType; value?: string } | null
  createdAt: string
}

/** Xem trước lời mời ở /moi/[token] — roomId chỉ có khi đã là thành viên */
export type InvitePreview = {
  name: string
  inviter: string
  memberCount: number
  movie: RoomMovie | null
  episodeName: string | null
  positionSec: number
  isMember: boolean
  roomId: string | null
}
