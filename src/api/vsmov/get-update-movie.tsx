import { queryOptions } from '@tanstack/react-query'
import { fetchVsmovList, type VsmovListResponse } from './vsmov-api'
import { mapVsmovItem, mapVsmovPagination } from '@/services/vsmov-service'
import type { MovieItem, Pagination } from '@/types/movie'

export interface VsmovUpdateResponse extends VsmovListResponse {
  movies: MovieItem[]
  pagination: Pagination
}

export const getUpdateMovieOptions = ({ page = 1 }: { page?: number } = {}) =>
  queryOptions({
    queryKey: ['vsmov', 'update', page],
    queryFn: async (): Promise<VsmovUpdateResponse> => {
      const response = await fetchVsmovList('phim-moi-cap-nhat', page)
      if (!response || !response.status) {
        throw new Error('Failed to fetch update movie list from VSMOV')
      }
      const movies = (response.items ?? []).map(mapVsmovItem)
      const pagination = mapVsmovPagination(response.pagination, page, movies.length)
      return {
        ...response,
        movies,
        pagination
      }
    }
  })
