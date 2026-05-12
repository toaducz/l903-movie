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
      source: source ?? 'kkphim',
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
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { data, error } = await supabase
    .from('watch_history')
    .select('slug, name, image, episode_name, progress, duration, source, updated_at')
    .eq('user_id', user_id)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** DELETE /api/history - xóa toàn bộ lịch sử */
export async function DELETE(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { error } = await supabase.from('watch_history').delete().eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
