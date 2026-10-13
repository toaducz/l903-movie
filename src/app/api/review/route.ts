import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { getUserId } from '../../../lib/auth-helper'

type ReviewRecord = {
  id: string
  user_id: string
  user_email: string
  slug: string
  name: string
  image: string
  score: number
  review_text: string
  parent_id: string | null
  updated_at: string
}

type ReviewNode = ReviewRecord & {
  replies: ReviewNode[]
  reply_to_username?: string
}

async function getSession(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value
  const refresh_token = req.cookies.get('sb-refresh-token')?.value
  if (!access_token) {
    return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || ''
  })
  if (sessionError) {
    console.error('Lỗi thiết lập phiên:', sessionError.message, sessionError)
    return NextResponse.json({ error: 'Không thể thiết lập phiên', details: sessionError.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  await getSession(req)
  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })
  }

  // Nhận thêm parent_id từ request
  const { slug, name, image, score, review_text, user_email, parent_id } = await req.json()

  if (!slug || score === undefined || !review_text) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  const payload = {
    user_id,
    user_email: user_email || 'Người dùng ẩn danh',
    slug,
    name,
    image,
    score,
    review_text,
    parent_id: parent_id || null, // Cực kỳ quan trọng
    updated_at: new Date().toISOString()
  }

  let queryResult

  if (parent_id) {
    // NẾU LÀ REPLY: Thực hiện Insert luôn (cho phép 1 người reply nhiều lần)
    queryResult = await supabase.from('movie_reviews').insert(payload)
  } else {
    // NẾU LÀ REVIEW GỐC: Thực hiện Upsert như cũ
    // Nó sẽ dựa vào cái Index mới tạo ở DB để bắt onConflict
    queryResult = await supabase.from('movie_reviews').upsert(payload, { onConflict: 'user_id, slug' })
  }

  const { data, error } = queryResult

  if (error) {
    console.error('Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, success: true })
}

export async function PUT(req: NextRequest) {
  await getSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

  const { id, review_text, score } = await req.json()
  if (!id || review_text === undefined) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  const payload: { review_text: string; updated_at: string; score?: number } = {
    review_text,
    updated_at: new Date().toISOString()
  }
  if (score !== undefined) payload.score = score

  const { error } = await supabase
    .from('movie_reviews')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  await getSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { error } = await supabase
    .from('movie_reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const my_reviews = searchParams.get('my_reviews')
  const userIdParam = searchParams.get('user_id')

  // Lấy review của một user cụ thể (khi xem profile người khác)
  if (userIdParam) {
    const { data, error } = await supabase
      .from('movie_reviews')
      .select('*')
      .eq('user_id', userIdParam)
      .is('parent_id', null)
      .gt('score', 0)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Logic lấy review của cá nhân (khi xem profile của chính mình)
  if (my_reviews === '1') {
    await getSession(req)
    const user_id = await getUserId(req)
    if (!user_id) return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })

    const { data, error } = await supabase
      .from('movie_reviews')
      .select('*')
      .eq('user_id', user_id)
      .is('parent_id', null)
      .gt('score', 0)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Logic lấy toàn bộ comment của một phim và cấu trúc lại
  if (slug) {
    const { data: flatData, error } = await supabase
      .from('movie_reviews')
      .select('*')
      .eq('slug', slug)
      .order('updated_at', { ascending: true }) // Sắp xếp cũ trước mới sau để dễ dựng cây

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Biến đổi dữ liệu phẳng thành cấu trúc lồng nhau (Nested)
    const structuredData = buildCommentTree(flatData)

    return NextResponse.json({
      data: structuredData,
      count: flatData.length
    })
  }

  return NextResponse.json({ error: 'Bắt buộc phải có slug hoặc my_reviews=1' }, { status: 400 })
}

/**
 * Hàm hỗ trợ chuyển đổi mảng phẳng thành cấu trúc cây 1 tầng (tránh Infinite Nesting)
 */
function buildCommentTree(flatComments: ReviewRecord[]): ReviewNode[] {
  const map: Record<string, ReviewNode> = {}
  const roots: ReviewNode[] = []

  // Bước 1: Tạo map để truy xuất nhanh theo ID
  flatComments.forEach(comment => {
    map[comment.id] = { ...comment, replies: [] }
  })

  // Bước 2: Duyệt qua từng comment
  // Bất kể reply ở tầng level mấy, đều được gộp chung vào mảng .replies của bình luận gốc
  flatComments.forEach(comment => {
    if (comment.parent_id && map[comment.parent_id]) {
      const parent = map[comment.parent_id]
      // Đính kèm tên người dùng của comment cha để UI dễ hiển thị Mentions (@username)
      map[comment.id].reply_to_username = parent.user_email.split('@')[0]

      // Tìm gốc thực sự (Root Comment)
      let root = parent
      while (root.parent_id && map[root.parent_id]) {
        root = map[root.parent_id]
      }

      // Nhét thẳng reply vào list replies của gốc
      map[root.id].replies.push(map[comment.id])
    } else {
      roots.push(map[comment.id])
    }
  })

  // Bước 3: Đảo ngược lại gốc nếu muốn thấy root review mới nhất ở trên cùng
  return roots.reverse()
}
