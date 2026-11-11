import type { RoomEpisode, RoomMovie } from '@/types/watch-room'

// Thuật toán đồng bộ "Xem chung" (thuần, không đụng DOM / video.js) — xem spec §4.3

export type ControlType = 'play' | 'pause' | 'seek' | 'episode' | 'movie'

export type ControlMessage = {
  type: ControlType
  positionSec: number
  isPlaying: boolean
  episode: RoomEpisode | null
  movie: RoomMovie | null
  sentAt: number // ms theo đồng hồ server ước lượng
  by: string // userId người gửi
}

export const SEEK_TOLERANCE_SEC = 0.5
const TOKEN_REFRESH_LEAD_MS = 60_000
const ECHO_GUARD_MS = 800

/** Vị trí cần tới: đang phát thì bù thời gian đã trôi kể từ lúc gửi; clamp trong [0, duration] */
export function targetPosition(msg: ControlMessage, serverNow: number, duration: number | null): number {
  const elapsed = msg.isPlaying ? (serverNow - msg.sentAt) / 1000 : 0
  const raw = Math.max(0, msg.positionSec + elapsed)
  return duration !== null && Number.isFinite(duration) && duration > 0 ? Math.min(raw, duration) : raw
}

/** Lệch nhỏ thì thôi, tránh giật */
export const shouldSeek = (current: number, target: number): boolean => Math.abs(current - target) >= SEEK_TOLERANCE_SEC

/** Last-write-wins: sentAt lớn hơn thắng; trùng ms thì so `by` để mọi máy chọn cùng một lệnh */
export function isNewer(msg: Pick<ControlMessage, 'sentAt' | 'by'>, last: Pick<ControlMessage, 'sentAt' | 'by'> | null) {
  if (!last) return true
  if (msg.sentAt !== last.sentAt) return msg.sentAt > last.sentAt
  return msg.by > last.by
}

export type ClockSample = { sentAt: number; receivedAt: number; serverTime: number }

/** offset = serverTime + RTT/2 − receivedAt, lấy mẫu RTT nhỏ nhất (ít nhiễu nhất) */
export function estimateServerOffset(samples: ClockSample[]): number {
  if (!samples.length) return 0
  const best = samples.reduce((a, b) => (b.receivedAt - b.sentAt < a.receivedAt - a.sentAt ? b : a))
  const rtt = best.receivedAt - best.sentAt
  return best.serverTime + rtt / 2 - best.receivedAt
}

/** Bao lâu nữa thì lấy access token mới cho Realtime (trước hạn 60s) */
export const msUntilTokenRefresh = (expiresAtSec: number, nowMs: number): number =>
  Math.max(0, expiresAtSec * 1000 - nowMs - TOKEN_REFRESH_LEAD_MS)

export type EchoKind = 'seek' | 'play' | 'pause'

export type EchoGuard = {
  suppress(kind: EchoKind, ms?: number): void
  isSuppressed(kind: EchoKind, now?: number): boolean
}

/** Đánh dấu thao tác do code gây ra (áp lệnh từ xa, nhảy quảng cáo…) để không phát ngược lại */
export function createEchoGuard(): EchoGuard {
  const until: Record<EchoKind, number> = { seek: 0, play: 0, pause: 0 }
  return {
    suppress(kind, ms = ECHO_GUARD_MS) {
      until[kind] = Math.max(until[kind], Date.now() + ms)
    },
    isSuppressed(kind, now = Date.now()) {
      return now < until[kind]
    }
  }
}
