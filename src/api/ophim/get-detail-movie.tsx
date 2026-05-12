// import { DetailMovie } from '@/api/kkphim/get-detail-movie'
// import { QueryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { ophim } from '@/utils/env'
import { mapOphimToDetailMovie } from '@/utils/mapping'

export interface OphimMovie {
  _id: string
  name: string
  slug: string
  origin_name: string
  content: string
  type: 'series' | 'single' | 'hoathinh' | 'tvshows'
  status: 'ongoing' | 'completed' | 'trailer' | 'success' | 'fail'
  thumb_url: string
  poster_url: string
  trailer_url: string
  time: string
  episode_current: string
  episode_total: string
  quality: string
  lang: string
  year: number
  view: number
  actor: string[]
  director: string[]
  category: Array<{ id: string; name: string; slug: string }>
  country: Array<{ id: string; name: string; slug: string }>
  episodes: OphimEpisodeServer[]
}

export interface OphimEpisodeItem {
  name: string
  slug: string
  filename: string
  link_embed: string
  link_m3u8: string
}

export interface OphimEpisodeServer {
  server_name: string
  server_data: OphimEpisodeItem[]
}

type Data = {
  APP_DOMAIN_CDN_IMAGE: string
  item: OphimMovie
}

export interface OphimDetailResponse {
  status: string
  message: string
  data: Data
}

export const getDetailMovieOptions = ({ slug }: { slug: string }) => ({
  queryKey: ['ophim', 'detail', slug],
  queryFn: () =>
    request<OphimDetailResponse>(ophim, `phim/${slug}`, 'GET').then(response => {
      if (!response) throw new Error('Failed to fetch movie detail')
      return mapOphimToDetailMovie(response.data.item, response.data.item.episodes, response.data.APP_DOMAIN_CDN_IMAGE)
    })
})
