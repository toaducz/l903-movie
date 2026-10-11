import { queryOptions, QueryFunctionContext } from '@tanstack/react-query'
import { DEFAULT_MOVIE_SOURCE } from '@/utils/env'
import type {
  MovieSource,
  MovieItem,
  MovieDetail,
  MovieListResult,
  CategoryItem,
  CountryItem,
  Pagination,
  ListMovieParams,
  ListMovieByCategoryParams,
  ListMovieByCountryParams,
  ListMovieByYearParams,
  SearchMovieParams,
  CombinedSearchResult
} from '@/types/movie'

import { getLatestUpdateMovieList as kkGetLatest } from '@/api/kkphim/get-update-movie'
import { getListMovie as kkGetList } from '@/api/kkphim/get-list-movie'
import { getListMovieByCategory as kkGetByCategory } from '@/api/kkphim/list-movie/get-list-movie-by-category'
import { getListMovieByCountry as kkGetByCountry } from '@/api/kkphim/list-movie/get-list-movie-by-country'
import { getListMovieByYear as kkGetByYear } from '@/api/kkphim/list-movie/get-list-movie-by-year'
import { getDetailMovie as kkGetDetail } from '@/api/kkphim/get-detail-movie'
import { getCategorySlug as kkGetCategories } from '@/api/kkphim/filter/get-category-slug'
import { getCountrySlug as kkGetCountries } from '@/api/kkphim/filter/get-country-slug'
import { getSearchByName as kkSearch } from '@/api/kkphim/search/get-search'

import { getUpdateMovieOptions as ophimGetLatest } from '@/api/ophim/get-update-movie'
import { getListMovie as ophimGetList } from '@/api/ophim/list-movie/get-list-movie'
import { getListMovieByCategory as ophimGetByCategory } from '@/api/ophim/list-movie/get-list-movie-by-category'
import { getListMovieByCountry as ophimGetByCountry } from '@/api/ophim/list-movie/get-list-movie-by-country'
import { getListMovieByYear as ophimGetByYear } from '@/api/ophim/list-movie/get-list-movie-by-year'
import { getDetailMovieOptions as ophimGetDetail } from '@/api/ophim/get-detail-movie'
import { getCategorySlug as ophimGetCategories } from '@/api/ophim/filter/get-category-slug'
import { getCountrySlug as ophimGetCountries } from '@/api/ophim/filter/get-country-slug'
import { getSearchMovieListOphim as ophimSearch } from '@/api/ophim/search/get-search'

import type { Movie as KKMovie } from '@/api/kkphim/get-update-movie'
import type { DetailMovie as KKDetailMovie } from '@/api/kkphim/get-detail-movie'

async function callQueryFn<T>(fn: unknown, context?: QueryFunctionContext): Promise<T> {
  if (typeof fn !== 'function') throw new Error('No queryFn provided')
  return (fn as (ctx?: unknown) => Promise<T>)(context)
}

function normalizeKKImageUrl(url: string | null | undefined, cdnDomain: string = 'https://phimimg.com'): string {
  if (!url || typeof url === 'object') return ''
  const trimmed = String(url).trim()
  if (trimmed === '' || trimmed === '{}') return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const cleanCdn = (cdnDomain || 'https://phimimg.com').replace(/\/+$/, '')
  const cleanPath = trimmed.replace(/^\/+/, '')
  return `${cleanCdn}/${cleanPath}`
}

