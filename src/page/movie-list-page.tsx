'use client'

import MovieItem from '@/component/item/movie-item'
import Pagination from '@/component/interactive/pagination'
import Image from 'next/image'
import errorImage from '@/assets/error.jpg'
import Error from '@/component/status/error'
import { Movie } from '@/api/kkphim/get-update-movie'
import { ListMovieResponse } from '@/api/kkphim/list-movie/get-list-movie-by-year'

interface MovieListPageProps {
  listMovie: ListMovieResponse
  country?: string
  onPageChange: (page: number) => void
  headTitle?: boolean
}

export default function MovieListPage({
  listMovie,
  country,
  onPageChange,
  headTitle = false
}: Readonly<MovieListPageProps>) {
  if (listMovie?.data?.items === null || listMovie.status === 'error') {
    return <Error />
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900'>
      <div className={`flex flex-col ${headTitle ? 'pt-5' : 'pt-5'} items-center justify-content`}>
        {country === 'nhat-ban' ? (
          <h2 className='text-2xl font-semibold text-gray-100 mb-6'>Anime</h2>
        ) : (
          <>
            <h2 className='text-2xl font-semibold text-gray-100'>{listMovie?.data?.titlePage ?? ''}</h2>
            <h6 className='font-semibold text-gray-100 mb-6 italic'>
              {listMovie?.data?.seoOnPage.descriptionHead ?? ''}
            </h6>
          </>
        )}

        {listMovie?.data?.items.length === 0 ? (
          <div>
            <Image
              unoptimized
              src={errorImage}
              alt='No data'
              width={200}
              height={200}
              className='object-contain'
              priority
            />
          </div>
        ) : null}
      </div>

      <div className='flex justify-center items-center'>
        <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 sm:gap-5 gap-3 p-3 w-full'>
          {listMovie?.data?.items.map((movie: Movie) => (
            <div key={movie._id}>
              <MovieItem movie={movie} cdnDomain={listMovie?.data?.APP_DOMAIN_CDN_IMAGE} />
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={listMovie?.data?.params.pagination.currentPage ?? 1}
        totalPages={listMovie?.data?.params.pagination.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </div>
  )
}
