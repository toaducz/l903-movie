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

export default function SeriesRowSection({
  movies,
  title = 'Phim bộ — đu đến cùng',
  viewAllHref = '/list-movie?typelist=phim-bo'
}: Props) {
  if (!movies.length) return null

  return (
    <section className='px-5 sm:px-10 py-8'>
      {/* Section header */}
      <div className='max-w-[1400px] mx-auto flex items-end justify-between mb-6 gap-4'>
        <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
          <span className='c-marker' />
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className='text-sm text-white/50 hover:text-[var(--c-cyan)] transition-colors shrink-0'
        >
          Xem tất cả ›
        </Link>
      </div>

      {/* Grid */}
      <div className='max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6'>
        {movies.map((movie, i) => {
          const optimized = getOptimizedImage(movie.thumb_url, movie.poster_url, 'thumb', 250, 375, 60)

          return (
            <Link
              key={movie._id}
              href={`/detail-movie/${movie.slug}`}
              className='group relative cursor-pointer block'
              style={{
                transform: i % 2 === 0 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)',
                transition: 'transform .2s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.02)')}
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.transform = i % 2 === 0 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)')
              }
            >
              {/* Art */}
              <div
                className='relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 transition-all duration-200
                              group-hover:shadow-[0_14px_30px_-10px_rgba(236,72,153,.45)]'
              >
                {/* Big number behind */}
                <span
                  className='absolute -bottom-4 -left-2 font-mono font-black leading-none pointer-events-none select-none'
                  style={{
                    fontSize: 100,
                    color: 'rgba(255,255,255,.06)',
                    WebkitTextStroke: '2px rgba(255,255,255,.12)',
                    zIndex: 0,
                    lineHeight: 1
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {optimized ? (
                  <Image
                    src={optimized}
                    alt={movie.name}
                    fill
                    className='object-cover transition-transform duration-500 group-hover:scale-105 relative z-[1]'
                    unoptimized
                  />
                ) : (
                  <div className='w-full h-full bg-gradient-to-br from-[var(--c-pink)]/30 to-[var(--c-bg)]' />
                )}

                {/* Quality badge */}
                {movie.quality && (
                  <span className='absolute top-2 left-2 z-10 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide bg-[var(--c-pink)] text-white'>
                    {movie.quality}
                  </span>
                )}

                {/* Episode pill */}
                {movie.episode_current && (
                  <div className='absolute bottom-3 left-3 right-3 flex z-10'>
                    <span className='c-pill ghost text-[10px]'>{movie.episode_current}</span>
                  </div>
                )}
              </div>

              {/* Text */}
              <p className='mt-2.5 text-[13px] font-bold text-white/90 line-clamp-1 px-0.5'>{movie.name}</p>
              <p className='text-[11px] text-white/40 font-light line-clamp-1 px-0.5'>
                {movie.origin_name}
                {movie.year ? ` · ${movie.year}` : ''}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
