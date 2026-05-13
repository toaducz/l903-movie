import { request } from '@/utils/request'
import { queryOptions } from '@tanstack/react-query'
import { ophim } from '@/utils/env'
import { mapOphimUpdateItemToMovie, mapOphimUpdatePagination } from '@/utils/mapping'
import { SearchResult } from './get-list-movie-by-category'

type ListMovieByCountryRequest = {
  country: string
  page: number
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  category?: string
  year?: string
  limit?: number
}

type ListMovieResponse = {
  data: SearchResult
  msg: string
  status: string
}

export const getListMovieByCountry = ({
  country,
  page = 1,
  sort_field,
  sort_type,
  sort_lang,
  category,
  year,
  limit = 12
}: ListMovieByCountryRequest) => {
  const params: Record<string, unknown> = {
    page,
    ...(sort_field && { sort_field }),
    ...(sort_type && { sort_type }),
    ...(sort_lang && { sort_lang }),
    ...(category && { category }),
    ...(year && { year }),
    ...(limit !== undefined && { limit })
  }

  return queryOptions({
    queryKey: ['ophim', 'list-movie-by-country', country, page, limit, year, sort_type, category],
    queryFn: async () => {
      const response = await request<ListMovieResponse>(ophim, `quoc-gia/${country}`, 'GET', params)
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
