import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { supabase } from '@/lib/supabase-client'

/** POST /api/history - upsert lịch sử xem */
export async function POST(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { slug, name, image, episode_name, progress, duration, source } = await req.json()
  if (!slug) return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 })

  const { error } = await auth.client.from('watch_history').upsert(
    {
      user_id: auth.userId,
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

/** GET /api/history - lấy danh sách lịch sử (cho phép xem công khai nếu user bật public) */
export async function GET(req: NextRequest) {
  const auth = await getUserSupabase(req)
  const { searchParams } = new URL(req.url)
  const paramUserId = searchParams.get('user_id')

  // Nếu không chỉ định user_id thì bắt buộc phải đăng nhập (để xem của chính mình)
  if (!paramUserId && !auth) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const targetUserId = paramUserId || auth?.userId
  if (!targetUserId) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const isSelf = Boolean(auth?.userId && targetUserId === auth.userId)

  if (!isSelf) {
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

  // Dùng authenticated client riêng cho chính chủ, anon client cho người xem khác
  const queryDb = isSelf && auth ? auth.client : supabase
  const { data, error } = await queryDb
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
  const auth = await getUserSupabase(req)
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  const source = req.nextUrl.searchParams.get('source')?.trim()

  let query = auth.client.from('watch_history').delete().eq('user_id', auth.userId)
  if (slug) {
    query = query.eq('slug', slug)
    if (source) query = query.eq('source', source)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
