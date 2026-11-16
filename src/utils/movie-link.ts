import type { MovieSource } from '@/types/movie'
import { resolveMovieSource } from '@/utils/env'

// Link tới trang chi tiết phim, luôn kèm nguồn: thiếu `source` thì trang chi tiết dùng nguồn mặc định
// → phim lấy từ nguồn khác (VD: Anime lấy từ KKPhim khi nguồn chính là VSMOV) sẽ "không tìm thấy phim".
// Mọi nguồn (kể cả NguonC) dùng chung một trang chi tiết để đổi nguồn qua lại được.
export function getMovieDetailHref(
  slug: string,
  source?: MovieSource | string | null,
  query?: Record<string, string | number | undefined | null>
): string {
  const params = new URLSearchParams()
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val))
      }
    }
  }
  const resolvedSource = resolveMovieSource(source)
  params.set('source', resolvedSource)
  const qs = params.toString()
  return `/detail-movie/${slug}${qs ? `?${qs}` : ''}`
}
