'use client'

import { Suspense, useEffect } from 'react'
import { notFound, useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getListMovie } from '@/api/ophim/list-movie/get-list-movie'
import MovieListPage from '@/page/movie-list-page'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'

export default function MoviePage() {
  return (
    <Suspense>
      <MovieListPageContent />
    </Suspense>
  )
}

function MovieListPageContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('typelist')?.trim()
  const pageParam = Number(searchParams.get('page') ?? '1')
  const country = searchParams.get('country')?.trim()
  const router = useRouter()

  if (!query) {
    notFound()
  }

  // const [pageSearch, setPageSearch] = useState(pageParam)

  const {
    data: listMovie,
    isLoading,
    isError
  } = useQuery(
    getListMovie({
      typelist: query,
      page: pageParam,
      country
    })
  )

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams({
      typelist: query,
      page: String(newPage)
    })
    if (country) params.set('country', country)
    router.push(`/list-movie?${params.toString()}`)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageParam])

  if (isLoading) return <Loading />
  if (isError) return <Error />

  return (
    <MovieListPage
      listMovie={listMovie}
      country={country}
      onPageChange={handlePageChange}
    />
  )
}
