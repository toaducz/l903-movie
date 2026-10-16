import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { supabase } from '@/lib/supabaseClient'
import { isValidSlug, parseWatchedListQuery, parseWatchedUpsert } from '@/lib/watched-validation'
import { summarizeWatched, type WatchedSummaryRow } from '@/lib/watched-summary'
import type { WatchedListResponse, WatchedMovie } from '@/types/watched'

const COLUMNS =
  'id, slug, source, name, origin_name, image, year, categories, countries, score, note, watched_at, updated_at'

const unauthorized = () => NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 })
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })
const serverError = (context: string, error: unknown) => {
  console.error(`[api/watched] ${context}:`, error)
  return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau' }, { status: 500 })
}

/**
 * GET /api/watched?slug=<slug>           → { data: WatchedMovie | null } (trạng thái 1 phim, cho nút "Đã xem")
 * GET /api/watched?summary=1            → WatchedSummary (tổng, chưa chấm, điểm TB, facet thể loại / quốc gia)
 * GET /api/watched?page&limit&sort&min_score|unrated=1&category&country → WatchedListResponse
 */
export async function GET(req: NextRequest) {
  const auth = await getUserSupabase(req)
  const { searchParams } = new URL(req.url)
  const paramUserId = searchParams.get('user_id')

  // Nếu không chỉ định user_id thì bắt buộc phải đăng nhập (để xem của chính mình)
  if (!paramUserId && !auth) return unauthorized()

  const targetUserId = paramUserId || auth?.userId
  if (!targetUserId) return unauthorized()

  const isSelf = Boolean(auth?.userId && targetUserId === auth.userId)

  if (!isSelf) {
    const { data: privacy } = await supabase
      .from('user_privacy_settings')
      .select('is_watched_public')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (!privacy?.is_watched_public) {
      return NextResponse.json(
        { error: 'Danh sách đã xem của người dùng này đang ở chế độ riêng tư', is_private: true },
        { status: 403 }
      )
    }
  }

  // Nếu xem của chính mình dùng authenticated client, xem người khác dùng anon client
  const queryDb = isSelf && auth ? auth.client : supabase

  const slug = searchParams.get('slug')
  if (slug !== null) {
    if (!isValidSlug(slug)) return badRequest('slug không hợp lệ')
    const { data, error } = await queryDb
      .from('watched_movies')
      .select(COLUMNS)
      .eq('user_id', targetUserId)
      .eq('slug', slug)
      .maybeSingle()
    if (error) return serverError('get one', error)
    return NextResponse.json({ data: (data as WatchedMovie | null) ?? null })
  }

  if (searchParams.get('summary') === '1') {
    // Danh sách cá nhân nhỏ → gom ở server thay vì thêm hàm SQL
    const { data, error } = await queryDb
      .from('watched_movies')
      .select('score, categories, countries')
      .eq('user_id', targetUserId)
    if (error) return serverError('summary', error)
    return NextResponse.json(summarizeWatched((data ?? []) as WatchedSummaryRow[]))
  }

  const q = parseWatchedListQuery(searchParams)
  const from = (q.page - 1) * q.limit

  let query = queryDb.from('watched_movies').select(COLUMNS, { count: 'exact' }).eq('user_id', targetUserId)
  if (q.unrated) query = query.is('score', null)
  else if (q.minScore) query = query.gte('score', q.minScore)
  if (q.category) query = query.contains('categories', [{ slug: q.category }])
  if (q.country) query = query.contains('countries', [{ slug: q.country }])

  query =
    q.sort === 'score'
      ? query.order('score', { ascending: false, nullsFirst: false }).order('watched_at', { ascending: false })
      : q.sort === 'name'
        ? query.order('name', { ascending: true })
        : query.order('watched_at', { ascending: false })

  const listRes = await query.range(from, from + q.limit - 1)
  // PGRST103 = trang vượt quá số phim (vd vừa xoá phim cuối của trang cuối) → trả trang rỗng, client tự lùi trang
  const outOfRange = listRes.error?.code === 'PGRST103'
  if (listRes.error && !outOfRange) return serverError('list', listRes.error)
  const count = outOfRange ? from : (listRes.count ?? 0)

  const body: WatchedListResponse = {
    data: outOfRange ? [] : ((listRes.data ?? []) as WatchedMovie[]),
    count,
    page: q.page,
    totalPages: Math.max(1, Math.ceil(count / q.limit))
  }
  return NextResponse.json(body)
}

/** POST /api/watched — đánh dấu đã xem / sửa điểm, ghi chú (upsert theo slug; trường không gửi thì giữ nguyên) */
export async function POST(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const body: unknown = await req.json().catch(() => null)
  const parsed = parseWatchedUpsert(body)
  if (!parsed.ok) return badRequest(parsed.error)

  const { data, error } = await auth.client
    .from('watched_movies')
    .upsert({ ...parsed.value, user_id: auth.userId }, { onConflict: 'user_id,slug' })
    .select(COLUMNS)
    .single()
  if (error) return serverError('upsert', error)

  // Nếu user để danh sách xem phim công khai -> ghi lại vào community_activities
  try {
    const { data: privacy } = await supabase
      .from('user_privacy_settings')
      .select('is_watched_public')
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (privacy?.is_watched_public) {
      const watched = data as WatchedMovie
      await auth.client.from('community_activities').upsert(
        {
          actor_id: auth.userId,
          actor_name: auth.name || 'Thành viên',
          actor_avatar: auth.avatarUrl || null,
          action_type: 'watched',
          slug: watched.slug,
          movie_name: watched.name,
          score: watched.score ?? null,
          content: watched.note ?? null,
          created_at: new Date().toISOString()
        },
        { onConflict: 'actor_id,slug,action_type' }
      )
    }
  } catch (activityErr) {
    console.error('[api/watched] Ghi community activity thất bại:', activityErr)
  }

  return NextResponse.json({ data: data as WatchedMovie })
}

/** DELETE /api/watched  body: { slug } — xoá khỏi "Đã xem" */
export async function DELETE(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null
  if (!isValidSlug(body?.slug)) return badRequest('slug không hợp lệ')

  const { error } = await auth.client.from('watched_movies').delete().eq('user_id', auth.userId).eq('slug', body.slug)
  if (error) return serverError('delete', error)

  // Xóa luôn hoạt động tương ứng nếu có
  try {
    await auth.client
      .from('community_activities')
      .delete()
      .eq('actor_id', auth.userId)
      .eq('slug', body.slug)
      .eq('action_type', 'watched')
  } catch (deleteActivityErr) {
    console.error('[api/watched] Xóa community activity thất bại:', deleteActivityErr)
  }

  return NextResponse.json({ ok: true })
}
