import { queryOptions } from '@tanstack/react-query'
import type {
  MovieItem,
  MovieDetail,
  MovieListResult,
  CategoryItem,
  CountryItem,
  Pagination,
  CombinedSearchResult
} from '@/types/movie'
import {
  fetchVsmovList,
  fetchVsmovByCategory,
  fetchVsmovByCountry,
  fetchVsmovByYear,
  fetchVsmovSearch,
  fetchVsmovDetail,
  fetchVsmovCategories,
  fetchVsmovCountries,
  type VsmovListItem,
  type VsmovListResponse,
  type VsmovDetailResponse,
  type VsmovPagination
} from '@/api/vsmov/vsmov-api'

const SOURCE = 'vsmov' as const
const QUERY_KEY = 'movie-service-vsmov'

function mapVsmovItem(m: VsmovListItem): MovieItem {
  return {
    _id: String(m._id),
    name: m.name,
    slug: m.slug,
    origin_name: m.origin_name,
    // VSMOV không trả các trường này ở danh sách — để trống, MovieItem card tự ẩn badge
    type: m.tmdb?.type === 'tv' ? 'series' : m.tmdb?.type === 'movie' ? 'single' : '',
    // VSMOV (kế thừa OPhim) đặt tên ngược KKPhim: poster_url là ảnh ngang, thumb_url là ảnh dọc
    // → hoán đổi để khớp quy ước của app (poster_url = dọc 2:3, thumb_url = ngang 16:9)
    poster_url: m.thumb_url ?? '',
    thumb_url: m.poster_url ?? '',
    sub_docquyen: false,
    time: '',
    episode_current: '',
    quality: '',
    lang: '',
    year: m.year,
    modified: m.modified,
    source: SOURCE,
    tmdb: m.tmdb ? { vote_average: Number(m.tmdb.vote_average) || 0, vote_count: m.tmdb.vote_count } : undefined
  }
}

function mapVsmovPagination(p: VsmovPagination | undefined, page: number, fallbackCount: number): Pagination {
  return {
    currentPage: Number(p?.currentPage) || page,
    totalPages: Number(p?.totalPages) || (fallbackCount > 0 ? 1 : 0),
    totalItems: Number(p?.totalItems) || fallbackCount,
    totalItemsPerPage: Number(p?.totalItemsPerPage) || fallbackCount
  }
}

function toListResult(res: VsmovListResponse | null, page: number, errorMessage: string): MovieListResult {
  if (!res?.status) throw new Error(errorMessage)
  const items = (res.items ?? []).map(mapVsmovItem)
  return {
    items,
    pagination: mapVsmovPagination(res.pagination, page, items.length),
    source: SOURCE
  }
}

function mapVsmovDetail(d: VsmovDetailResponse): MovieDetail {
  const m = d.movie
  return {
    status: d.status,
    msg: d.msg,
    movie: {
      tmdb: {
        type: m.tmdb?.type ?? '',
        id: m.tmdb?.id ?? '',
        season: m.tmdb?.season ?? 0,
        vote_average: Number(m.tmdb?.vote_average) || 0,
        vote_count: m.tmdb?.vote_count ?? 0
      },
      imdb: { id: m.imdb?.id ?? null },
      created: { time: m.created?.time ?? '' },
      modified: { time: m.modified?.time ?? '' },
      _id: String(m._id),
      name: m.name,
      slug: m.slug,
      origin_name: m.origin_name,
      content: m.content ?? '',
      type: m.type,
      status: m.status,
      // Hoán đổi như mapVsmovItem: VSMOV poster_url = ngang, thumb_url = dọc
      poster_url: m.thumb_url ?? '',
      thumb_url: m.poster_url ?? '',
      is_copyright: false,
      sub_docquyen: m.sub_docquyen ?? false,
      chieurap: m.chieurap ?? false,
      trailer_url: m.trailer_url ?? '',
      time: m.time ?? '',
      episode_current: m.episode_current ?? '',
      episode_total: m.episode_total ?? '',
      quality: m.quality ?? '',
      lang: m.lang ?? '',
      notify: m.notify ?? '',
      showtimes: m.showtimes ?? '',
      year: m.year,
      view: m.view ?? 0,
      actor: m.actor ?? [],
      director: m.director ?? [],
      category: (m.category ?? []).map(c => ({ id: String(c.id), name: c.name, slug: c.slug })),
      country: (m.country ?? []).map(c => ({ id: String(c.id), name: c.name, slug: c.slug }))
    },
    episodes: (d.episodes ?? []).map(server => ({
      // server_name của VSMOV chứa xuống dòng + khoảng trắng thừa ("Vietsub\r\n   #1")
      server_name: server.server_name.replace(/\s+/g, ' ').trim(),
      server_data: server.server_data.map(ep => ({
        name: ep.name,
        slug: ep.slug,
        filename: ep.filename,
        link_embed: ep.link_embed,
        // Segment HLS của VSMOV không có CORS header nên player HLS không phát được → chỉ dùng iframe embed
        link_m3u8: ''
      }))
    }))
  }
}

