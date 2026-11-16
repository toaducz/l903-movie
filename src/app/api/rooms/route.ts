// api/rooms/route.ts — phòng "Xem chung" của tôi + tạo phòng
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { parseRoomName } from '@/lib/watch-room/validation'
import { displayNameFromEmail } from '@/lib/watch-room/chat-format'
import { MEMBER_COLUMNS, ROOM_COLUMNS, mapRoomRow } from '@/lib/watch-room/room-mapper'
import { badRequest, serverError, unauthorized } from '@/lib/watch-room/api-response'

const MAX_ROOMS = 50

/** GET /api/rooms → { data: RoomSummary[] } (mới hoạt động trước). RLS chỉ trả phòng mình là thành viên. */
export async function GET(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const { data, error } = await auth.client
    .from('watch_rooms')
    .select(`${ROOM_COLUMNS}, watch_room_members(${MEMBER_COLUMNS})`)
    .order('last_activity_at', { ascending: false })
    .limit(MAX_ROOMS)
  if (error) return serverError('list', error)

  const rooms = (data ?? []).map(row => {
    const { watch_room_members: members, ...room } = row as Record<string, unknown>
    return mapRoomRow(room, Array.isArray(members) ? members : [], auth.userId)
  })
  return NextResponse.json({ data: rooms })
}

/** POST /api/rooms  body: { name } → { data: { id, inviteToken } } */
export async function POST(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null
  const name = parseRoomName(body?.name)
  if (!name.ok) return badRequest(name.error)

  const { data, error } = await auth.client.rpc('create_room', {
    p_name: name.value,
    p_display_name: displayNameFromEmail(auth.email)
  })
  // 54000 = đã sở hữu quá nhiều phòng (giới hạn trong SQL)
  if (error?.code === '54000') return badRequest('Bạn đã có quá nhiều phòng')
  if (error) return serverError('create', error)

  // RPC trả về bảng → supabase-js trả mảng [{ room_id, token }]
  const row = (Array.isArray(data) ? data[0] : data) as { room_id?: unknown; token?: unknown } | null
  if (typeof row?.room_id !== 'string' || typeof row.token !== 'string') return serverError('create result', data)
  return NextResponse.json({ data: { id: row.room_id, inviteToken: row.token } })
}
