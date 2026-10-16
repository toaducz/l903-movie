import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getUserId } from '../../../../lib/auth-helper'
import type { InteractionItem, CommunityActivity, UserNotification } from '@/types/notification'

async function setSession(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value
  const refresh_token = req.cookies.get('sb-refresh-token')?.value
  if (!access_token) return
  await supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' })
}

/** GET /api/notifications/interactions - Lấy danh sách tương tác (reply cá nhân + hoạt động cộng đồng) */
export async function GET(req: NextRequest) {
  await setSession(req)
  const user_id = await getUserId(req)
  if (!user_id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  // 1. Lấy các thông báo reply gửi đích danh cho user
  const { data: repliesData, error: repliesError } = await supabase
    .from('user_notifications')
    .select('id, slug, source, movie_name, episode_name, type, sender_name, content, is_read, created_at')
    .eq('user_id', user_id)
    .eq('type', 'reply')
    .order('created_at', { ascending: false })
    .limit(15)

  if (repliesError) {
    console.error('[api/notifications/interactions] Lỗi lấy replies:', repliesError)
  }

  // 2. Lấy hoạt động cộng đồng gần nhất (review hoặc đã xem)
  const { data: activitiesData, error: activitiesError } = await supabase
    .from('community_activities')
    .select('id, actor_id, actor_name, actor_avatar, action_type, slug, movie_name, score, content, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (activitiesError) {
    console.error('[api/notifications/interactions] Lỗi lấy activities:', activitiesError)
  }

  const personalReplies: InteractionItem[] = ((repliesData ?? []) as UserNotification[]).map(item => ({
    id: item.id,
    type: 'reply',
    isDirectReplyToMe: true,
    actor_name: item.sender_name || 'Thành viên',
    actor_avatar: null,
    movie_name: item.movie_name,
    slug: item.slug,
    score: null,
    content: item.content || null,
    is_read: item.is_read,
    created_at: item.created_at
  }))

  const communityItems: InteractionItem[] = ((activitiesData ?? []) as CommunityActivity[]).map(act => ({
    id: act.id,
    type: act.action_type === 'review' ? 'community_review' : 'community_watched',
    isDirectReplyToMe: false,
    actor_name: act.actor_name,
    actor_avatar: act.actor_avatar,
    movie_name: act.movie_name,
    slug: act.slug,
    score: act.score,
    content: act.content,
    is_read: true, // Hoạt động cộng đồng không bắt buộc unread badge trừ khi có reply trực tiếp
    created_at: act.created_at
  }))

  // Gộp và sắp xếp theo thời gian mới nhất
  const interactions = [...personalReplies, ...communityItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25)

  return NextResponse.json({ data: interactions })
}
