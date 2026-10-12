import type { MovieSource } from '@/types/movie'

export const kkphim = 'https://phimapi.com/'
export const nguonc = 'https://phim.nguonc.com/'
export const vsmov = 'https://vsmov.com/api/'
export const ophim = 'https://ophim1.com/v1/api/'
export const ophimV1 = 'https://ophim17.cc/v1/api/'
export const proxyApiUrl = 'https://l903-movie-proxy.toanduz.workers.dev'

export const DEFAULT_MOVIE_SOURCE: MovieSource = (process.env.NEXT_PUBLIC_DEFAULT_SOURCE as MovieSource) || 'vsmov'
