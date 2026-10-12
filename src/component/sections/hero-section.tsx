'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MovieItem as Movie } from '@/types/movie'
import { getMovieDetailHref } from '@/utils/movie-link'

type Props = {
  movie: Movie
}

export default function HeroSection({ movie }: Props) {
  const router = useRouter()

  const normalizePosterUrl = (posterUrl: string | object | null | undefined) => {
    if (!posterUrl || typeof posterUrl === 'object') return null
    const temp = String(posterUrl).trim()
    if (temp === '{}' || temp === '') return null
    return temp.startsWith('http') ? temp : `https://phimimg.com/${temp.replace(/^\/+/, '')}`
  }

  const poster = normalizePosterUrl(movie.poster_url) ?? normalizePosterUrl(movie.thumb_url)
  const optimizedPoster = poster || null

  return (
    <section className='px-5 sm:px-10 py-10 sm:py-14'>
      <div className='max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-center'>
        {/* LEFT — text */}
        <div className='pt-2'>
          <span className='c-sticker mb-4 inline-block'>★ Đỉnh nóc · kịch trần</span>

          <h1 className='text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] mt-4 mb-0 text-white'>
            {movie.name}
            {movie.origin_name && (
              <span className='block text-[var(--c-pink)] mt-1' style={{ fontSize: '0.55em' }}>
                {movie.origin_name}
              </span>
            )}
          </h1>

          <p className='text-white/70 text-base sm:text-lg leading-relaxed mt-6 mb-7 max-w-lg'>
            {movie.category?.map(c => c.name).join(' · ') ?? 'Đang cập nhật thể loại...'}
            {movie.year ? ` · ${movie.year}` : ''}
          </p>

          {/* CTA buttons */}
          <div className='flex gap-3 mb-6 flex-wrap'>
            <Link
              href={getMovieDetailHref(movie.slug, movie.source, { watch: '1' })}
              className='inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm text-white transition-all duration-150
                         bg-[var(--c-pink)] hover:-translate-x-0.5 hover:-translate-y-0.5'
              style={{ boxShadow: '5px 5px 0 var(--c-yel)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '7px 7px 0 var(--c-yel)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--c-yel)')}
            >
              <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M8 5.14v14c0 .86.84 1.4 1.58.97l11-7a1.12 1.12 0 0 0 0-1.94l-11-7a1.13 1.13 0 0 0-1.58 1z' />
              </svg>
              Xem ngay
            </Link>
            <Link
              href={getMovieDetailHref(movie.slug, movie.source)}
              className='inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150
                         bg-white/8 border-2 border-white/15 hover:border-[var(--c-cyan)] hover:text-[var(--c-cyan)]'
            >
              Chi tiết phim
            </Link>
          </div>

          {/* Meta pills */}
          <div className='flex gap-2 flex-wrap'>
            {movie.episode_current && movie.episode_current !== 'Full' && (
              <span className='c-pill pink'>{movie.episode_current}</span>
            )}
            {movie.lang && <span className='c-pill yel'>{movie.lang}</span>}
            {movie.quality && <span className='c-pill cyan'>{movie.quality}</span>}
            {movie.year && <span className='c-pill ghost'>{movie.year}</span>}
            {movie.category?.slice(0, 2).map(c => (
              <span key={c.id} className='c-pill ghost'>
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — tilted poster */}
        <div className='relative hidden lg:block'>
          <div
            className='relative aspect-[2/3] rounded-2xl overflow-hidden transition-transform duration-300 cursor-pointer'
            style={{
              transform: 'rotate(3deg)',
              boxShadow: '12px 12px 0 var(--c-pink), 22px 22px 0 var(--c-yel)'
            }}
            onClick={() => router.push(getMovieDetailHref(movie.slug, movie.source))}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'rotate(0deg)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'rotate(3deg)')}
          >
            {optimizedPoster ? (
              <Image src={optimizedPoster} alt={movie.name} fill className='object-cover' unoptimized priority />
            ) : (
              <div className='w-full h-full bg-gradient-to-br from-[var(--c-pink)] to-[var(--c-bg)]' />
            )}

            {/* Rating badge */}
            <span
              className='absolute -top-1 -right-1 bg-[var(--c-yel)] text-[var(--c-bg)] font-black text-sm px-3 py-1.5 rounded-full border-[3px] border-[var(--c-bg)] z-10'
              style={{ transform: 'rotate(8deg)' }}
            >
              ★
            </span>

            {/* Corner tag */}
            <span className='absolute bottom-4 left-4 text-[10px] font-mono px-2 py-1 tracking-widest border border-[var(--c-cyan)] text-[var(--c-cyan)] bg-[var(--c-bg)]/80'>
              L903.PICK
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
