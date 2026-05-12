// import { Pagination } from '@/api/pagination'
// import { Movie } from '@/api/kkphim/get-update-movie'
// import { QueryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { ophim } from '@/utils/env'
import { mapOphimUpdateItemToMovie, mapOphimUpdatePagination } from '@/utils/mapping'

export interface OphimUpdateItem {
  _id: string
  name: string
  slug: string
  origin_name: string
  type: 'series' | 'single' | 'hoathinh' | 'tvshows'
  status: 'ongoing' | 'completed' | 'trailer'
  poster_url: string
  thumb_url: string
  time: string
  episode_current: string
  quality: string
  lang: string
  year: number
  category: Array<{ id: string; name: string; slug: string }>
  country: Array<{ id: string; name: string; slug: string }>
}

export interface OphimUpdateResponse {
  status: 'success'
  data: {
    seoOnPage: { titleHead: string; descriptionHead: string }
    breadCrumb: Array<{ name: string; slug: string }>
    titlePage: string
    items: OphimUpdateItem[]
    params: {
      pagination: {
        totalItems: number
        totalItemsPerPage: number
        currentPage: number
        totalPages: number
      }
    }
    APP_DOMAIN_FRONTEND: string
    APP_DOMAIN_CDN_IMAGE: string
  }
}

export const getUpdateMovieOptions = ({ page = 1 }: { page?: number }) => ({
  queryKey: ['ophim', 'update', page],
  queryFn: () =>
    request<OphimUpdateResponse>(ophim, `home?page=${page}`, 'GET').then(response => {
      if (!response) throw new Error('Failed to fetch update movie list')
      return {
        ...response.data,
        movies: response.data.items.map(item => mapOphimUpdateItemToMovie(item, response.data.APP_DOMAIN_CDN_IMAGE)),
        pagination: mapOphimUpdatePagination(response.data.params.pagination)
      }
    })
})
