import type { RoomEventType, RoomMember, RoomMessage, RoomSummary } from '@/types/watch-room'
import { parseRoomMovie } from './validation'

// Chuyển row DB (snake_case) → kiểu dùng ở client (camelCase). Dùng cả ở API route lẫn payload Realtime.

export const ROOM_COLUMNS =
  'id, name, owner_id, movie, server_name, episode_slug, episode_name, position_sec, is_playing, state_updated_at, state_updated_by, last_activity_at'
export const MEMBER_COLUMNS = 'room_id, user_id, display_name, joined_at'
export const MESSAGE_COLUMNS = 'id, room_id, user_id, kind, text, event, created_at'

type Row = Record<string, unknown>

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

function mapMember(raw: unknown, ownerId: string | null): RoomMember | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Row
  const userId = str(m.user_id)
  if (!userId) return null
  return {
    userId,
    displayName: str(m.display_name) ?? 'ẩn danh',
    joinedAt: str(m.joined_at) ?? '',
    isOwner: userId === ownerId
  }
}

/** Row watch_rooms + danh sách watch_room_members → RoomSummary (thành viên sắp theo thời gian vào, mình lên đầu) */
export function mapRoomRow(row: unknown, members: unknown[], myId: string): RoomSummary {
  const r = (row ?? {}) as Row
  const ownerId = str(r.owner_id)
  const episodeKey = str(r.episode_slug)
  const mapped = members
    .map(m => mapMember(m, ownerId))
    .filter((m): m is RoomMember => m !== null)
    .sort((a, b) => Number(b.userId === myId) - Number(a.userId === myId) || a.joinedAt.localeCompare(b.joinedAt))

  return {
    id: str(r.id) ?? '',
    name: str(r.name) ?? '',
    members: mapped,
    lastActivityAt: str(r.last_activity_at) ?? '',
    state: {
      movie: parseRoomMovie(r.movie) ?? null,
      episode: episodeKey
        ? { serverName: str(r.server_name) ?? '', episodeKey, episodeName: str(r.episode_name) ?? episodeKey }
        : null,
      positionSec: num(r.position_sec),
      isPlaying: r.is_playing === true,
      updatedAt: str(r.state_updated_at),
      updatedBy: str(r.state_updated_by)
    }
  }
}

/** Row watch_room_messages → RoomMessage; thiếu khoá bắt buộc → null */
export function mapMessageRow(row: unknown): RoomMessage | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Row
  const id = str(r.id)
  const roomId = str(r.room_id)
  const userId = str(r.user_id)
  const kind = r.kind === 'text' || r.kind === 'event' ? r.kind : null
  if (!id || !roomId || !userId || !kind) return null

  let event: RoomMessage['event'] = null
  if (kind === 'event' && r.event && typeof r.event === 'object') {
    const e = r.event as Row
    const type = str(e.type) as RoomEventType | null
    if (type) event = str(e.value) ? { type, value: str(e.value)! } : { type }
  }

  return {
    id,
    roomId,
    userId,
    kind,
    text: kind === 'text' ? str(r.text) : null,
    event,
    createdAt: str(r.created_at) ?? ''
  }
}
