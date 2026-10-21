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
  is_private: boolean
  watched_movie_id: string | null
  updated_at: string
}

type ReviewNode = ReviewRecord & {
  replies: ReviewNode[]
  reply_to_username?: string
  watched_score?: number | null
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

  if (!slug || !review_text) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  const payload = {
    user_id,
    user_email: user_email || 'Người dùng ẩn danh',
    slug,
    name: name || '',
    image: image || '',
    score: typeof score === 'number' ? score : 0,
    review_text,
    parent_id: parent_id || null, // Cực kỳ quan trọng
    updated_at: new Date().toISOString()
  }

  let queryResult

  if (parent_id) {
    // NẾU LÀ REPLY: Thực hiện Insert luôn (cho phép 1 người reply nhiều lần)
    queryResult = await supabase.from('movie_reviews').insert(payload)
  } else {
    // NẾU LÀ REVIEW GỐC: Thực hiện Upsert với ON CONFLICT
    // Unique constraint: (user_id, slug, parent_id)
    queryResult = await supabase.from('movie_reviews').upsert(payload, {
      onConflict: 'user_id,slug,parent_id'
    })
  }

  const { data, error } = queryResult

  if (error) {
    console.error('Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Tạo thông báo phụ trợ (Fault-tolerant, không chặn kết quả trả về)
  try {
    if (parent_id) {
      // 1. Trường hợp là Reply: Bắn thông báo cá nhân cho chủ review gốc
      const { data: parentReview } = await supabase
        .from('movie_reviews')
        .select('user_id, name, slug')
        .eq('id', parent_id)
        .maybeSingle()

      if (parentReview && parentReview.user_id && parentReview.user_id !== user_id) {
        const senderName = user_email ? user_email.split('@')[0] : 'Thành viên'
        await supabase.from('user_notifications').insert({
          user_id: parentReview.user_id,
          slug: slug || parentReview.slug,
          source: 'kkphim',
          movie_name: name || parentReview.name || 'Phim',
          episode_name: 'Bình luận',
          type: 'reply',
          sender_name: senderName,
          content: review_text.slice(0, 150),
          is_read: false
        })
      }
    } else {
      // 2. Trường hợp là Review gốc: Ghi nhận sự kiện cộng đồng (Upsert chống trùng)
      const actorName = user_email ? user_email.split('@')[0] : 'Thành viên'
      await supabase.from('community_activities').upsert(
        {
          actor_id: user_id,
          actor_name: actorName,
          action_type: 'review',
          slug,
          movie_name: name || 'Phim',
          score: typeof score === 'number' && score > 0 ? score : null,
          content: review_text.slice(0, 200),
          created_at: new Date().toISOString()
        },
        { onConflict: 'actor_id,slug,action_type' }
      )
    }
  } catch (notifErr) {
    console.error('[api/review] Lỗi tạo thông báo review/reply:', notifErr)
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
    // [NEW] Kiểm tra xem có phải owner không
    await getSession(req)
    const currentUserId = await getUserId(req)
    const isSelf = Boolean(currentUserId && currentUserId === userIdParam)

    let query = supabase
      .from('movie_reviews')
      .select('*')
      .eq('user_id', userIdParam)
      .is('parent_id', null)
      .gt('score', 0)

    // [NEW] Nếu không phải owner → chỉ xem review công khai
    if (!isSelf) {
      query = query.eq('is_private', false)
    }

    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
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
    const [{ data: flatData, error }, { data: watchedData }] = await Promise.all([
      supabase
        .from('movie_reviews')
        .select('*')
        .eq('slug', slug)
        .order('updated_at', { ascending: true }),
      supabase
        .from('watched_movies')
        .select('user_id, score')
        .eq('slug', slug)
        .not('score', 'is', null)
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const watchedScoreMap: Record<string, number> = {}
    if (watchedData) {
      for (const w of watchedData) {
        if (w.user_id && typeof w.score === 'number') {
          watchedScoreMap[w.user_id] = w.score
        }
      }
    }

    // Biến đổi dữ liệu phẳng thành cấu trúc lồng nhau (Nested) kèm watched_score
    const structuredData = buildCommentTree(flatData || [], watchedScoreMap)

    return NextResponse.json({
      data: structuredData,
      count: flatData?.length || 0
    })
  }

  return NextResponse.json({ error: 'Bắt buộc phải có slug hoặc my_reviews=1' }, { status: 400 })
}

/**
 * Hàm hỗ trợ chuyển đổi mảng phẳng thành cấu trúc cây 1 tầng (tránh Infinite Nesting)
 */
function buildCommentTree(
  flatComments: ReviewRecord[],
  watchedScoreMap: Record<string, number> = {}
): ReviewNode[] {
  const map: Record<string, ReviewNode> = {}
  const roots: ReviewNode[] = []

  // Bước 1: Tạo map để truy xuất nhanh theo ID
  flatComments.forEach(comment => {
    map[comment.id] = {
      ...comment,
      watched_score: watchedScoreMap[comment.user_id] ?? null,
      replies: []
    }
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
