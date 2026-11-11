// api/rooms/[id]/state/route.ts — lưu snapshot phát (phim / tập / vị trí) cho "Tiếp tục xem"
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { parseRoomEpisode, parseRoomMovie } from '@/lib/watch-room/validation'
import {
  badRequest,
  isForbiddenError,
  notFound,
  readRoomId,
  serverError,
  unauthorized
} from '@/lib/watch-room/api-response'

const MAX_POSITION_SEC = 24 * 3600

/** POST /api/rooms/[id]/state  body: { movie, episode, positionSec, isPlaying } → { ok: true } (gọi cả từ sendBeacon) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const roomId = await readRoomId(params)
  if (!roomId) return badRequest('id phòng không hợp lệ')

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return badRequest('Body không hợp lệ')
  const movie = parseRoomMovie(body.movie ?? null)
  const episode = parseRoomEpisode(body.episode ?? null)
  const positionSec = body.positionSec
  if (movie === undefined) return badRequest('movie không hợp lệ')
  if (episode === undefined) return badRequest('episode không hợp lệ')
  if (typeof positionSec !== 'number' || !Number.isFinite(positionSec) || positionSec < 0) {
    return badRequest('positionSec không hợp lệ')
  }

  const { error } = await auth.client.rpc('save_room_state', {
    p_room_id: roomId,
    p_movie: movie,
    p_server_name: episode?.serverName ?? null,
    p_episode_slug: episode?.episodeKey ?? null,
    p_episode_name: episode?.episodeName ?? null,
    p_position_sec: Math.min(positionSec, MAX_POSITION_SEC),
    p_is_playing: body.isPlaying === true
  })
  if (isForbiddenError(error)) return notFound()
  if (error) return serverError('save state', error)
  return NextResponse.json({ ok: true })
}
