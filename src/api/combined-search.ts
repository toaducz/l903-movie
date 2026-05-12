import { queryOptions, QueryFunctionContext } from '@tanstack/react-query'
import { getSearchByName } from './kkphim/search/get-search'
import { getSearchMovieListOphim } from './ophim/search/get-search'
import { Movie } from './kkphim/get-update-movie'

export interface CombinedMovie extends Movie {
  source: string
}

export interface CombinedSearchResult {
  items: CombinedMovie[]
  allItems: CombinedMovie[]
  hasDuplicates: boolean
  titlePage: string
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
  }
  APP_DOMAIN_CDN_IMAGE?: string
}

export const getSearchCombined = ({
  keyword,
  page = 1,
  limit = 24,
  ...filters
}: {
  keyword: string
  page?: number
  limit?: number
  [key: string]: string | number | string[] | boolean | undefined
}) => {
  return queryOptions<CombinedSearchResult>({
    queryKey: ['combined-search', keyword, page, limit, filters],
    queryFn: async (context: QueryFunctionContext): Promise<CombinedSearchResult> => {
      const kkOptions = getSearchByName({ keyword, page, ...filters })
      const ophimOptions = getSearchMovieListOphim({ keyword, page, limit, ...filters })

      // Fetch both sources in parallel
      const [kkphimRes, ophimRes] = await Promise.allSettled([
        kkOptions.queryFn
          ? kkOptions.queryFn({
              queryKey: kkOptions.queryKey,
              meta: undefined,
              signal: context.signal
            } as QueryFunctionContext<typeof kkOptions.queryKey>)
          : Promise.resolve(null),
        ophimOptions.queryFn
          ? ophimOptions.queryFn({
              queryKey: ophimOptions.queryKey,
              meta: undefined,
              signal: context.signal
            } as QueryFunctionContext<typeof ophimOptions.queryKey>)
          : Promise.resolve(null)
      ])

      const kkphimData = kkphimRes.status === 'fulfilled' ? kkphimRes.value?.data : null
      const ophimData = ophimRes.status === 'fulfilled' ? ophimRes.value : null

      const ophimMovies: CombinedMovie[] = (ophimData?.movies || []).map((m: Movie) => ({
        ...m,
        source: 'ophim'
      }))
      const kkphimMovies: CombinedMovie[] = (kkphimData?.items || []).map((m: Movie) => ({
        ...m,
        source: 'kkphim'
      }))

      const ophimSlugs = new Set(ophimMovies.map(m => m.slug))

      // Merge: Prioritize Ophim (as requested)
      const mergedMovies = [...ophimMovies, ...kkphimMovies.filter(m => !ophimSlugs.has(m.slug))]

      const allMovies = [...ophimMovies, ...kkphimMovies]
      const hasDuplicates = allMovies.length > mergedMovies.length

      return {
        items: mergedMovies,
        allItems: allMovies,
        hasDuplicates,
        titlePage: `Kết quả tìm kiếm cho: ${keyword}`,
        pagination: {
          currentPage: page,
          totalPages: Math.max(ophimData?.pagination?.totalPages || 0, kkphimData?.params?.pagination?.totalPages || 0),
          totalItems: (ophimData?.pagination?.totalItems || 0) + (kkphimData?.params?.pagination?.totalItems || 0)
        },
        APP_DOMAIN_CDN_IMAGE: kkphimData?.APP_DOMAIN_CDN_IMAGE
      }
    },
    staleTime: 1000 * 60 * 5
  })
}
