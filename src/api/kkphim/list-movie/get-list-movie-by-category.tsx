import { Movie } from '../get-update-movie'
import { request } from '@/utils/request'
import { queryOptions } from '@tanstack/react-query'
import { Pagination } from '@/api/pagination'
import { kkphim } from '@/utils/env'

type Param = {
  type_slug: string
  keyword: string
  filterCategory: string[]
  filterCountry: string[]
  filterYear: string[]
  filterType: string[]
  sortField: string
  sortType: string
  pagination: Pagination
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
  items: Movie[]
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
  cdnImageDomain?: string
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
    queryKey: ['get-list-movie-by-category', category, page, limit, year, sort_type, country],
    queryFn: async (): Promise<ListMovieResponse> => {
      const res = await request<ListMovieResponse>(kkphim, `v1/api/the-loai/${category}`, 'GET', params)
      return {
        ...res,
        cdnImageDomain: res?.data?.APP_DOMAIN_CDN_IMAGE
      } as ListMovieResponse
    }
  })
}
