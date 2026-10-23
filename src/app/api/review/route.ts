import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { getUserSupabase } from '@/lib/supabase-user-client'

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

export async function POST(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string
    name?: string
    image?: string
    score?: number
    review_text?: string
    user_email?: string
    parent_id?: string | null
    is_private?: boolean
    watched_movie_id?: string | null
  }

  const { slug, name, image, score, review_text, user_email, parent_id, is_private, watched_movie_id } = body

  if (!slug || !review_text) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  // Luôn ưu tiên email thật từ phiên đăng nhập server-side (tránh rò rỉ hoặc thiếu từ client)
  const resolvedEmail = auth.email || (typeof user_email === 'string' && user_email ? user_email : 'Người dùng ẩn danh')

  // Xử lý cờ is_private:
  // 1. Nếu client truyền boolean tường minh -> ưu tiên client
  // 2. Nếu sync từ watched_movies -> kiểm tra cài đặt riêng tư của người dùng
  // 3. Mặc định review thông thường -> false (công khai)
  let resolvedIsPrivate = false
  if (typeof is_private === 'boolean') {
    resolvedIsPrivate = is_private
  } else if (watched_movie_id) {
    const { data: privacy } = await supabase
      .from('user_privacy_settings')
      .select('is_watched_public')
      .eq('user_id', auth.userId)
      .maybeSingle()
    resolvedIsPrivate = !Boolean(privacy?.is_watched_public)
  }

  const payload = {
    user_id: auth.userId,
    user_email: resolvedEmail,
    slug,
    name: name || '',
    image: image || '',
    score: typeof score === 'number' ? score : 0,
    review_text: review_text.trim(),
    parent_id: parent_id || null,
    is_private: resolvedIsPrivate,
    watched_movie_id: watched_movie_id || null,
    updated_at: new Date().toISOString()
  }

  let queryResult

  if (parent_id) {
    // Reply: Insert mới
    queryResult = await auth.client.from('movie_reviews').insert(payload).select().single()
  } else {
    // Review gốc: Kiểm tra xem đã có review gốc của user cho slug này chưa
    const { data: existingReview } = await auth.client
      .from('movie_reviews')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('slug', slug)
      .is('parent_id', null)
      .maybeSingle()

    if (existingReview?.id) {
      queryResult = await auth.client
        .from('movie_reviews')
        .update(payload)
        .eq('id', existingReview.id)
        .select()
        .single()
    } else {
      queryResult = await auth.client.from('movie_reviews').insert(payload).select().single()
    }
  }

  const { data, error } = queryResult

  if (error) {
    console.error('[api/review] Lỗi Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Tạo thông báo phụ trợ & community_activities (chỉ khi không phải review riêng tư)
  try {
    if (parent_id) {
      // 1. Reply: Bắn thông báo cá nhân cho chủ review gốc
      const { data: parentReview } = await supabase
        .from('movie_reviews')
        .select('user_id, name, slug')
        .eq('id', parent_id)
        .maybeSingle()

      if (parentReview && parentReview.user_id && parentReview.user_id !== auth.userId) {
        const senderName = auth.name || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Thành viên')
        await supabase.from('user_notifications').insert({
          user_id: parentReview.user_id,
          slug: slug || parentReview.slug,
          source: 'kkphim',
          movie_name: name || parentReview.name || 'Phim',
          episode_name: 'Bình luận',
          type: 'reply',
          sender_name: senderName,
          content: payload.review_text.slice(0, 150),
          is_read: false
        })
      }
    } else if (!resolvedIsPrivate) {
      // 2. Review gốc công khai: Ghi nhận sự kiện cộng đồng
      const actorName = auth.name || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Thành viên')
      await auth.client.from('community_activities').upsert(
        {
          actor_id: auth.userId,
          actor_name: actorName,
          actor_avatar: auth.avatarUrl || null,
          action_type: 'review',
          slug,
          movie_name: name || 'Phim',
          score: typeof score === 'number' && score > 0 ? score : null,
          content: payload.review_text.slice(0, 200),
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
  const auth = await getUserSupabase(req)
  if (!auth) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    id?: string
    review_text?: string
    score?: number
    is_private?: boolean
  }
  const { id, review_text, score, is_private } = body
  if (!id || review_text === undefined) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  const payload: { review_text: string; updated_at: string; score?: number; is_private?: boolean } = {
    review_text: review_text.trim(),
    updated_at: new Date().toISOString()
  }
  if (typeof score === 'number') payload.score = score
  if (typeof is_private === 'boolean') payload.is_private = is_private

  const { error } = await auth.client.from('movie_reviews').update(payload).eq('id', id).eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const slug = searchParams.get('slug')

  if (!id && !slug) {
    return NextResponse.json({ error: 'Thiếu id hoặc slug' }, { status: 400 })
  }

  let error
  if (id) {
    const res = await auth.client.from('movie_reviews').delete().eq('id', id).eq('user_id', auth.userId)
    error = res.error
  } else if (slug) {
    // Xoá review gốc theo slug của user hiện tại (ví dụ khi xoá note trong RatingDialog)
    const res = await auth.client
      .from('movie_reviews')
      .delete()
      .eq('slug', slug)
      .eq('user_id', auth.userId)
      .is('parent_id', null)
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const my_reviews = searchParams.get('my_reviews')
  const userIdParam = searchParams.get('user_id')

  const auth = await getUserSupabase(req)

  // 1. Lấy review của một user cụ thể (khi xem profile người khác)
  if (userIdParam) {
    const isSelf = Boolean(auth?.userId && auth.userId === userIdParam)

    let query = (isSelf && auth ? auth.client : supabase)
      .from('movie_reviews')
      .select('*')
      .eq('user_id', userIdParam)
      .is('parent_id', null)
      .gt('score', 0)

    // Nếu không phải owner -> chỉ xem review công khai
    if (!isSelf) {
      query = query.eq('is_private', false)
    }

    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 2. Logic lấy review của cá nhân (khi xem profile của chính mình)
  if (my_reviews === '1') {
    if (!auth) return NextResponse.json({ error: 'Không xác thực được' }, { status: 401 })

    const { data, error } = await auth.client
      .from('movie_reviews')
      .select('*')
      .eq('user_id', auth.userId)
      .is('parent_id', null)
      .gt('score', 0)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 3. Logic lấy toàn bộ comment của một phim và cấu trúc lại
  if (slug) {
    const queryDb = auth ? auth.client : supabase
    const [{ data: flatData, error }, { data: watchedData }] = await Promise.all([
      queryDb.from('movie_reviews').select('*').eq('slug', slug).order('updated_at', { ascending: true }),
      supabase.from('watched_movies').select('user_id, score').eq('slug', slug).not('score', 'is', null)
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Tự động làm giàu (Enrich) các review cũ bị lưu email là 'Người dùng ẩn danh'
    const reviewsList = (flatData || []) as ReviewRecord[]
    const missingEmailUserIds = Array.from(
      new Set(
        reviewsList
          .filter(r => !r.user_email || r.user_email === 'Người dùng ẩn danh' || !r.user_email.includes('@'))
          .map(r => r.user_id)
          .filter(Boolean)
      )
    )

    if (missingEmailUserIds.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from('community_users')
          .select('id, email, display_name, handle')
          .in('id', missingEmailUserIds)

        if (usersData && usersData.length > 0) {
          const userMap = new Map(usersData.map(u => [u.id, u]))
          for (const comment of reviewsList) {
            if (!comment.user_email || comment.user_email === 'Người dùng ẩn danh' || !comment.user_email.includes('@')) {
              const u = userMap.get(comment.user_id)
              if (u?.email) {
                comment.user_email = u.email
              } else if (u?.handle || u?.display_name) {
                comment.user_email = `${u.handle || u.display_name}@user`
              }
            }
          }
        }
      } catch (enrichErr) {
        console.warn('[api/review] Enrich user_email warning:', enrichErr)
      }
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
    const structuredData = buildCommentTree(reviewsList, watchedScoreMap)

    return NextResponse.json({
      data: structuredData,
      count: reviewsList.length
    })
  }

  return NextResponse.json({ error: 'Bắt buộc phải có slug hoặc my_reviews=1' }, { status: 400 })
}

/**
 * Hàm hỗ trợ chuyển đổi mảng phẳng thành cấu trúc cây 1 tầng (tránh Infinite Nesting)
 */
function buildCommentTree(flatComments: ReviewRecord[], watchedScoreMap: Record<string, number> = {}): ReviewNode[] {
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
      const parentEmail = parent.user_email || ''
      map[comment.id].reply_to_username = parentEmail.includes('@')
        ? parentEmail.split('@')[0]
        : parentEmail || 'Thành viên'

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
