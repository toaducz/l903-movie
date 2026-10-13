import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { getUserId } from '../../../lib/auth-helper'

async function setSession(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value
  const refresh_token = req.cookies.get('sb-refresh-token')?.value
  if (!access_token) return
  await supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' })
}

/** POST /api/history - upsert lịch sử xem */
export async function POST(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { slug, name, image, episode_name, progress, duration, source } = await req.json()
  if (!slug) return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 })

  const { error } = await supabase.from('watch_history').upsert(
    {
      user_id,
      slug,
      name,
      image,
      episode_name,
      progress: progress ?? 0,
      duration: duration ?? 0,
      source: source ?? 'ophim',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,slug,source' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** GET /api/history - lấy danh sách lịch sử */
export async function GET(req: NextRequest) {
  await setSession(req)
  const currentUserId = await getUserId(req)
  if (!currentUserId) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('user_id') || currentUserId

  if (targetUserId !== currentUserId) {
    const { data: privacy } = await supabase
      .from('user_privacy_settings')
      .select('is_history_public')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (!privacy?.is_history_public) {
      return NextResponse.json(
        { error: 'Lịch sử xem phim của người dùng này đang ở chế độ riêng tư', is_private: true },
        { status: 403 }
      )
    }
  }

  const { data, error } = await supabase
    .from('watch_history')
    .select('slug, name, image, episode_name, progress, duration, source, updated_at')
    .eq('user_id', targetUserId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** DELETE /api/history - xóa toàn bộ lịch sử, hoặc 1 phim nếu có ?slug=&source= */
export async function DELETE(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  const source = req.nextUrl.searchParams.get('source')?.trim()

  let query = supabase.from('watch_history').delete().eq('user_id', user_id)
  if (slug) {
    query = query.eq('slug', slug)
    if (source) query = query.eq('source', source)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
