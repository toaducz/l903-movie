import type { MovieSource } from '@/types/movie'

// Link tới trang chi tiết phim, luôn kèm nguồn: thiếu `source` thì trang chi tiết dùng nguồn mặc định
// → phim lấy từ nguồn khác (VD: Anime lấy từ KKPhim khi nguồn chính là VSMOV) sẽ "không tìm thấy phim".
export function getMovieDetailHref(
  slug: string,
  source?: MovieSource | string,
  query: Record<string, string> = {}
): string {
  if (source === 'nguonc') return `/nguonc/detail-movie/${slug}`

  const params = new URLSearchParams(query)
  if (source) params.set('source', source)
  const qs = params.toString()
  return `/detail-movie/${slug}${qs ? `?${qs}` : ''}`
}
