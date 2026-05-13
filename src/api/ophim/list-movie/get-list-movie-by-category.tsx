// import { Movie } from '@/api/kkphim/get-update-movie'
// import { Pagination } from '@/api/pagination'
import { request } from '@/utils/request'
import { queryOptions } from '@tanstack/react-query'
import { ophim } from '@/utils/env'
import { mapOphimUpdateItemToMovie, mapOphimUpdatePagination } from '@/utils/mapping'
import { OphimUpdateItem } from '../get-update-movie'
import { Param } from '../get-update-movie'

type SeoOnPage = {
  og_type: string
  titleHead: string
  descriptionHead: string
  og_image: string[]
  og_url: string
}

type BreadCrumbItem = {
  name: string
  isCurrent: boolean
  position: number
}

export type SearchResult = {
  seoOnPage: SeoOnPage
  breadCrumb: BreadCrumbItem[]
  titlePage: string
  items: OphimUpdateItem[]
  params: Param
  type_list: string
  APP_DOMAIN_FRONTEND: string
  APP_DOMAIN_CDN_IMAGE: string
}

type ListMovieByCategoryRequest = {
  category: string
  page: number
  sort_field?: string
  sort_type?: string
  sort_lang?: string
  country?: string
  year?: string
  limit?: number
}

type ListMovieResponse = {
  data: SearchResult
  msg: string
  status: string
}

export const getListMovieByCategory = ({
  category,
  page = 1,
  sort_field,
  sort_type,
  sort_lang,
  country,
  year,
  limit = 12
}: ListMovieByCategoryRequest) => {
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
    queryKey: ['ophim', 'list-movie-by-category', category, page, limit, year, sort_type, country],
    queryFn: async () => {
      const response = await request<ListMovieResponse>(ophim, `the-loai/${category}`, 'GET', params)
      if (!response) throw new Error('Failed to fetch movie list')

      return {
        items: response.data.items.map(item => mapOphimUpdateItemToMovie(item, response.data.APP_DOMAIN_CDN_IMAGE)),
        pagination: mapOphimUpdatePagination(response.data.params.pagination)
      }
    }
  })
}
