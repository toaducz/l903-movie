import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { getUserId } from '../../../lib/auth-helper'

async function setSession(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value
  const refresh_token = req.cookies.get('sb-refresh-token')?.value
  if (!access_token) return
  await supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' })
}

/** GET /api/notifications - Lấy danh sách thông báo */
export async function GET(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, slug, movie_name, episode_name, is_read, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** PUT /api/notifications - Đánh dấu đã đọc */
export async function PUT(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()

  // Đánh dấu tất cả
  if (body.all === true) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user_id)
      .eq('is_read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Đánh dấu 1 cái cụ thể
  if (body.id) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', user_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Thiếu tham số id hoặc all' }, { status: 400 })
}
