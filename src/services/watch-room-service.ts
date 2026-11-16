import { queryOptions } from '@tanstack/react-query'
import type {
  InvitePreview,
  LoggableRoomEventType,
  RoomEpisode,
  RoomMessage,
  RoomMovie,
  RoomSummary
} from '@/types/watch-room'

// Client cho "Xem chung" (gọi /api/rooms/**, /api/invites/**, /api/auth/realtime-token, /api/time)

export const WATCH_ROOM_QUERY_KEY = 'watch-room'

export type RoomDetail = RoomSummary & { inviteToken: string }
export type RoomStateInput = {
  movie: RoomMovie | null
  episode: RoomEpisode | null
  positionSec: number
  isPlaying: boolean
}

/** Lỗi API mang theo HTTP status (404 = không phải thành viên / không tồn tại) */
export class RoomApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function callRoomApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new RoomApiError((json as { error?: string } | null)?.error ?? 'Không kết nối được máy chủ', res.status)
  }
  return json as T
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

/** Câu báo lỗi cho toast */
export function roomErrorMessage(err: unknown): string {
  if (err instanceof TypeError) return 'Mạng đang chập chờn, thử lại sau nhé.'
  if (err instanceof Error && err.message) return err.message
  return 'Có lỗi xảy ra, thử lại sau nhé.'
}

export const getMyRooms = (enabled = true) =>
  queryOptions<RoomSummary[]>({
    queryKey: [WATCH_ROOM_QUERY_KEY, 'list'],
    queryFn: async () => (await callRoomApi<{ data: RoomSummary[] }>('/api/rooms')).data,
    enabled
  })

export const getRoom = (id: string) =>
  queryOptions<RoomDetail>({
    queryKey: [WATCH_ROOM_QUERY_KEY, 'room', id],
    queryFn: async () => (await callRoomApi<{ data: RoomDetail }>(`/api/rooms/${encodeURIComponent(id)}`)).data,
    // 404 = không có quyền → không thử lại
    retry: (count, err) => !(err instanceof RoomApiError && err.status < 500) && count < 2
  })

export const createRoom = async (name: string) =>
  (await callRoomApi<{ data: { id: string; inviteToken: string } }>('/api/rooms', post({ name }))).data

export const saveRoomState = async (id: string, state: RoomStateInput): Promise<void> => {
  await callRoomApi<{ ok: true }>(`/api/rooms/${encodeURIComponent(id)}/state`, post(state))
}

/** Lưu snapshot lúc rời trang (pagehide) — sendBeacon vẫn gửi được khi tab đang đóng */
export function beaconRoomState(id: string, state: RoomStateInput): void {
  const url = `/api/rooms/${encodeURIComponent(id)}/state`
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' })
  if (!navigator.sendBeacon?.(url, blob)) {
    fetch(url, { method: 'POST', body: blob, keepalive: true }).catch(() => undefined)
  }
}

export const logRoomEvent = async (id: string, type: LoggableRoomEventType, value?: string): Promise<void> => {
  await callRoomApi<{ ok: true }>(`/api/rooms/${encodeURIComponent(id)}/events`, post({ type, value }))
}

export const fetchRealtimeToken = () =>
  callRoomApi<{ token: string; expiresAt: number | null }>('/api/auth/realtime-token', { cache: 'no-store' })

export const fetchServerTime = async () => (await callRoomApi<{ now: number }>('/api/time', { cache: 'no-store' })).now

export type RoomMessagePage = { data: RoomMessage[]; hasMore: boolean }

/** 50 tin, mới nhất trước; `before` = createdAt của tin cũ nhất đang có để tải thêm */
export const getRoomMessages = (id: string, before?: string) =>
  callRoomApi<RoomMessagePage>(
    `/api/rooms/${encodeURIComponent(id)}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`
  )

export const sendRoomMessage = async (id: string, text: string) =>
  (await callRoomApi<{ data: RoomMessage }>(`/api/rooms/${encodeURIComponent(id)}/messages`, post({ text }))).data

export const getInvitePreview = (token: string) =>
  queryOptions<InvitePreview>({
    queryKey: [WATCH_ROOM_QUERY_KEY, 'invite', token],
    queryFn: async () => (await callRoomApi<{ data: InvitePreview }>(`/api/invites/${encodeURIComponent(token)}`)).data,
    retry: (count, err) => !(err instanceof RoomApiError && err.status < 500) && count < 2
  })

export const joinInvite = async (token: string) =>
  (await callRoomApi<{ data: { roomId: string } }>(`/api/invites/${encodeURIComponent(token)}`, { method: 'POST' }))
    .data
