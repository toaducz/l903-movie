'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Movie } from '@/api/kkphim/get-update-movie'
import { getOptimizedImage } from '@/utils/common'

type Props = {
  movies: Movie[]
  title?: string
  viewAllHref?: string
}

export default function MoviesRowSection({
  movies,
  title = 'Phim lẻ — xem 1 tối là xong',
  viewAllHref = '/list-movie?typelist=phim-le'
}: Props) {
  if (!movies.length) return null

  return (
    <section className='px-5 sm:px-10 py-8'>
      {/* Section header */}
      <div className='max-w-[1400px] mx-auto flex items-end justify-between mb-6 gap-4'>
        <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
          <span className='c-marker cyan' />
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className='text-sm text-white/50 hover:text-[var(--c-cyan)] transition-colors shrink-0'
        >
          Xem tất cả ›
        </Link>
      </div>

      {/* Horizontal 16:10 card grid */}
      <div className='max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
        {movies.map(movie => {
          const optimized = getOptimizedImage(movie.thumb_url, movie.poster_url, 'poster', 480, 300, 65)

          return (
            <Link
              key={movie._id}
              href={`/detail-movie/${movie.slug}`}
              className='group cursor-pointer rounded-xl overflow-hidden border border-white/10 transition-all duration-200
                         hover:-translate-y-1 hover:border-[var(--c-cyan)]'
              style={{ background: 'var(--c-card)' }}
            >
              {/* 16:10 art */}
              <div className='relative aspect-[16/10] overflow-hidden'>
                {optimized ? (
                  <Image
                    src={optimized}
                    alt={movie.name}
                    fill
                    className='object-cover transition-transform duration-500 group-hover:scale-105'
                    unoptimized
                  />
                ) : (
                  <div className='w-full h-full bg-gradient-to-br from-[var(--c-cyan)]/20 to-[var(--c-bg)]' />
                )}

                {/* Duration / episode overlay */}
                {movie.time && (
                  <span
                    className='absolute bottom-3 right-3 text-[11px] font-mono font-bold px-2 py-1 rounded-md
                               text-[var(--c-cyan)] border border-[var(--c-cyan)] backdrop-blur-sm'
                    style={{ background: 'rgba(13,10,20,.85)' }}
                  >
                    ⏱ {movie.time}
                  </span>
                )}

                {/* Quality */}
                {movie.quality && (
                  <span className='absolute top-3 left-3 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide bg-[var(--c-cyan)] text-[var(--c-bg)]'>
                    {movie.quality}
                  </span>
                )}

                {/* Hover play overlay */}
                <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center'>
                  <div
                    className='w-14 h-14 rounded-full flex items-center justify-center'
                    style={{ background: 'var(--c-pink)', boxShadow: '0 0 30px rgba(236,72,153,.6)' }}
                  >
                    <svg className='w-6 h-6 text-white ml-1' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M8 5.14v14c0 .86.84 1.4 1.58.97l11-7a1.12 1.12 0 0 0 0-1.94l-11-7a1.13 1.13 0 0 0-1.58 1z' />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className='p-3.5'>
                <p className='text-[13px] font-bold text-white/90 line-clamp-1'>{movie.name}</p>
                <p className='text-[11px] text-white/40 font-light line-clamp-1 mt-0.5'>
                  {movie.origin_name}
                  {movie.year ? ` · ${movie.year}` : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
