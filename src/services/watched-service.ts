import { queryOptions } from '@tanstack/react-query'
import { resolveMovieSource } from '@/utils/env'
import type { MovieDetail, MovieSource } from '@/types/movie'
import type {
  WatchedListQuery,
  WatchedListResponse,
  WatchedMovie,
  WatchedSource,
  WatchedSummary,
  WatchedUpsertInput
} from '@/types/watched'

// Client cho danh sách "Đã xem" (gọi /api/watched). Giao diện gắn vào qua useQuery / useMutation.

export const WATCHED_QUERY_KEY = 'watched'

async function callWatchedApi<T>(init: RequestInit & { query?: string } = {}): Promise<T> {
  const { query, ...rest } = init
  const res = await fetch(`/api/watched${query ? `?${query}` : ''}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...rest.headers }
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? 'Không kết nối được máy chủ')
  return json as T
}

/** Câu báo lỗi cho toast: lỗi mạng → "mạng chập chờn"; còn lại dùng thông báo từ API (vd "Bạn cần đăng nhập") */
export function watchedErrorMessage(err: unknown): string {
  if (err instanceof TypeError) return 'Mạng đang chập chờn, thử lại sau nhé.'
  if (err instanceof Error && err.message) return err.message
  return 'Có lỗi xảy ra, thử lại sau nhé.'
}

/** Trạng thái "Đã xem" của 1 phim (null = chưa xem) — cho nút ở trang chi tiết */
export const getWatchedStatus = (slug: string, enabled = true) =>
  queryOptions<WatchedMovie | null>({
    queryKey: [WATCHED_QUERY_KEY, 'status', slug],
    queryFn: async () =>
      (await callWatchedApi<{ data: WatchedMovie | null }>({ query: new URLSearchParams({ slug }).toString() })).data,
    enabled
  })

/** Danh sách "Đã xem" có lọc / sắp xếp / phân trang — cho trang Hồ sơ */
export const getWatchedList = (params: Partial<WatchedListQuery> = {}) =>
  queryOptions<WatchedListResponse>({
    queryKey: [WATCHED_QUERY_KEY, 'list', params],
    queryFn: () => {
      const query = new URLSearchParams({
        ...(params.page && { page: String(params.page) }),
        ...(params.limit && { limit: String(params.limit) }),
        ...(params.sort && { sort: params.sort }),
        ...(params.unrated ? { unrated: '1' } : params.minScore && { min_score: String(params.minScore) }),
        ...(params.category && { category: params.category }),
        ...(params.country && { country: params.country })
      })
      return callWatchedApi<WatchedListResponse>({ query: query.toString() })
    }
  })

/** Số liệu toàn danh sách: tổng (badge tab), chưa chấm, điểm TB, thể loại / quốc gia để lọc */
export const getWatchedSummary = (enabled = true) =>
  queryOptions<WatchedSummary>({
    queryKey: [WATCHED_QUERY_KEY, 'summary'],
    queryFn: () => callWatchedApi<WatchedSummary>({ query: 'summary=1' }),
    enabled
  })

/** Đánh dấu đã xem hoặc sửa điểm / ghi chú (trường không truyền thì giữ nguyên) */
export const saveWatched = async (input: WatchedUpsertInput): Promise<WatchedMovie> =>
  (await callWatchedApi<{ data: WatchedMovie }>({ method: 'POST', body: JSON.stringify(input) })).data

/** Xoá khỏi "Đã xem" (dùng cho nút xoá và "Hoàn tác") */
export const removeWatched = async (slug: string): Promise<void> => {
  await callWatchedApi<{ ok: true }>({ method: 'DELETE', body: JSON.stringify({ slug }) })
}

/** Dựng input từ dữ liệu trang chi tiết phim (đủ thể loại / quốc gia để lọc sau này) */
export function toWatchedInput(
  detail: MovieDetail,
  source: MovieSource | string,
  extra: Pick<WatchedUpsertInput, 'score' | 'note'> = {}
): WatchedUpsertInput {
  const { movie } = detail
  return {
    slug: movie.slug,
    source: resolveMovieSource(source) as WatchedSource,
    name: movie.name,
    origin_name: movie.origin_name || null,
    image: movie.poster_url || movie.thumb_url || null,
    year: movie.year || null,
    categories: (movie.category ?? []).map(c => ({ slug: c.slug, name: c.name })),
    countries: (movie.country ?? []).map(c => ({ slug: c.slug, name: c.name })),
    ...extra
  }
}

/** Dựng input tối thiểu từ mục "Đang xem dở" (chưa có thể loại / quốc gia) */
export function toWatchedInputFromHistory(item: {
  slug: string
  name: string
  image?: string
  source?: string
}): WatchedUpsertInput {
  return {
    slug: item.slug,
    source: resolveMovieSource(item.source) as WatchedSource,
    name: item.name,
    image: item.image || null
  }
}
