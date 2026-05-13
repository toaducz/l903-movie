import { queryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { ophim } from '@/utils/env'

type CategorySlug = {
  _id: string
  name: string
  slug: string
}

type CategoryResponse = {
  data: {
    items: CategorySlug[]
  }
  msg: string
  status: string
}

export const getCategorySlug = () => {
  return queryOptions({
    queryKey: ['ophim', 'get-category-slug'],
    queryFn: async () => {
      const res = await request<CategoryResponse>(ophim, `/the-loai`, 'GET')
      return res?.data?.items ?? []
    }
  })
}
