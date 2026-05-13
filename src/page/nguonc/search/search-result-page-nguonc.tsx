'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import MovieItem from '@/component/item/movie-item'
import { getSearchMovieListNguonc } from '@/api/nguonc/get-search-movie'
import Pagination from '@/component/interactive/pagination'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import Image from 'next/image'
import errorImage from '@/assets/error.jpg'

interface SearchProps {
  keyword: string
  page?: number
}

export default function SearchResultPageNguonc({ keyword, page }: Readonly<SearchProps>) {
  const router = useRouter()
  const [pageSearch, setPageSearch] = useState(page ?? 1)
  const {
    data: result,
    isLoading,
    isError
  } = useQuery(getSearchMovieListNguonc({ keyword: keyword, page: pageSearch }))
  const [search, setSearch] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      const encoded = encodeURIComponent(search.trim())
      router.push(`/nguonc/search?q=${encoded}&page=1`)
      setSearch('')
    }
  }

  const handlePageChange = (newPage: number) => {
    setPageSearch(newPage)
    router.push(`/nguonc/search?q=${encodeURIComponent(keyword)}&page=${newPage}`)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageSearch])

  // console.log(result?.data.params.pagination)

  if (isLoading) {
    return <Loading />
  }

  if (isError) {
    return <Error />
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900'>
      <div className='flex flex-col pt-20 items-center justify-content'>
        <h2 className='text-2xl font-semibold text-blue-400'>Nguonc.com</h2>

        <form onSubmit={handleSearch} className='hidden sm:flex items-center space-x-2 py-5'>
          <input
            type='text'
            placeholder='Tìm theo tên phim (Nguonc)'
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

        <h6 className='font-semibold text-gray-100 mb-6 italic'>
          Có {result?.pagination?.totalItems} kết quả từ Nguonc.com
        </h6>
        {result?.pagination?.totalItems === 0 ? (
          <div>
            <Image
              unoptimized
              src={errorImage}
              alt='Loading...'
              width={200}
              height={200}
              className='object-contain'
              priority
            />
            <div className='py-2'>Thử tìm chỗ khác xem bạn!</div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
      <div className='w-full'>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-5 p-3 w-full lg:px-24'>
          {result?.movies.map(movie => (
            <div key={movie._id}>
              <MovieItem movie={movie} source='nguonc' />
            </div>
          ))}
        </div>
      </div>
      <Pagination
        currentPage={result?.pagination?.currentPage ?? 1}
        totalPages={result?.pagination?.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
