import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import type { PublicUserProfile } from '@/types/profile'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/user/[id]/public-profile - Lấy thông tin công khai của người dùng (chạy song song tối ưu tốc độ) */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
  }

  // Chạy đồng thời 3 truy vấn để tránh waterfall 4.5s
  const [privacyRes, userRes, reviewRes] = await Promise.allSettled([
    supabase
      .from('user_privacy_settings')
      .select('is_history_public, is_watched_public, created_at')
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('community_users')
      .select('display_name, handle, avatar_url, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('movie_reviews')
      .select('user_email, updated_at')
      .eq('user_id', id)
      .limit(1)
      .maybeSingle()
  ])

  const privacyData = privacyRes.status === 'fulfilled' ? privacyRes.value.data : null
  const userData = userRes.status === 'fulfilled' ? userRes.value.data : null
  const reviewData = reviewRes.status === 'fulfilled' ? reviewRes.value.data : null

  let displayName: string | null = userData?.display_name || null
  let handle: string | null = userData?.handle || null
  const avatarUrl: string | null = userData?.avatar_url || null

  const joinedYear = userData?.created_at
    ? new Date(userData.created_at).getFullYear()
    : privacyData?.created_at
      ? new Date(privacyData.created_at).getFullYear()
      : reviewData?.updated_at
        ? new Date(reviewData.updated_at).getFullYear()
        : null

  // Fallback từ email trong movie_reviews nếu community_users chưa có thông tin
  if ((!displayName || !handle) && reviewData?.user_email) {
    const emailHandle = reviewData.user_email.split('@')[0]
    displayName = displayName || emailHandle || 'Thành viên L903'
    handle = handle || emailHandle || 'user'
  }

  const name = displayName || 'Thành viên L903'
  const finalHandle = handle || 'member'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const profile: PublicUserProfile = {
    id,
    name,
    handle: finalHandle,
    initial,
    joinedYear,
    avatarUrl,
    privacy: {
      is_history_public: Boolean(privacyData?.is_history_public),
      is_watched_public: Boolean(privacyData?.is_watched_public)
    }
  }

  return NextResponse.json(
    { data: profile },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    }
  )
}
