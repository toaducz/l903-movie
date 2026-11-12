import type { RoomMessage } from '@/types/watch-room'

// Hàng đợi bong bóng chat khi player phòng đang toàn màn hình: tối đa 4 cái, mỗi cái sống 6s

export const BUBBLE_MAX = 4
export const BUBBLE_TTL_MS = 6000

export type Bubble = { id: string; userId: string; text: string; expiresAt: number }

export function pruneBubbles(list: Bubble[], now: number): Bubble[] {
  const alive = list.filter(b => b.expiresAt > now)
  return alive.length === list.length ? list : alive
}

/** Thêm tin text mới (bỏ tin sự kiện, tin rỗng, tin đã có), bỏ cái hết hạn, giữ BUBBLE_MAX cái mới nhất */
export function pushBubbles(list: Bubble[], incoming: RoomMessage[], now: number): Bubble[] {
  const alive = pruneBubbles(list, now)
  const ids = new Set(alive.map(b => b.id))
  const fresh = incoming
    .filter(m => m.kind === 'text' && m.text && !ids.has(m.id))
    .map(m => ({ id: m.id, userId: m.userId, text: m.text as string, expiresAt: now + BUBBLE_TTL_MS }))
  return [...alive, ...fresh].slice(-BUBBLE_MAX)
}
