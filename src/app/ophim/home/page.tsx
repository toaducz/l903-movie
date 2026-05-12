'use client'

import { Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import MovieItem from '@/component/item/movie-item'
import Pagination from '@/component/interactive/pagination'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import Image from 'next/image'
import errorImage from '@/assets/error.jpg'
import { getUpdateMovieOptions } from '@/api/ophim/get-update-movie'

export const dynamic = 'force-dynamic'

function MovieListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const { data: listMovie, isLoading, isError } = useQuery(getUpdateMovieOptions({ page }))

  const handlePageChange = (newPage: number) => {
    router.push(`/ophim/home?page=${newPage}`)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  if (isLoading) return <Loading />
  if (isError) return <Error />

  return (
    <>
      {listMovie?.movies?.length === 0 ? (
        <div className='flex flex-col items-center'>
          <Image
            unoptimized
            src={errorImage}
            alt='Không có phim'
            width={200}
            height={200}
            className='object-contain'
            priority
          />
          <p className='text-gray-100 mt-4'>Không tìm thấy phim nào!</p>
        </div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-5 p-3 w-full lg:px-24'>
          {listMovie?.movies?.map(movie => (
            <div key={movie.slug}>
              <MovieItem movie={movie} color='bg-slate-900' source='ophim' cdnDomain={listMovie?.APP_DOMAIN_CDN_IMAGE} />
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={listMovie?.pagination?.currentPage ?? 1}
        totalPages={listMovie?.pagination?.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    </>
  )
}

export default function MovieListPage() {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      const encoded = encodeURIComponent(search.trim())
      router.push(`/search?q=${encoded}&page=1`)
      setSearch('')
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 bg-slate-800'>
      <div className='flex flex-col pt-20 items-center'>
        <h2 className='text-2xl font-semibold text-red-500'>Ophim.com</h2>
        <div className='text-center italic text-white/70 text-[10px]'>(Nguồn Ophim)</div>

        <form onSubmit={handleSearch} className='flex items-center space-x-2 py-5'>
          <input
            type='text'
            placeholder='Tìm theo tên phim (Ophim)'
            className='px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-600 placeholder-slate-400 text-sm transition-all duration-200'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type='submit'
            className='px-4 py-2 bg-slate-800 text-white rounded-lg shadow-md hover:bg-slate-900 hover:scale-105 disabled:bg-slate-600 disabled:text-slate-400 disabled:shadow-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-600'
            disabled={!search.trim()}
          >
            Tìm
          </button>
        </form>

        <Suspense fallback={<Loading />}>
          <MovieListContent />
        </Suspense>
      </div>
    </div>
  )
}