function mapKKMovieToItem(m: KKMovie, cdnDomain?: string, source: MovieSource = 'kkphim'): MovieItem {
  const cdn = cdnDomain || 'https://phimimg.com'
  return {
    _id: m._id,
    name: m.name,
    slug: m.slug,
    origin_name: m.origin_name,
    type: m.type,
    // KKPhim: m.poster_url là ảnh dọc (portrait 2:3), m.thumb_url là ảnh ngang (landscape 16:9)
    poster_url: normalizeKKImageUrl(m.poster_url, cdn),
    thumb_url: normalizeKKImageUrl(m.thumb_url, cdn),
    sub_docquyen: m.sub_docquyen,
    time: m.time,
    episode_current: m.episode_current,
    quality: m.quality,
    lang: m.lang,
    year: m.year,
    modified: m.modified,
    category: m.category,
    country: m.country,
    source,
    cdnImageDomain: cdn,
    tmdb: m.tmdb ? { vote_average: m.tmdb.vote_average, vote_count: m.tmdb.vote_count } : undefined
  }
}

function mapKKDetailToShared(d: KKDetailMovie, source: MovieSource = 'kkphim'): MovieDetail {
  return {
    ...d,
    movie: {
      ...d.movie,
      // KKPhim: d.movie.poster_url là ảnh dọc (portrait 2:3), d.movie.thumb_url là ảnh ngang (landscape 16:9)
      poster_url: normalizeKKImageUrl(d.movie.poster_url),
      thumb_url: normalizeKKImageUrl(d.movie.thumb_url),
      category: (d.movie.category ?? []).map(c => ({ id: c.id, name: c.name, slug: c.slug })),
      country: (d.movie.country ?? []).map(c => ({ id: c.id, name: c.name, slug: c.slug }))
    },
    episodes: (d.episodes ?? []).map(ep => ({
      server_name: ep.server_name,
      server_data: ep.server_data.map(s => ({
        name: s.name,
        slug: s.slug,
        filename: s.filename,
        link_embed: s.link_embed,
        link_m3u8: s.link_m3u8
      }))
    })),
    ...(source && {})
  }
}

