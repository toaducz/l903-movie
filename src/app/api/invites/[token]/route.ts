// api/invites/[token]/route.ts — xem trước lời mời + vào phòng bằng link
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { isValidInviteToken, parseRoomMovie } from '@/lib/watch-room/validation'
import { displayNameFromEmail } from '@/lib/watch-room/chat-format'
import { serverError, unauthorized } from '@/lib/watch-room/api-response'
import type { InvitePreview } from '@/types/watch-room'

type Ctx = { params: Promise<{ token: string }> }

const invalidToken = () => NextResponse.json({ error: 'invalid_token' }, { status: 404 })

async function readToken(params: Ctx['params']): Promise<string | null> {
  const { token } = await params
  return isValidInviteToken(token) ? token : null
}

/** GET /api/invites/[token] → { data: InvitePreview } | 404 { error: 'invalid_token' } */
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const token = await readToken(params)
  if (!token) return invalidToken()

  const { data, error } = await auth.client.rpc('room_invite_preview', { p_token: token })
  if (error) return serverError('invite preview', error)
  if (!data || typeof data !== 'object') return invalidToken()

  const raw = data as Record<string, unknown>
  const isMember = raw.is_member === true
  const preview: InvitePreview = {
    name: String(raw.name ?? ''),
    inviter: String(raw.inviter ?? 'ai đó'),
    memberCount: Number(raw.member_count) || 0,
    movie: parseRoomMovie(raw.movie ?? null) ?? null,
    episodeName: typeof raw.episode_name === 'string' ? raw.episode_name : null,
    positionSec: Number(raw.position_sec) || 0,
    isMember,
    roomId: isMember && typeof raw.room_id === 'string' ? raw.room_id : null
  }
  return NextResponse.json({ data: preview })
}

/** POST /api/invites/[token] → { data: { roomId } } (đã là thành viên thì vẫn trả roomId) */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const token = await readToken(params)
  if (!token) return invalidToken()

  const { data, error } = await auth.client.rpc('join_room', {
    p_token: token,
    p_display_name: displayNameFromEmail(auth.email)
  })
  if (error?.code === 'P0002' || error?.message?.includes('invalid_token')) return invalidToken()
  if (error) return serverError('join', error)
  if (typeof data !== 'string') return serverError('join result', data)
  return NextResponse.json({ data: { roomId: data } })
}
