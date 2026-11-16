// api/rooms/[id]/events/route.ts — ghi sự kiện điều khiển (play / pause / tua / đổi tập / đổi phim) vào chat
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { isLoggableEvent } from '@/lib/watch-room/validation'
import {
  badRequest,
  isForbiddenError,
  notFound,
  readRoomId,
  serverError,
  unauthorized
} from '@/lib/watch-room/api-response'

/** POST /api/rooms/[id]/events  body: { type, value? } → { ok: true } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const roomId = await readRoomId(params)
  if (!roomId) return badRequest('id phòng không hợp lệ')

  const body = (await req.json().catch(() => null)) as { type?: unknown; value?: unknown } | null
  if (!isLoggableEvent(body?.type)) return badRequest('type phải là pause, play, seek, episode hoặc movie')
  const value = typeof body.value === 'string' && body.value.trim() ? body.value.trim().slice(0, 255) : null

  const { error } = await auth.client.rpc('log_room_event', { p_room_id: roomId, p_type: body.type, p_value: value })
  if (isForbiddenError(error)) return notFound()
  if (error) return serverError('log event', error)
  return NextResponse.json({ ok: true })
}
