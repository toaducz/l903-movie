import type { MovieSource } from '@/types/movie'

export const kkphim = 'https://phimapi.com/'
export const nguonc = 'https://phim.nguonc.com/'
export const vsmov = 'https://vsmov.com/api/'
export const ophim = 'https://ophim1.com/v1/api/'
export const ophimV1 = 'https://ophim17.cc/v1/api/'
export const proxyApiUrl = 'https://l903-movie-proxy.toanduz.workers.dev'

const DEFAULT_SOURCE_RAW = process.env.NEXT_PUBLIC_DEFAULT_SOURCE || 'vsmov'

// OPhim đã ngừng hoạt động và chuyển sang VSMOV (cùng kho phim, cùng slug) → 'ophim' được coi là 'vsmov'.
// Giữ alias để link / lịch sử xem / yêu thích cũ đã lưu source=ophim vẫn mở được.
export function resolveMovieSource(source?: string | null): MovieSource {
  const value = (source || DEFAULT_SOURCE_RAW) as MovieSource
  return value === 'ophim' ? 'vsmov' : value
}

export const DEFAULT_MOVIE_SOURCE: MovieSource = resolveMovieSource(DEFAULT_SOURCE_RAW)
