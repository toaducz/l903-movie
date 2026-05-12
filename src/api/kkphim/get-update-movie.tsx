import { Pagination } from '../pagination'
import { queryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { kkphim } from '@/utils/env'

export type Movie = {
  tmdb?: {
    type: string | null
    id: number | null
    season: number | null
    vote_average: number
    vote_count: number
  }
  imdb?: {
    id: string | null
  }
  modified?: {
    time: string // format: "YYYY-MM-DD HH:mm:ss"
  }
  _id?: string
  name: string
  slug: string
  origin_name: string
  type: string
  poster_url: string
  thumb_url: string
  sub_docquyen: boolean
  time: string
  episode_current: string
  quality: string
  lang: string
  year: number
  category?: {
    id: string
    name: string
    slug: string
  }[]
  country?: {
    id: string
    name: string
    slug: string
  }[]
}

type LatestUpdateMovieList = {
  status: string
  APP_DOMAIN_CDN_IMAGE: string
  items: Movie[]
  pagination: Pagination
}

type LatestUpdateMovieListRequest = {
  page: number
}

export const getLatestUpdateMovieList = ({ page }: LatestUpdateMovieListRequest) => {
  return queryOptions({
    queryKey: ['get-lasted-update-movie-list', page],
    queryFn: () =>
      request<LatestUpdateMovieList>(kkphim, `danh-sach/phim-moi-cap-nhat-v3`, 'GET', {
        page: page,
        limit: 12
      })
  })
}
