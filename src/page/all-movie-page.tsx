'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
// import { useMemo } from 'react'
import MovieItem from '@/component/item/movie-item'
import { getLatestUpdateMovieList } from '@/api/kkphim/get-update-movie'
import Pagination from '@/component/interactive/pagination'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import Image from 'next/image'
import errorImage from '@/assets/error.jpg'

interface Props {
  page: number
}

export default function AllMoviePage({ page }: Readonly<Props>) {
  const router = useRouter()
  const [pageSearch, setPageSearch] = useState(page ?? 1)
  const {
    data: listMovie,
    isLoading,
    isError
  } = useQuery(
    getLatestUpdateMovieList({
      page: page
    })
  )

  //   console.log(listMovie?.data.items)

  const handlePageChange = (newPage: number) => {
    setPageSearch(newPage)
    router.push(`/all-movie?&page=${newPage}`)
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
        <h2 className='text-2xl font-semibold text-gray-100'>{'Phim mới cập nhật'}</h2>
        <h6 className='font-semibold text-gray-100 mb-6 italic'>{'L903 Movie'}</h6>
        {listMovie?.items.length === 0 ? (
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
          </div>
        ) : (
          <div></div>
        )}
      </div>
      <div className='flex justify-center items-center '>
        <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 sm:gap-5 gap-3 p-3 w-full'>
          {listMovie?.items.map(movie => (
            <div key={movie._id}>
              <MovieItem movie={movie} cdnDomain={listMovie.APP_DOMAIN_CDN_IMAGE} />
            </div>
          ))}
        </div>
      </div>
      <Pagination
        currentPage={listMovie?.pagination.currentPage ?? 1}
        totalPages={listMovie?.pagination.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
