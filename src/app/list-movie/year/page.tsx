'use client'

import { Suspense, useState, useEffect } from 'react'
import { notFound, useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getListMovieByYear } from '@/api/ophim/list-movie/get-list-movie-by-year'
import MovieListPage from '@/page/movie-list-page'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import MovieFilter from '@/component/filter/movie-filter'

export default function MovieByYearPage() {
  return (
    <Suspense>
      <MovieListPageContent />
    </Suspense>
  )
}

function MovieListPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pageParam = Number(searchParams.get('page') ?? '1')
  const yearParam = searchParams?.get('year')?.trim()
  if (!yearParam) notFound()
  const [filterDraft, setFilterDraft] = useState({
    country: searchParams.get('country') ?? '',
    category: searchParams.get('category') ?? '',
    sortField: searchParams.get('sort_field') ?? '',
    sortType: searchParams.get('sort_type') ?? ''
  })

  const [filter, setFilter] = useState(filterDraft)

  const {
    data: listMovie,
    isLoading,
    isError
  } = useQuery(
    getListMovieByYear({
      year: yearParam!,
      page: pageParam,
      country: filter.country || undefined,
      category: filter.category || undefined,
      sort_field: filter.sortField || undefined,
      sort_type: filter.sortType || undefined
    })
  )

  const buildQuery = (page: number, f: typeof filter) => {
    const params = new URLSearchParams({
      year: yearParam!,
      page: String(page)
    })
    if (f.country) params.set('country', f.country)
    if (f.category) params.set('category', f.category)
    if (f.sortField) params.set('sort_field', f.sortField)
    if (f.sortType) params.set('sort_type', f.sortType)
    return params.toString()
  }

  const handlePageChange = (newPage: number) => {
    router.push(`/list-movie/year?${buildQuery(newPage, filter)}`)
  }

  const handleFilterSubmit = () => {
    setFilter(filterDraft) // sync filter thật
    router.push(`/list-movie/year?${buildQuery(1, filterDraft)}`)
  }

  const handleFilterReset = () => {
    const resetFilter = {
      country: '',
      category: '',
      sortField: '',
      sortType: ''
    }
    setFilterDraft(resetFilter)
    setFilter(resetFilter)
    router.push(`/list-movie/year?${buildQuery(1, resetFilter)}`)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageParam])

  if (isLoading) return <Loading />
  if (isError) return <Error />

  return (
    <div className='space-y-4 bg-black'>
      <MovieFilter
        type='year'
        country={filterDraft.country}
        year={yearParam!}
        category={filterDraft.category}
        sortField={filterDraft.sortField}
        sortType={filterDraft.sortType}
        onChange={draft => setFilterDraft(draft)}
        onSubmit={handleFilterSubmit}
        onReset={handleFilterReset}
      />
      <MovieListPage
      listMovie={listMovie}
      onPageChange={handlePageChange} headTitle={true} />
    </div>
  )
}
