import Image from 'next/image'
import type { MovieItem as Movie } from '@/types/movie'
import Link from 'next/link'
import { getMovieDetailHref } from '@/utils/movie-link'

type Props = {
  movie: Movie
  index: number
}

export default function MovieRankItem({ movie, index }: Props) {
  const imageSrc = movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/80x80'

  return (
    <Link href={getMovieDetailHref(movie.slug, movie.source)} className='block'>
      <div className='flex items-center gap-4 py-2 px-2 bg-stale-500 cursor-pointer hover:opacity-70'>
        <div className='text-4xl font-extrabold text-blue-500 w-8 text-center px-1'>{index + 1}</div>
        <Image
          unoptimized
          priority
          src={imageSrc}
          alt={movie.name}
          width={80}
          height={80}
          className='rounded-md h-[80px] w-[80px] object-cover'
        />
        <div className='flex flex-col overflow-hidden'>
          <span className='text-white font-medium text-sm line-clamp-2'>{movie.name}</span>
          <span className='text-gray-400 italic text-xs line-clamp-1'>{movie.origin_name}</span>
        </div>
      </div>
    </Link>
  )
}
