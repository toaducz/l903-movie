import { request } from '@/utils/request'
import { vsmov } from '@/utils/env'

// Tài liệu: https://vsmov.com/api-document
// Lưu ý khác biệt so với KKPhim:
// - Response danh sách để `items` + `pagination` ở top-level (không bọc trong `data`)
// - Item danh sách KHÔNG có episode_current / quality / lang / type
// - Tập phim chỉ có `link_embed` (không có `link_m3u8`)
// - Tham số `limit` bị bỏ qua ở các endpoint danh sách (cố định 18–24 phim/trang)

export type VsmovListItem = {
  tmdb?: {
    type: string | null
    id: string | null
    season: number | null
    vote_average: string | number
    vote_count: number
  }
  imdb?: { id: string | null }
  modified?: { time: string }
  _id: number
  name: string
  origin_name: string
  slug: string
  poster_url: string
  thumb_url: string
  year: number
}

export type VsmovPagination = {
  totalItems: number
  totalItemsPerPage: number | string
  currentPage: number
  totalPages: number
}

export type VsmovListResponse = {
  status: boolean
  pathImage?: string
  items: VsmovListItem[]
  pagination: VsmovPagination
}

export type VsmovTaxonomy = { id: number; name: string; slug: string }

export type VsmovDetailResponse = {
  status: boolean
  msg: string
  movie: VsmovListItem & {
    created?: { time: string }
    content: string
    type: string
    status: string
    trailer_url: string | null
    time: string
    episode_current: string
    episode_total: string
    quality: string
    lang: string
    notify: string | null
    showtimes: string | null
    view: number
    chieurap: boolean
    sub_docquyen: boolean
    actor: string[]
    director: string[]
    category: VsmovTaxonomy[]
    country: VsmovTaxonomy[]
  }
  episodes: {
    server_name: string
    server_data: { name: string; slug: string; filename: string; link_embed: string }[]
  }[]
}

type VsmovTaxonomyListResponse = {
  status: string
  data: { items: { _id: number; name: string; slug: string }[] }
}

// Các danh sách VSMOV hỗ trợ (đã kiểm tra thực tế; phim-vietsub, phim-long-tieng, hoat-hinh, tv-shows trả 404)
export const VSMOV_TYPELISTS = new Set(['phim-moi-cap-nhat', 'phim-bo', 'phim-le', 'phim-chieu-rap', 'subteam'])

type ListFilter = { page: number; country?: string; year?: string; category?: string }

const toParams = (filter: ListFilter): Record<string, unknown> => ({
  page: filter.page,
  ...(filter.category && { category: filter.category }),
  ...(filter.country && { country: filter.country }),
  ...(filter.year && { year: filter.year })
})

export const fetchVsmovList = (typelist: string, page: number) =>
  request<VsmovListResponse>(vsmov, `danh-sach/${typelist}`, 'GET', { page })

export const fetchVsmovByCategory = (category: string, filter: ListFilter) =>
  request<VsmovListResponse>(vsmov, `the-loai/${category}`, 'GET', toParams(filter))

export const fetchVsmovByCountry = (country: string, filter: ListFilter) =>
  request<VsmovListResponse>(vsmov, `quoc-gia/${country}`, 'GET', toParams(filter))

export const fetchVsmovByYear = (year: string, filter: ListFilter) =>
  request<VsmovListResponse>(vsmov, `nam/${year}`, 'GET', toParams(filter))

export const fetchVsmovSearch = (keyword: string, page: number, limit: number) =>
  request<VsmovListResponse>(vsmov, 'tim-kiem', 'GET', { keyword, page, limit })

export const fetchVsmovDetail = (slug: string) => request<VsmovDetailResponse>(vsmov, `phim/${slug}`, 'GET')

export const fetchVsmovCategories = () => request<VsmovTaxonomyListResponse>(vsmov, 'the-loai', 'GET')

export const fetchVsmovCountries = () => request<VsmovTaxonomyListResponse>(vsmov, 'quoc-gia', 'GET')

export { getUpdateMovieOptions } from './get-update-movie'
