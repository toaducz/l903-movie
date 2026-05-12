import { request } from '@/utils/request'
import { queryOptions } from '@tanstack/react-query'
import { ophim } from '@/utils/env'
import { mapOphimUpdateItemToMovie, mapOphimUpdatePagination } from '@/utils/mapping'
import { OphimUpdateItem } from '../get-update-movie'

type Param = {
  keyword: string
  page: number
  limit: number
  sort_field?: string
  sort_type?: string
  type?: string
  status?: string
  year?: number
  category?: string
  country?: string
  pagination: {
    totalItems: number
    totalItemsPerPage: number
    currentPage: number
    totalPages: number
  }
}

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

type SearchRequest = {
  keyword: string
  page: number
  limit?: number
  sort_field?: string
  sort_type?: string
  type?: string
  status?: string
  year?: number
  category?: string
  country?: string
}

type SearchResponse = {
  data: SearchResult
  msg: string
  status: string
}

export const getSearchMovieListOphim = ({
  keyword,
  page = 1,
  limit = 24,
  sort_field,
  sort_type,
  type,
  status,
  year,
  category,
  country
}: SearchRequest) => {
  const params: Record<string, unknown> = {
    keyword,
    page,
    limit,
    ...(sort_field && { sort_field }),
    ...(sort_type && { sort_type }),
    ...(type && { type }),
    ...(status && { status }),
    ...(year !== undefined && { year }),
    ...(category && { category }),
    ...(country && { country })
  }

  return queryOptions({
    queryKey: ['ophim', 'search', keyword, page, limit, sort_field, sort_type, type, status, year, category, country],
    queryFn: async () => {
      const response = await request<SearchResponse>(ophim, `tim-kiem`, 'GET', params)
      if (!response) throw new Error('Failed to fetch search results')

      return {
        ...response.data,
        movies: response.data.items.map(item => mapOphimUpdateItemToMovie(item, response.data.APP_DOMAIN_CDN_IMAGE)),
        pagination: mapOphimUpdatePagination(response.data.params.pagination)
      }
    }
  })
}
