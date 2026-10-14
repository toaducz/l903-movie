import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import type { CommunityUser } from '@/types/profile'

/** GET /api/users?q=&page=1&limit=12 - Danh bạ toàn bộ thành viên hệ thống (auth.users) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase() || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12', 10)))
  const from = (page - 1) * limit
  const to = from + limit - 1

  // 1. Cố gắng lấy từ View community_users (trỏ thẳng vào auth.users)
  try {
    let query = supabase
      .from('community_users')
      .select('id, email, display_name, handle, avatar_url, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (q) {
      query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%,handle.ilike.%${q}%`)
    }

    const { data: dbUsers, count, error } = await query.range(from, to)

    if (!error && dbUsers) {
      // Đếm số lượng đánh giá cho các user trong trang này
      const userIds = dbUsers.map(u => u.id).filter(Boolean)
      const reviewCountMap = new Map<string, number>()

      if (userIds.length > 0) {
        const { data: watchedRatings } = await supabase
          .from('watched_movies')
          .select('user_id')
          .in('user_id', userIds)
          .not('score', 'is', null)

        for (const w of watchedRatings ?? []) {
          if (w.user_id) {
            reviewCountMap.set(w.user_id, (reviewCountMap.get(w.user_id) || 0) + 1)
          }
        }
      }

      const communityUsers: CommunityUser[] = dbUsers.map(u => {
        const emailHandle = u.email ? u.email.split('@')[0] : 'member'
        const name = u.display_name || emailHandle || 'Thành viên'
        const handle = u.handle || emailHandle || 'user'
        const initial = name.trim().charAt(0).toUpperCase() || '?'
        const reviewCount = reviewCountMap.get(u.id) || 0
        const joinedYear = u.created_at ? new Date(u.created_at).getFullYear() : null

        return {
          id: u.id,
          name,
          handle,
          initial,
          reviewCount,
          joinedYear,
          avatarUrl: u.avatar_url || null
        }
      })

      const total = count ?? communityUsers.length
      return NextResponse.json({
        data: communityUsers,
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 1
      })
    }
  } catch (err) {
    console.warn('[api/users] community_users view query error, falling back:', err)
  }

  // 2. Dự phòng (Fallback): Gom TẤT CẢ các user_id xuất hiện trong toàn bộ các bảng của hệ thống
  const usersMap = new Map<string, CommunityUser>()

  // A. Bảng movie_reviews (người dùng tham gia thảo luận)
  const { data: reviews } = await supabase
    .from('movie_reviews')
    .select('user_id, user_email, updated_at')
    .order('updated_at', { ascending: false })

  for (const r of reviews ?? []) {
    if (!r.user_id) continue
    const email = r.user_email || ''
    const handle = email.split('@')[0] || 'member'
    const name = handle
    const existing = usersMap.get(r.user_id)
    if (!existing) {
      usersMap.set(r.user_id, {
        id: r.user_id,
        name,
        handle,
        initial: name.trim().charAt(0).toUpperCase() || '?',
        reviewCount: 0,
        joinedYear: r.updated_at ? new Date(r.updated_at).getFullYear() : null
      })
    }
  }

  // B. Bảng user_privacy_settings
  const { data: privacyUsers } = await supabase
    .from('user_privacy_settings')
    .select('user_id, created_at')

  for (const p of privacyUsers ?? []) {
    if (!p.user_id || usersMap.has(p.user_id)) continue
    usersMap.set(p.user_id, {
      id: p.user_id,
      name: 'Thành viên L903',
      handle: p.user_id.slice(0, 8),
      initial: 'T',
      reviewCount: 0,
      joinedYear: p.created_at ? new Date(p.created_at).getFullYear() : null
    })
  }

  // C. Bảng movie_favorites
  const { data: favUsers } = await supabase
    .from('movie_favorites')
    .select('user_id, created_at')
    .limit(100)

  for (const f of favUsers ?? []) {
    if (!f.user_id || usersMap.has(f.user_id)) continue
    usersMap.set(f.user_id, {
      id: f.user_id,
      name: 'Thành viên L903',
      handle: f.user_id.slice(0, 8),
      initial: 'T',
      reviewCount: 0,
      joinedYear: f.created_at ? new Date(f.created_at).getFullYear() : null
    })
  }

  // D. Bảng watched_movies (tính số lượng phim đã chấm điểm)
  const { data: watchedUsers } = await supabase
    .from('watched_movies')
    .select('user_id, watched_at, score')
    .limit(200)

  for (const w of watchedUsers ?? []) {
    if (!w.user_id) continue
    const existing = usersMap.get(w.user_id)
    if (existing) {
      if (w.score !== null) existing.reviewCount += 1
    } else {
      usersMap.set(w.user_id, {
        id: w.user_id,
        name: 'Thành viên L903',
        handle: w.user_id.slice(0, 8),
        initial: 'T',
        reviewCount: w.score !== null ? 1 : 0,
        joinedYear: w.watched_at ? new Date(w.watched_at).getFullYear() : null
      })
    }
  }

  let allUsers = Array.from(usersMap.values())
  if (q) {
    allUsers = allUsers.filter(
      u => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)
    )
  }

  const total = allUsers.length
  const paginatedUsers = allUsers.slice(from, to + 1)

  return NextResponse.json({
    data: paginatedUsers,
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 1
  })
}
