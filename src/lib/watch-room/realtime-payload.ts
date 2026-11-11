import type { ControlMessage, ControlType } from './sync'
import { parseRoomEpisode, parseRoomMovie } from './validation'

// Payload Realtime do thành viên khác gửi = dữ liệu không tin cậy → kiểm định dạng trước khi dùng

export const REACTION_EMOJIS = ['😂', '❤️', '😮', '😭', '🔥', '👏'] as const

export type PresenceInfo = {
  userId: string
  displayName: string
  positionSec: number
  isPlaying: boolean
  episodeKey: string | null
  onlineAt: number
}

export type ReactionMessage = { emoji: string; by: string; displayName: string }

const CONTROL_TYPES: readonly ControlType[] = ['play', 'pause', 'seek', 'episode', 'movie']
const MAX_POSITION_SEC = 24 * 3600

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object'
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64
const isPosition = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_POSITION_SEC
const name = (v: unknown) => (typeof v === 'string' ? v.slice(0, 40) : '')

export function parseControlMessage(raw: unknown): ControlMessage | null {
  if (!isObj(raw)) return null
  if (!CONTROL_TYPES.includes(raw.type as ControlType)) return null
  if (!isPosition(raw.positionSec) || typeof raw.isPlaying !== 'boolean') return null
  if (typeof raw.sentAt !== 'number' || !Number.isFinite(raw.sentAt) || !isId(raw.by)) return null
  const episode = parseRoomEpisode(raw.episode ?? null)
  const movie = parseRoomMovie(raw.movie ?? null)
  if (episode === undefined || movie === undefined) return null
  return {
    type: raw.type as ControlType,
    positionSec: raw.positionSec,
    isPlaying: raw.isPlaying,
    episode,
    movie,
    sentAt: raw.sentAt,
    by: raw.by
  }
}

export function parseReaction(raw: unknown): ReactionMessage | null {
  if (!isObj(raw) || !isId(raw.by)) return null
  if (!REACTION_EMOJIS.includes(raw.emoji as (typeof REACTION_EMOJIS)[number])) return null
  return { emoji: raw.emoji as string, by: raw.by, displayName: name(raw.displayName) }
}

function parsePresenceEntry(raw: unknown): PresenceInfo | null {
  if (!isObj(raw) || !isId(raw.userId) || !isPosition(raw.positionSec) || typeof raw.isPlaying !== 'boolean') {
    return null
  }
  return {
    userId: raw.userId,
    displayName: name(raw.displayName),
    positionSec: raw.positionSec,
    isPlaying: raw.isPlaying,
    episodeKey: typeof raw.episodeKey === 'string' ? raw.episodeKey.slice(0, 255) : null,
    onlineAt: typeof raw.onlineAt === 'number' ? raw.onlineAt : 0
  }
}

/** presenceState() → mỗi người 1 bản (onlineAt mới nhất) */
export function parsePresence(state: Record<string, unknown[]>): PresenceInfo[] {
  return Object.values(state).flatMap(entries => {
    const valid = (Array.isArray(entries) ? entries : [])
      .map(parsePresenceEntry)
      .filter((p): p is PresenceInfo => p !== null)
    if (!valid.length) return []
    return [valid.reduce((a, b) => (b.onlineAt >= a.onlineAt ? b : a))]
  })
}
