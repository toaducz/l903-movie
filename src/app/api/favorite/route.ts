// api/favorite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { getUserId } from '../../../lib/auth-helper'

async function getSession(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value
  const refresh_token = req.cookies.get('sb-refresh-token')?.value
  if (!access_token) {
    return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })
  }

  // Thiết lập phiên xác thực cho client
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || ''
  })
  if (sessionError) {
    console.error('Lỗi thiết lập phiên:', sessionError.message, sessionError)
    return NextResponse.json({ error: 'Không thể thiết lập phiên', details: sessionError.message }, { status: 401 })
  }
}

/** POST /favorite - thêm vào yêu thích */
export async function POST(req: NextRequest) {
  await getSession(req)

  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })
  }

  const { slug, name, image, source } = await req.json()
  if (!slug) {
    return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('favorite')
    .insert([{ user_id: user_id, slug: slug, name: name, image: image, source: source ?? 'ophim' }])

  if (error) {
    console.error('Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/** DELETE /favorite - xóa khỏi yêu thích */
export async function DELETE(req: NextRequest) {
  await getSession(req)

  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })
  }

  const { slug } = await req.json()
  if (!slug) {
    return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 })
  }

  const { data, error } = await supabase.from('favorite').delete().eq('user_id', user_id).eq('slug', slug)

  if (error) {
    console.error('Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/** GET /favorite?page=1&limit=10 - danh sách yêu thích có phân trang */
export async function GET(req: NextRequest) {
  await getSession(req)

  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('favorite')
    .select('*', { count: 'exact' })
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    page,
    totalPages: count ? Math.ceil(count / limit) : 1
  })
}
