// import { Pagination } from './pagination'
import { queryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { kkphim } from '@/utils/env'

export type DetailMovie = {
  movie: {
    tmdb: {
      type: string
      id: string
      season: number
      vote_average: number
      vote_count: number
    }
    imdb: {
      id: string | null
    }
    created: {
      time: string
    }
    modified: {
      time: string
    }
    _id: string
    name: string
    slug: string
    origin_name: string
    content: string
    type: string
    status: 'ongoing' | 'completed' | string
    poster_url: string
    thumb_url: string
    is_copyright: boolean
    sub_docquyen: boolean
    chieurap: boolean
    trailer_url: string
    time: string
    episode_current: string
    episode_total: string
    quality: string
    lang: string
    notify: string
    showtimes: string
    year: number
    view: number
    actor: string[]
    director: string[]
    category: {
      id: string
      name: string
      slug: string
    }[]
    country: {
      id: string
      name: string
      slug: string
    }[]
  }
  episodes: {
    server_name: string
    server_data: {
      name: string
      slug: string
      filename: string
      link_embed: string
      link_m3u8: string
    }[]
  }[]
  status: boolean
  msg: string
}

type DetailMovieSlug = {
  slug: string
}

export type Episode = {
  server_name: string
  server_data: {
    name: string
    slug: string
    filename: string
    link_embed: string
    link_m3u8: string
  }[]
}

export const getDetailMovie = ({ slug }: DetailMovieSlug) => {
  return queryOptions({
    queryKey: ['get-detail-movie', slug],
    queryFn: () => request<DetailMovie>(kkphim, `phim/${slug}`, 'GET')
  })
}
