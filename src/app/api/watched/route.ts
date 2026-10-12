// api/watched/route.ts — danh sách "Đã xem" (riêng tư theo tài khoản)
import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'
import { isValidSlug, parseWatchedListQuery, parseWatchedUpsert } from '@/lib/watched-validation'
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
 * GET /api/watched?page&limit&sort&min_score&category&country → WatchedListResponse
 */
export async function GET(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()
  const { client, userId } = auth
  const { searchParams } = new URL(req.url)

  const slug = searchParams.get('slug')
  if (slug !== null) {
    if (!isValidSlug(slug)) return badRequest('slug không hợp lệ')
    const { data, error } = await client
      .from('watched_movies')
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle()
    if (error) return serverError('get one', error)
    return NextResponse.json({ data: (data as WatchedMovie | null) ?? null })
  }

  const q = parseWatchedListQuery(searchParams)
  const from = (q.page - 1) * q.limit

  let query = client.from('watched_movies').select(COLUMNS, { count: 'exact' }).eq('user_id', userId)
  if (q.minScore) query = query.gte('score', q.minScore)
  if (q.category) query = query.contains('categories', [{ slug: q.category }])
  if (q.country) query = query.contains('countries', [{ slug: q.country }])

  query =
    q.sort === 'score'
      ? query.order('score', { ascending: false, nullsFirst: false }).order('watched_at', { ascending: false })
      : q.sort === 'name'
        ? query.order('name', { ascending: true })
        : query.order('watched_at', { ascending: false })

  const [listRes, scoreRes] = await Promise.all([
    query.range(from, from + q.limit - 1),
    client.from('watched_movies').select('score').eq('user_id', userId).not('score', 'is', null)
  ])
  if (listRes.error) return serverError('list', listRes.error)
  if (scoreRes.error) return serverError('average score', scoreRes.error)

  const scores = (scoreRes.data ?? []).map(r => r.score as number)
  const averageScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
  const count = listRes.count ?? 0

  const body: WatchedListResponse = {
    data: (listRes.data ?? []) as WatchedMovie[],
    count,
    page: q.page,
    totalPages: Math.max(1, Math.ceil(count / q.limit)),
    averageScore
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

  return NextResponse.json({ ok: true })
}
