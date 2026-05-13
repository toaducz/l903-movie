import { queryOptions } from '@tanstack/react-query'
import { request } from '@/utils/request'
import { ophim } from '@/utils/env'

type CountrySlug = {
  _id: string
  name: string
  slug: string
}

type CountryResponse = {
  data: {
    items: CountrySlug[]
  }
  msg: string
  status: string
}

export const getCountrySlug = () => {
  return queryOptions({
    queryKey: ['ophim', 'get-country-slug'],
    queryFn: async () => {
      const res = await request<CountryResponse>(ophim, `/quoc-gia`, 'GET')
      return res?.data?.items ?? []
    }
  })
}
