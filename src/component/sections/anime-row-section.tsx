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

export default function AnimeRowSection({
  movies,
  title = 'Anime',
  viewAllHref = '/list-movie?typelist=hoat-hinh&country=nhat-ban'
}: Props) {
  if (!movies.length) return null

  return (
    <section className='px-5 sm:px-10 py-8'>
      {/* Glowing dot-grid container */}
      <div
        className='max-w-[1400px] mx-auto rounded-3xl px-6 sm:px-8 py-8 relative overflow-hidden border border-white/10 c-dot-grid'
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,.05) 0%, rgba(236,72,153,.05) 100%)'
        }}
      >
        {/* Section header */}
        <div className='flex items-end justify-between mb-6 gap-4 relative z-10'>
          <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
            <span className='c-marker yel' />
            {title}
            <span className='text-[var(--c-cyan)] font-semibold text-lg tracking-widest self-end pb-0.5'>アニメ</span>
            <span className='text-[var(--c-yel)] text-2xl c-burst'>★</span>
          </h2>
          <Link
            href={viewAllHref}
            className='text-sm text-white/50 hover:text-[var(--c-cyan)] transition-colors shrink-0'
          >
            Đú hết ›
          </Link>
        </div>

        {/* 6-column anime grid */}
        <div className='relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'>
          {movies.map(movie => {
            const optimized = getOptimizedImage(movie.thumb_url, movie.poster_url, 'thumb', 200, 300, 60)

            return (
              <Link key={movie._id} href={`/detail-movie/${movie.slug}`} className='group block cursor-pointer'>
                {/* Art — tilts + cyan border on hover */}
                <div
                  className='relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-transparent transition-all duration-200'
                  style={{ transition: 'transform .2s, border-color .2s, box-shadow .2s' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'rotate(-2deg)'
                    el.style.borderColor = 'var(--c-cyan)'
                    el.style.boxShadow = '6px 6px 0 var(--c-cyan)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'rotate(0deg)'
                    el.style.borderColor = 'transparent'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {optimized ? (
                    <Image
                      src={optimized}
                      alt={movie.name}
                      fill
                      className='object-cover transition-transform duration-500 group-hover:scale-105'
                      unoptimized
                    />
                  ) : (
                    <div className='w-full h-full bg-gradient-to-br from-[var(--c-cyan)]/30 to-[var(--c-bg)]' />
                  )}

                  {/* "NEW" stamp badge */}
                  <span
                    className='absolute top-2 left-2 font-mono text-[10px] font-black px-1.5 py-0.5 tracking-widest border-2 border-[var(--c-bg)]'
                    style={{
                      background: 'var(--c-yel)',
                      color: 'var(--c-bg)',
                      transform: 'rotate(-6deg)'
                    }}
                  >
                    NEW
                  </span>

                  {/* Episode badge */}
                  {movie.episode_current && (
                    <span className='absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--c-cyan)] text-[var(--c-bg)]'>
                      {movie.episode_current}
                    </span>
                  )}

                  {/* Footer gradient with category */}
                  <div className='absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-[var(--c-bg)] to-transparent'>
                    {movie.category?.[0] && (
                      <span className='font-mono text-[10px] font-bold tracking-widest text-[var(--c-cyan)]'>
                        {movie.category[0].name.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Text */}
                <p className='mt-2.5 text-[13px] font-bold text-white/90 line-clamp-1'>{movie.name}</p>
                <p className='text-[11px] text-white/40 font-light line-clamp-1'>{movie.origin_name}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
