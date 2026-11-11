// api/rooms/[id]/messages/route.ts — lịch sử chat (phân trang) + gửi tin
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { isIsoTimestamp, parseMessageText } from '@/lib/watch-room/validation'
import { MESSAGE_COLUMNS, mapMessageRow } from '@/lib/watch-room/room-mapper'
import {
  badRequest,
  isForbiddenError,
  notFound,
  readRoomId,
  serverError,
  unauthorized
} from '@/lib/watch-room/api-response'
import type { RoomMessage } from '@/types/watch-room'

const PAGE_SIZE = 50

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/rooms/[id]/messages?before=<iso> → { data: RoomMessage[] (mới nhất trước), hasMore } */
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const roomId = await readRoomId(params)
  if (!roomId) return badRequest('id phòng không hợp lệ')

  const before = new URL(req.url).searchParams.get('before')
  if (before !== null && !isIsoTimestamp(before)) return badRequest('before không hợp lệ')

  let query = auth.client
    .from('watch_room_messages')
    .select(MESSAGE_COLUMNS)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)
  if (before) query = query.lt('created_at', before)

  // Kiểm thành viên song song: RLS trả rỗng cho người ngoài, nhưng cần 404 rõ ràng
  const [roomRes, listRes] = await Promise.all([
    auth.client.from('watch_rooms').select('id').eq('id', roomId).maybeSingle(),
    query
  ])
  if (roomRes.error) return serverError('messages room', roomRes.error)
  if (!roomRes.data) return notFound()
  if (listRes.error) return serverError('messages list', listRes.error)

  const rows = listRes.data ?? []
  const data = rows
    .slice(0, PAGE_SIZE)
    .map(mapMessageRow)
    .filter((m): m is RoomMessage => m !== null)
  return NextResponse.json({ data, hasMore: rows.length > PAGE_SIZE })
}

/** POST /api/rooms/[id]/messages  body: { text } → { data: RoomMessage } */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const roomId = await readRoomId(params)
  if (!roomId) return badRequest('id phòng không hợp lệ')

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null
  const text = parseMessageText(body?.text)
  if (!text.ok) return badRequest(text.error)

  const { data, error } = await auth.client
    .from('watch_room_messages')
    // user_id để DB tự điền auth.uid() (chỉ được grant insert các cột cần thiết)
    .insert({ room_id: roomId, kind: 'text', text: text.value })
    .select(MESSAGE_COLUMNS)
    .single()
  // RLS chặn (không phải thành viên) → 42501
  if (isForbiddenError(error)) return notFound()
  // 54000 = trigger chống spam (≥ 10 tin / 10 giây)
  if (error?.code === '54000') return NextResponse.json({ error: 'Gửi chậm lại chút nha' }, { status: 429 })
  if (error) return serverError('send message', error)

  const message = mapMessageRow(data)
  if (!message) return serverError('send message map', data)
  return NextResponse.json({ data: message })
}
