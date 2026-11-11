// api/rooms/[id]/route.ts — chi tiết 1 phòng (chỉ thành viên)
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { MEMBER_COLUMNS, ROOM_COLUMNS, mapRoomRow } from '@/lib/watch-room/room-mapper'
import { badRequest, notFound, readRoomId, serverError, unauthorized } from '@/lib/watch-room/api-response'

/** GET /api/rooms/[id] → { data: RoomSummary & { inviteToken } }; không là thành viên → 404 (RLS lọc mất) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const roomId = await readRoomId(params)
  if (!roomId) return badRequest('id phòng không hợp lệ')

  const { data, error } = await auth.client
    .from('watch_rooms')
    .select(`${ROOM_COLUMNS}, invite_token, watch_room_members(${MEMBER_COLUMNS})`)
    .eq('id', roomId)
    .maybeSingle()
  if (error) return serverError('get', error)
  if (!data) return notFound()

  const { watch_room_members: members, invite_token: inviteToken, ...room } = data as Record<string, unknown>
  return NextResponse.json({
    data: { ...mapRoomRow(room, Array.isArray(members) ? members : [], auth.userId), inviteToken }
  })
}