function mapKKPagination(p: {
  currentPage: number
  totalPages: number
  totalItems: number
  totalItemsPerPage: number
}): Pagination {
  return {
    currentPage: p.currentPage,
    totalPages: p.totalPages,
    totalItems: p.totalItems,
    totalItemsPerPage: p.totalItemsPerPage
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getLatestMovies
// ─────────────────────────────────────────────────────────────────────────────

export const getLatestMovies = ({
  page = 1,
  limit = 12,
  source
}: {
  page?: number
  limit?: number
  source?: MovieSource
} = {}) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieListResult>({
      queryKey: ['movie-service-v3', 'latest', page, resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
        const opts = ophimGetLatest({ page })
        const res = await callQueryFn<{
          movies?: MovieItem[]
          pagination: Pagination
          APP_DOMAIN_CDN_IMAGE: string
        }>(opts.queryFn, context)
        return {
          items: (res.movies ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' })),
          pagination: mapKKPagination(res.pagination),
          APP_DOMAIN_CDN_IMAGE: res.APP_DOMAIN_CDN_IMAGE,
          source: 'ophim'
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieListResult>({
    queryKey: ['movie-service-v3', 'latest', page, limit, resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
      const opts = kkGetLatest({ page })
      const res = await callQueryFn<{
        items?: KKMovie[]
        pagination: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
        APP_DOMAIN_CDN_IMAGE: string
      }>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch latest movies')
      return {
        items: (res.items ?? []).map(m => mapKKMovieToItem(m, res.APP_DOMAIN_CDN_IMAGE, 'kkphim')),
        pagination: mapKKPagination(res.pagination),
        APP_DOMAIN_CDN_IMAGE: res.APP_DOMAIN_CDN_IMAGE,
        source: 'kkphim'
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getListMovies (danh sách theo typelist: phim-bo, phim-le, hoat-hinh, ...)
// ─────────────────────────────────────────────────────────────────────────────

export const getListMovies = ({
  typelist,
  page = 1,
  limit = 12,
  country,
  sort_field,
  sort_type,
  sort_lang,
  source
}: ListMovieParams) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieListResult>({
      queryKey: ['movie-service-v3', 'list', typelist, page, limit, country, sort_field, sort_type, resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
        const opts = ophimGetList({ typelist, page, limit, country, sort_field, sort_type, sort_lang })
        const res = await callQueryFn<{
          items?: MovieItem[]
          pagination: Pagination
          cdnImageDomain?: string
          titlePage?: string
          seoOnPage?: { descriptionHead?: string }
        }>(opts.queryFn, context)
        return {
          items: (res.items ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' })),
          pagination: mapKKPagination(res.pagination),
          cdnImageDomain: res.cdnImageDomain,
          titlePage: res.titlePage,
          seoOnPage: res.seoOnPage,
          source: 'ophim'
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieListResult>({
    queryKey: ['movie-service-v3', 'list', typelist, page, limit, country, sort_field, sort_type, resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
      const opts = kkGetList({ typelist, page, limit, country, sort_field, sort_type, sort_lang })
      const res = await callQueryFn<{
        data?: {
          items?: KKMovie[]
          params?: {
            pagination?: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
          }
          APP_DOMAIN_CDN_IMAGE?: string
          titlePage?: string
        }
      }>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch movie list')
      return {
        items: (res.data?.items ?? []).map(m => mapKKMovieToItem(m, res.data?.APP_DOMAIN_CDN_IMAGE, 'kkphim')),
        pagination: mapKKPagination(
          res.data?.params?.pagination ?? { currentPage: page, totalPages: 1, totalItems: 0, totalItemsPerPage: limit }
        ),
        cdnImageDomain: res.data?.APP_DOMAIN_CDN_IMAGE,
        titlePage: res.data?.titlePage,
        APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE,
        source: 'kkphim'
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getMoviesByCategory
// ─────────────────────────────────────────────────────────────────────────────

export const getMoviesByCategory = ({
  category,
  page = 1,
  limit = 12,
  country,
  year,
  sort_field,
  sort_type,
  sort_lang,
  source
}: ListMovieByCategoryParams) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieListResult>({
      queryKey: [
        'movie-service-v3',
        'by-category',
        category,
        page,
        limit,
        country,
        year,
        sort_field,
        sort_type,
        resolvedSource
      ],
      queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
        const opts = ophimGetByCategory({ category, page, limit, country, year, sort_field, sort_type, sort_lang })
        const res = await callQueryFn<{
          items?: MovieItem[]
          pagination: Pagination
          cdnImageDomain?: string
          titlePage?: string
          seoOnPage?: { descriptionHead?: string }
        }>(opts.queryFn, context)
        return {
          items: (res.items ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' })),
          pagination: mapKKPagination(res.pagination),
          cdnImageDomain: res.cdnImageDomain,
          titlePage: res.titlePage,
          seoOnPage: res.seoOnPage,
          source: 'ophim'
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieListResult>({
    queryKey: [
      'movie-service-v3',
      'by-category',
      category,
      page,
      limit,
      country,
      year,
      sort_field,
      sort_type,
      resolvedSource
    ],
    queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
      const opts = kkGetByCategory({ category, page, limit, country, year, sort_field, sort_type, sort_lang })
      const res = await callQueryFn<{
        data?: {
          items?: KKMovie[]
          params?: {
            pagination?: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
          }
          APP_DOMAIN_CDN_IMAGE?: string
          titlePage?: string
          seoOnPage?: { descriptionHead?: string }
        }
      }>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch movies by category')
      return {
        items: (res.data?.items ?? []).map(m => mapKKMovieToItem(m, res.data?.APP_DOMAIN_CDN_IMAGE, 'kkphim')),
        pagination: mapKKPagination(
          res.data?.params?.pagination ?? { currentPage: page, totalPages: 1, totalItems: 0, totalItemsPerPage: limit }
        ),
        cdnImageDomain: res.data?.APP_DOMAIN_CDN_IMAGE,
        titlePage: res.data?.titlePage,
        seoOnPage: { descriptionHead: res.data?.seoOnPage?.descriptionHead },
        APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE,
        source: 'kkphim'
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getMoviesByCountry
// ─────────────────────────────────────────────────────────────────────────────

export const getMoviesByCountry = ({
  country,
  page = 1,
  limit = 12,
  category,
  year,
  sort_field,
  sort_type,
  sort_lang,
  source
}: ListMovieByCountryParams) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieListResult>({
      queryKey: [
        'movie-service-v3',
        'by-country',
        country,
        page,
        limit,
        category,
        year,
        sort_field,
        sort_type,
        resolvedSource
      ],
      queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
        const opts = ophimGetByCountry({ country, page, limit, category, year, sort_field, sort_type, sort_lang })
        const res = await callQueryFn<{
          items?: MovieItem[]
          pagination: Pagination
          cdnImageDomain?: string
          titlePage?: string
          seoOnPage?: { descriptionHead?: string }
        }>(opts.queryFn, context)
        return {
          items: (res.items ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' })),
          pagination: mapKKPagination(res.pagination),
          cdnImageDomain: res.cdnImageDomain,
          titlePage: res.titlePage,
          seoOnPage: res.seoOnPage,
          source: 'ophim'
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieListResult>({
    queryKey: [
      'movie-service-v3',
      'by-country',
      country,
      page,
      limit,
      category,
      year,
      sort_field,
      sort_type,
      resolvedSource
    ],
    queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
      const opts = kkGetByCountry({ country, page, limit, category, year, sort_field, sort_type, sort_lang })
      const res = await callQueryFn<{
        data?: {
          items?: KKMovie[]
          params?: {
            pagination?: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
          }
          APP_DOMAIN_CDN_IMAGE?: string
          titlePage?: string
        }
      }>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch movies by country')
      return {
        items: (res.data?.items ?? []).map(m => mapKKMovieToItem(m, res.data?.APP_DOMAIN_CDN_IMAGE, 'kkphim')),
        pagination: mapKKPagination(
          res.data?.params?.pagination ?? { currentPage: page, totalPages: 1, totalItems: 0, totalItemsPerPage: limit }
        ),
        cdnImageDomain: res.data?.APP_DOMAIN_CDN_IMAGE,
        titlePage: res.data?.titlePage,
        APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE,
        source: 'kkphim'
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getMoviesByYear
// ─────────────────────────────────────────────────────────────────────────────

export const getMoviesByYear = ({
  year,
  page = 1,
  limit = 12,
  category,
  country,
  sort_field,
  sort_type,
  sort_lang,
  source
}: ListMovieByYearParams) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieListResult>({
      queryKey: [
        'movie-service-v3',
        'by-year',
        year,
        page,
        limit,
        category,
        country,
        sort_field,
        sort_type,
        resolvedSource
      ],
      queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
        const opts = ophimGetByYear({ year, page, limit, category, country, sort_field, sort_type, sort_lang })
        const res = await callQueryFn<{
          items?: MovieItem[]
          pagination: Pagination
          cdnImageDomain?: string
          titlePage?: string
          seoOnPage?: { descriptionHead?: string }
        }>(opts.queryFn, context)
        return {
          items: (res.items ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' })),
          pagination: mapKKPagination(res.pagination),
          cdnImageDomain: res.cdnImageDomain,
          titlePage: res.titlePage,
          seoOnPage: res.seoOnPage,
          source: 'ophim'
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieListResult>({
    queryKey: ['movie-service-v3', 'by-year', year, page, limit, category, country, sort_field, sort_type, resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<MovieListResult> => {
      const opts = kkGetByYear({ year, page, limit, category, country, sort_field, sort_type, sort_lang })
      const res = await callQueryFn<{
        data?: {
          items?: KKMovie[]
          params?: {
            pagination?: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
          }
          APP_DOMAIN_CDN_IMAGE?: string
          titlePage?: string
        }
      }>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch movies by year')
      return {
        items: (res.data?.items ?? []).map(m => mapKKMovieToItem(m, res.data?.APP_DOMAIN_CDN_IMAGE, 'kkphim')),
        pagination: mapKKPagination(
          res.data?.params?.pagination ?? { currentPage: page, totalPages: 1, totalItems: 0, totalItemsPerPage: limit }
        ),
        cdnImageDomain: res.data?.APP_DOMAIN_CDN_IMAGE,
        titlePage: res.data?.titlePage,
        APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE,
        source: 'kkphim'
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. getMovieDetail
// ─────────────────────────────────────────────────────────────────────────────

export const getMovieDetail = ({ slug, source }: { slug: string; source?: MovieSource }) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieDetail>({
      queryKey: ['movie-service-v3', 'detail', slug, resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<MovieDetail> => {
        const opts = ophimGetDetail({ slug })
        return callQueryFn<MovieDetail>(opts.queryFn, context)
      }
    })
  }

  // Default: kkphim
  return queryOptions<MovieDetail>({
    queryKey: ['movie-service-v3', 'detail', slug, resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<MovieDetail> => {
      const opts = kkGetDetail({ slug })
      const res = await callQueryFn<KKDetailMovie>(opts.queryFn, context)
      if (!res) throw new Error('Failed to fetch movie detail')
      return mapKKDetailToShared(res, 'kkphim')
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. getCategories
// ─────────────────────────────────────────────────────────────────────────────

export const getCategories = (source?: MovieSource) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<CategoryItem[]>({
      queryKey: ['movie-service-v3', 'categories', resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<CategoryItem[]> => {
        const opts = ophimGetCategories()
        const res = await callQueryFn<Array<{ _id: string; name: string; slug: string }>>(opts.queryFn, context)
        return (res ?? []).map((c): CategoryItem => ({ id: c._id, name: c.name, slug: c.slug }))
      }
    })
  }

  // Default: kkphim
  return queryOptions<CategoryItem[]>({
    queryKey: ['movie-service-v3', 'categories', resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<CategoryItem[]> => {
      const opts = kkGetCategories()
      const res = await callQueryFn<Array<{ _id: string; name: string; slug: string }>>(opts.queryFn, context)
      return (res ?? []).map((c): CategoryItem => ({ id: c._id, name: c.name, slug: c.slug }))
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. getCountries
// ─────────────────────────────────────────────────────────────────────────────

export const getCountries = (source?: MovieSource) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<CountryItem[]>({
      queryKey: ['movie-service-v3', 'countries', resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<CountryItem[]> => {
        const opts = ophimGetCountries()
        const res = await callQueryFn<Array<{ _id: string; name: string; slug: string }>>(opts.queryFn, context)
        return (res ?? []).map((c): CountryItem => ({ id: c._id, name: c.name, slug: c.slug }))
      }
    })
  }

  // Default: kkphim
  return queryOptions<CountryItem[]>({
    queryKey: ['movie-service-v3', 'countries', resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<CountryItem[]> => {
      const opts = kkGetCountries()
      const res = await callQueryFn<Array<{ _id: string; name: string; slug: string }>>(opts.queryFn, context)
      return (res ?? []).map((c): CountryItem => ({ id: c._id, name: c.name, slug: c.slug }))
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. searchMovies (full search, used in search result page)
// ─────────────────────────────────────────────────────────────────────────────

export const searchMovies = ({
  keyword,
  page = 1,
  limit = 24,
  category,
  country,
  year,
  sort_field,
  sort_type,
  source
}: SearchMovieParams) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<CombinedSearchResult>({
      queryKey: [
        'movie-service-v3',
        'search',
        keyword,
        page,
        limit,
        category,
        country,
        year,
        sort_field,
        sort_type,
        resolvedSource
      ],
      queryFn: async (context: QueryFunctionContext): Promise<CombinedSearchResult> => {
        const opts = ophimSearch({ keyword, page, limit, category, country, sort_field, sort_type })
        const res = await callQueryFn<{
          movies?: MovieItem[]
          pagination?: Pagination
        }>(opts.queryFn, context)
        const movies: MovieItem[] = (res?.movies ?? []).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' }))
        const paginationData = res?.pagination ?? {
          currentPage: page,
          totalPages: 1,
          totalItems: movies.length,
          totalItemsPerPage: limit
        }
        return {
          items: movies,
          allItems: movies,
          hasDuplicates: false,
          titlePage: `Kết quả tìm kiếm cho: ${keyword}`,
          pagination: mapKKPagination(paginationData),
          APP_DOMAIN_CDN_IMAGE: undefined
        }
      }
    })
  }

  // Default: kkphim
  return queryOptions<CombinedSearchResult>({
    queryKey: [
      'movie-service-v3',
      'search',
      keyword,
      page,
      limit,
      category,
      country,
      year,
      sort_field,
      sort_type,
      resolvedSource
    ],
    queryFn: async (context: QueryFunctionContext): Promise<CombinedSearchResult> => {
      const opts = kkSearch({ keyword, page, limit, category, country, year, sort_field, sort_type })
      const res = await callQueryFn<{
        data?: {
          items?: KKMovie[]
          params?: {
            pagination?: { currentPage: number; totalPages: number; totalItems: number; totalItemsPerPage: number }
          }
          APP_DOMAIN_CDN_IMAGE?: string
        }
      }>(opts.queryFn, context)
      const cdnDomain = res?.data?.APP_DOMAIN_CDN_IMAGE
      const items: MovieItem[] = (res?.data?.items ?? []).map(m =>
        mapKKMovieToItem(m, cdnDomain, 'kkphim')
      )
      const kkPag = res?.data?.params?.pagination
      return {
        items,
        allItems: items,
        hasDuplicates: false,
        titlePage: `Kết quả tìm kiếm cho: ${keyword}`,
        pagination: {
          currentPage: kkPag?.currentPage ?? page,
          totalPages: kkPag?.totalPages ?? (items.length > 0 ? 1 : 0),
          totalItems: kkPag?.totalItems ?? items.length,
          totalItemsPerPage: kkPag?.totalItemsPerPage ?? limit
        },
        APP_DOMAIN_CDN_IMAGE: cdnDomain
      }
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. getSearchSuggestions (autocomplete in Navbar — lightweight, 6 results)
// ─────────────────────────────────────────────────────────────────────────────

export const getSearchSuggestions = ({
  keyword,
  limit = 6,
  source
}: {
  keyword: string
  limit?: number
  source?: MovieSource
}) => {
  const resolvedSource = source ?? DEFAULT_MOVIE_SOURCE

  if (resolvedSource === 'ophim') {
    return queryOptions<MovieItem[]>({
      queryKey: ['movie-service-v3', 'suggestions', keyword, limit, resolvedSource],
      queryFn: async (context: QueryFunctionContext): Promise<MovieItem[]> => {
        const opts = ophimSearch({ keyword, page: 1, limit })
        const res = await callQueryFn<{ movies?: MovieItem[] }>(opts.queryFn, context)
        return (res?.movies ?? []).slice(0, limit).map((m: MovieItem): MovieItem => ({ ...m, source: 'ophim' }))
      },
      staleTime: 1000 * 60 * 2
    })
  }

  // Default: kkphim
  return queryOptions<MovieItem[]>({
    queryKey: ['movie-service-v3', 'suggestions', keyword, limit, resolvedSource],
    queryFn: async (context: QueryFunctionContext): Promise<MovieItem[]> => {
      const opts = kkSearch({ keyword, page: 1, limit })
      const res = await callQueryFn<{ data?: { items?: KKMovie[]; APP_DOMAIN_CDN_IMAGE?: string } }>(
        opts.queryFn,
        context
      )
      const cdnDomain = res?.data?.APP_DOMAIN_CDN_IMAGE
      return (res?.data?.items ?? []).slice(0, limit).map(m => mapKKMovieToItem(m, cdnDomain, 'kkphim'))
    },
    staleTime: 1000 * 60 * 2
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. getCombinedSearch (gộp KKPhim + OPhim, dùng cho search result page)
//     KKPhim ưu tiên, OPhim bổ sung các phim không trùng slug
// ─────────────────────────────────────────────────────────────────────────────

export const getCombinedSearch = ({
  keyword,
  page = 1,
  limit = 24,
  category,
  country,
  year,
  sort_field,
  sort_type
}: Omit<SearchMovieParams, 'source'>) => {
  return queryOptions<CombinedSearchResult>({
    queryKey: [
      'movie-service-v3',
      'combined-search',
      keyword,
      page,
      limit,
      category,
      country,
      year,
      sort_field,
      sort_type
    ],
    queryFn: async (context: QueryFunctionContext): Promise<CombinedSearchResult> => {
      const kkOpts = kkSearch({ keyword, page, limit, category, country, year, sort_field, sort_type })
      const ophimOpts = ophimSearch({ keyword, page, limit, category, country, sort_field, sort_type })

      const [kkRes, ophimRes] = await Promise.allSettled([
        callQueryFn<{
          data?: {
            items?: KKMovie[]
            APP_DOMAIN_CDN_IMAGE?: string
            params?: {
              pagination?: { currentPage?: number; totalPages?: number; totalItems?: number; totalItemsPerPage?: number }
            }
          }
        }>(kkOpts.queryFn, context),
        callQueryFn<{ movies?: MovieItem[]; pagination?: Pagination }>(ophimOpts.queryFn, context)
      ])

      const kkData = kkRes.status === 'fulfilled' ? kkRes.value?.data : null
      const ophimData = ophimRes.status === 'fulfilled' ? ophimRes.value : null

      const cdnDomain = kkData?.APP_DOMAIN_CDN_IMAGE
      const kkMovies: MovieItem[] = (kkData?.items ?? []).map(m => mapKKMovieToItem(m, cdnDomain, 'kkphim'))
      const ophimMovies: MovieItem[] = (ophimData?.movies ?? []).map((m: MovieItem) => ({
        ...m,
        source: 'ophim' as MovieSource
      }))

      // KKPhim ưu tiên — OPhim bổ sung phim không trùng slug
      const kkSlugs = new Set(kkMovies.map(m => m.slug))
      const mergedMovies = [...kkMovies, ...ophimMovies.filter(m => !kkSlugs.has(m.slug))]
      const allMovies = [...kkMovies, ...ophimMovies]
      const hasDuplicates = allMovies.length > mergedMovies.length

      const kkPag = kkData?.params?.pagination
      const ophimPag = ophimData?.pagination as Pagination | undefined

      const kkTotalItems = kkPag?.totalItems ?? kkMovies.length
      const ophimTotalItems = ophimPag?.totalItems ?? ophimMovies.length
      const calculatedTotal = (kkTotalItems > 0 || ophimTotalItems > 0) ? (kkTotalItems + ophimTotalItems) : mergedMovies.length
      const totalItems = Math.max(calculatedTotal, mergedMovies.length)

      const kkTotalPages = kkPag?.totalPages ?? (kkTotalItems > 0 ? Math.ceil(kkTotalItems / limit) : 1)
      const ophimTotalPages = ophimPag?.totalPages ?? (ophimTotalItems > 0 ? Math.ceil(ophimTotalItems / limit) : 1)
      const totalPages = Math.max(kkTotalPages, ophimTotalPages, mergedMovies.length > 0 ? 1 : 0)

      return {
        items: mergedMovies,
        allItems: allMovies,
        hasDuplicates,
        titlePage: `Kết quả tìm kiếm cho: ${keyword}`,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          totalItemsPerPage: limit
        },
        APP_DOMAIN_CDN_IMAGE: cdnDomain
      }
    },
    staleTime: 1000 * 30
  })
}
