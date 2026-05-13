'use client'

import { Suspense, useState, useEffect } from 'react'
import { notFound, useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getListMovieByCategory } from '@/api/ophim/list-movie/get-list-movie-by-category'
import MovieListPage from '@/page/movie-list-page'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import MovieFilter from '@/component/filter/movie-filter'


interface FilterState {
  year: string
  country: string
  category: string
  sortField: string
  sortType: string
}

export default function MovieByCategoryPage() {
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
  const category = searchParams.get('category') ?? ''
  const [filterDraft, setFilterDraft] = useState<FilterState>({
    year: searchParams.get('year') ?? '',
    country: searchParams.get('country') ?? '',
    category: searchParams.get('category') ?? '',
    sortField: searchParams.get('sort_field') ?? '',
    sortType: searchParams.get('sort_type') ?? ''
  })

  const [filter, setFilter] = useState(filterDraft)

  if (!filter.category) {
    notFound()
  }

  const {
    data: listMovie,
    isLoading,
    isError
  } = useQuery(
    getListMovieByCategory({
      category: category,
      page: pageParam,
      country: filter.country || undefined,
      year: filter.year || undefined,
      sort_field: filter.sortField || undefined,
      sort_type: filter.sortType || undefined
    })
  )

  const handlePageChange = (newPage: number) => {
    pushFilterParams(newPage, filter)
  }

  const handleFilter = () => {
    setFilter(filterDraft) // chỉ khi bấm nút thì sync filterDraft -> filter
    pushFilterParams(1, filterDraft)
  }

  const handleReset = () => {
    const resetFilter = {
      year: '',
      country: '',
      category: filter.category,
      sortField: '',
      sortType: ''
    }
    setFilterDraft(resetFilter)
    setFilter(resetFilter)
    router.replace(`/list-movie/category?category=${filter.category}&page=1`)
  }

  const pushFilterParams = (page: number, f: FilterState) => {
    const params = new URLSearchParams({
      category: f.category,
      page: String(page)
    })
    if (f.country) params.set('country', f.country)
    if (f.year) params.set('year', f.year)
    if (f.sortField) params.set('sort_field', f.sortField)
    if (f.sortType) params.set('sort_type', f.sortType)

    router.push(`/list-movie/category?${params.toString()}`)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageParam])

  if (isLoading) return <Loading />
  if (isError) return <Error />

  return (
    <div className='space-y-4 bg-black'>
      <MovieFilter
        type='category'
        country={filterDraft.country}
        year={filterDraft.year}
        category={filterDraft.category}
        sortField={filterDraft.sortField}
        sortType={filterDraft.sortType}
        onChange={setFilterDraft} // update filterDraft mỗi khi chọn
        onSubmit={handleFilter} // chỉ khi bấm lọc mới fetch
        onReset={handleReset}
      />
      <MovieListPage
        listMovie={listMovie}
        country={filter.country}
        onPageChange={handlePageChange}
        headTitle={true}
      />
    </div>
  )
}
