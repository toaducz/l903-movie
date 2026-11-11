import type { RoomMessage } from '@/types/watch-room'

// Định dạng hiển thị cho "Xem chung": tên, màu avatar, thời gian, link trong chat, gộp tin

const NAME_MAX = 16
const GROUP_WINDOW_MS = 2 * 60_000
const EVENT_MERGE_MS = 5_000
const TONES = ['pink', 'yel', 'cyan', 'orange'] as const
export type AvatarTone = (typeof TONES)[number]

/** Phần trước @ của email, chữ thường, quá 16 ký tự thì cắt + … */
export function displayNameFromEmail(email: string | null | undefined): string {
  const local = (email ?? '').split('@')[0].trim().toLowerCase()
  if (!local) return 'ẩn danh'
  return local.length > NAME_MAX ? `${local.slice(0, NAME_MAX)}…` : local
}

/** Màu avatar ổn định theo userId (hash djb2) */
export function avatarTone(userId: string): AvatarTone {
  let hash = 5381
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) + hash + userId.charCodeAt(i)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

/** 2120 → '35:20', 3725 → '1:02:05' */
export function formatPosition(sec: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export type LinkPart = { kind: 'text'; value: string } | { kind: 'link'; href: string; value: string }

const URL_RE = /https?:\/\/[^\s<>"']+/gi
const TRAILING_PUNCT_RE = /[.,!?;:)\]}]+$/

/** Tách chuỗi thành text / link (chỉ http(s)) — render bằng text node, không dùng HTML */
export function linkify(text: string): LinkPart[] {
  const parts: LinkPart[] = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0
    const href = match[0].replace(TRAILING_PUNCT_RE, '')
    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start) })
    parts.push({ kind: 'link', href, value: href })
    last = start + href.length
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

export type ChatItem =
  | { kind: 'day'; label: string }
  | { kind: 'event'; message: RoomMessage; count: number }
  | { kind: 'group'; userId: string; mine: boolean; messages: RoomMessage[] }

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function dayLabel(d: Date, now: Date): string {
  if (dayKey(d) === dayKey(now)) return 'HÔM NAY'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(d) === dayKey(yesterday)) return 'HÔM QUA'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

const isPlayPause = (m: RoomMessage) => m.kind === 'event' && (m.event?.type === 'play' || m.event?.type === 'pause')

/** Dựng danh sách hiển thị: tăng dần theo thời gian, gộp tin cùng người, gộp play/pause dồn dập, chèn ngày */
export function buildChatItems(messages: RoomMessage[], myId: string, now: Date): ChatItem[] {
  const sorted = [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const items: ChatItem[] = []
  let lastDay = ''

  for (const message of sorted) {
    const created = new Date(message.createdAt)
    const key = dayKey(created)
    if (key !== lastDay) {
      items.push({ kind: 'day', label: dayLabel(created, now) })
      lastDay = key
    }

    const prev = items[items.length - 1]
    const gap = (p: RoomMessage) => created.getTime() - Date.parse(p.createdAt)

    if (message.kind === 'event') {
      if (
        prev?.kind === 'event' &&
        isPlayPause(prev.message) &&
        isPlayPause(message) &&
        gap(prev.message) <= EVENT_MERGE_MS
      ) {
        items[items.length - 1] = { kind: 'event', message, count: prev.count + 1 }
      } else {
        items.push({ kind: 'event', message, count: 1 })
      }
      continue
    }

    if (
      prev?.kind === 'group' &&
      prev.userId === message.userId &&
      gap(prev.messages[prev.messages.length - 1]) <= GROUP_WINDOW_MS
    ) {
      items[items.length - 1] = { ...prev, messages: [...prev.messages, message] }
    } else {
      items.push({ kind: 'group', userId: message.userId, mine: message.userId === myId, messages: [message] })
    }
  }
  return items
}
