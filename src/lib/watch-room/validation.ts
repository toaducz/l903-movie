import type { LoggableRoomEventType, RoomEpisode, RoomMovie } from '@/types/watch-room'
import type { MovieSource } from '@/types/movie'

// Kiểm tra input "Xem chung" ở biên API — khớp ràng buộc trong supabase/xem_chung.sql

export const ROOM_NAME_MAX = 40
export const MESSAGE_MAX = 500

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,254}$/
const SOURCES: readonly MovieSource[] = ['kkphim', 'vsmov', 'nguonc']
const LOGGABLE_EVENTS: readonly LoggableRoomEventType[] = ['pause', 'play', 'seek', 'episode', 'movie']

function parseTrimmed(input: unknown, max: number, label: string): ParseResult<string> {
  if (typeof input !== 'string') return { ok: false, error: `${label} không hợp lệ` }
  const value = input.trim()
  if (!value) return { ok: false, error: `${label} không được để trống` }
  if (value.length > max) return { ok: false, error: `${label} tối đa ${max} ký tự` }
  return { ok: true, value }
}

export const parseRoomName = (input: unknown) => parseTrimmed(input, ROOM_NAME_MAX, 'Tên phòng')

export const parseMessageText = (input: unknown) => parseTrimmed(input, MESSAGE_MAX, 'Tin nhắn')

export const isValidInviteToken = (token: string): boolean => INVITE_TOKEN_RE.test(token)

export const isUuid = (id: string): boolean => UUID_RE.test(id)

export const episodeKeyOf = (ep: { slug: string; name: string }): string => ep.slug || ep.name

export const isLoggableEvent = (type: unknown): type is LoggableRoomEventType =>
  LOGGABLE_EVENTS.includes(type as LoggableRoomEventType)

const shortText = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

/** movie trong body: null hoặc { source, slug, title, poster } hợp lệ; undefined = sai định dạng */
export function parseRoomMovie(input: unknown): RoomMovie | null | undefined {
  if (input === null) return null
  if (!input || typeof input !== 'object') return undefined
  const m = input as Record<string, unknown>
  const source = m.source === 'ophim' ? 'vsmov' : m.source
  if (!SOURCES.includes(source as MovieSource) || typeof m.slug !== 'string' || !SLUG_RE.test(m.slug)) return undefined
  const title = shortText(m.title, 300)
  if (!title) return undefined
  const poster = typeof m.poster === 'string' && /^https?:\/\//.test(m.poster) ? m.poster.slice(0, 1000) : ''
  return { source: source as MovieSource, slug: m.slug, title, poster }
}

/** episode trong body: null hoặc { serverName, episodeKey, episodeName }; undefined = sai định dạng */
export function parseRoomEpisode(input: unknown): RoomEpisode | null | undefined {
  if (input === null) return null
  if (!input || typeof input !== 'object') return undefined
  const e = input as Record<string, unknown>
  const serverName = shortText(e.serverName, 200)
  const episodeKey = shortText(e.episodeKey, 255)
  const episodeName = shortText(e.episodeName, 255) ?? episodeKey
  if (serverName === null || !episodeKey || !episodeName) return undefined
  return { serverName, episodeKey, episodeName }
}
