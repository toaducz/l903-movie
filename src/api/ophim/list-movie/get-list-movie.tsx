import { request } from '@/utils/request'
import { queryOptions } from '@tanstack/react-query'
import { ophim } from '@/utils/env'
import { mapOphimUpdateItemToMovie, mapOphimUpdatePagination } from '@/utils/mapping'
import { SearchResult } from './get-list-movie-by-category'

type ListMovieRequest = {
  typelist: string
  page: number
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  category?: string
  country?: string
  year?: string
  limit?: number
}

type ListMovieResponse = {
  data: SearchResult
  msg: string
  status: string
}

export const getListMovie = ({
  typelist,
  page = 1,
  sort_field,
  sort_type,
  sort_lang,
  category,
  country,
  year,
  limit = 12
}: ListMovieRequest) => {
  const params: Record<string, unknown> = {
    page,
    ...(sort_field && { sort_field }),
    ...(sort_type && { sort_type }),
    ...(sort_lang && { sort_lang }),
    ...(category && { category }),
    ...(country && { country }),
    ...(year && { year }),
    ...(limit !== undefined && { limit })
  }

  return queryOptions({
    queryKey: ['ophim', 'list-movie', typelist, page, limit, year, sort_type, category, country],
    queryFn: async () => {
      const response = await request<ListMovieResponse>(ophim, `danh-sach/${typelist}`, 'GET', params)
      if (!response) throw new Error('Failed to fetch movie list')

      return {
        items: response.data.items.map(item => mapOphimUpdateItemToMovie(item, response.data.APP_DOMAIN_CDN_IMAGE)),
        pagination: mapOphimUpdatePagination(response.data.params.pagination),
        cdnImageDomain: response.data.APP_DOMAIN_CDN_IMAGE,
        titlePage: response.data.titlePage,
        seoOnPage: response.data.seoOnPage
      }
    }
  })
}
