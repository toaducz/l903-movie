import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import type { PublicUserProfile } from '@/types/profile'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/user/[id]/public-profile - Lấy thông tin công khai của người dùng */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
  }

  // 1. Thử lấy quyền riêng tư từ bảng user_privacy_settings
  const { data: privacyData } = await supabase
    .from('user_privacy_settings')
    .select('is_history_public, is_watched_public, created_at')
    .eq('user_id', id)
    .maybeSingle()

  let displayName: string | null = null
  let handle: string | null = null
  let joinedYear = privacyData?.created_at ? new Date(privacyData.created_at).getFullYear() : null
  let avatarUrl: string | null = null

  // 2. Thử lấy thông tin từ View community_users (trỏ vào auth.users)
  try {
    const { data: userData } = await supabase
      .from('community_users')
      .select('display_name, handle, avatar_url, created_at')
      .eq('id', id)
      .maybeSingle()

    if (userData) {
      displayName = userData.display_name || null
      handle = userData.handle || null
      avatarUrl = userData.avatar_url || null
      if (userData.created_at) {
        joinedYear = new Date(userData.created_at).getFullYear()
      }
    }
  } catch (err) {
    console.warn('[public-profile] community_users query error:', err)
  }

  // 3. Nếu chưa có tên/handle, fallback tìm từ các review gần nhất của user đó
  if (!displayName || !handle) {
    const { data: reviewData } = await supabase
      .from('movie_reviews')
      .select('user_email, updated_at')
      .eq('user_id', id)
      .limit(1)
      .maybeSingle()

    if (reviewData?.user_email) {
      const emailHandle = reviewData.user_email.split('@')[0]
      displayName = displayName || emailHandle || 'Thành viên L903'
      handle = handle || emailHandle || 'user'
      joinedYear = joinedYear || new Date(reviewData.updated_at).getFullYear()
    }
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

  return NextResponse.json({ data: profile })
}