export const vsmovGetList = ({ typelist, page }: { typelist: string; page: number }) =>
  queryOptions<MovieListResult>({
    queryKey: [QUERY_KEY, 'list', typelist, page],
    queryFn: async () => toListResult(await fetchVsmovList(typelist, page), page, 'Failed to fetch movie list')
  })

type TaxonomyFilter = { page: number; category?: string; country?: string; year?: string }

export const vsmovGetByCategory = ({ category, ...filter }: TaxonomyFilter & { category: string }) =>
  queryOptions<MovieListResult>({
    queryKey: [QUERY_KEY, 'by-category', category, filter],
    queryFn: async () =>
      toListResult(await fetchVsmovByCategory(category, filter), filter.page, 'Failed to fetch movies by category')
  })

export const vsmovGetByCountry = ({ country, ...filter }: TaxonomyFilter & { country: string }) =>
  queryOptions<MovieListResult>({
    queryKey: [QUERY_KEY, 'by-country', country, filter],
    queryFn: async () =>
      toListResult(await fetchVsmovByCountry(country, filter), filter.page, 'Failed to fetch movies by country')
  })

export const vsmovGetByYear = ({ year, ...filter }: TaxonomyFilter & { year: string }) =>
  queryOptions<MovieListResult>({
    queryKey: [QUERY_KEY, 'by-year', year, filter],
    queryFn: async () =>
      toListResult(await fetchVsmovByYear(year, filter), filter.page, 'Failed to fetch movies by year')
  })

export const vsmovGetDetail = ({ slug }: { slug: string }) =>
  queryOptions<MovieDetail>({
    queryKey: [QUERY_KEY, 'detail', slug],
    queryFn: async () => {
      const res = await fetchVsmovDetail(slug)
      if (!res?.status || !res.movie) throw new Error('Failed to fetch movie detail')
      return mapVsmovDetail(res)
    }
  })

export const vsmovGetCategories = () =>
  queryOptions<CategoryItem[]>({
    queryKey: [QUERY_KEY, 'categories'],
    queryFn: async () => {
      const res = await fetchVsmovCategories()
      return (res?.data?.items ?? []).map(c => ({ id: String(c._id), name: c.name, slug: c.slug }))
    }
  })

export const vsmovGetCountries = () =>
  queryOptions<CountryItem[]>({
    queryKey: [QUERY_KEY, 'countries'],
    queryFn: async () => {
      const res = await fetchVsmovCountries()
      return (res?.data?.items ?? []).map(c => ({ id: String(c._id), name: c.name, slug: c.slug }))
    }
  })

export const vsmovSearch = ({ keyword, page, limit }: { keyword: string; page: number; limit: number }) =>
  queryOptions<CombinedSearchResult>({
    queryKey: [QUERY_KEY, 'search', keyword, page, limit],
    queryFn: async () => {
      const res = await fetchVsmovSearch(keyword, page, limit)
      const items = (res?.items ?? []).map(mapVsmovItem)
      return {
        items,
        allItems: items,
        hasDuplicates: false,
        titlePage: `Kết quả tìm kiếm cho: ${keyword}`,
        pagination: mapVsmovPagination(res?.pagination, page, items.length)
      }
    }
  })

export const vsmovGetSuggestions = ({ keyword, limit }: { keyword: string; limit: number }) =>
  queryOptions<MovieItem[]>({
    queryKey: [QUERY_KEY, 'suggestions', keyword, limit],
    queryFn: async () => {
      const res = await fetchVsmovSearch(keyword, 1, limit)
      return (res?.items ?? []).slice(0, limit).map(mapVsmovItem)
    },
    staleTime: 1000 * 60 * 2
  })
