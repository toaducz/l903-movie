'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Movie } from '@/api/kkphim/get-update-movie'
import React, { useState } from 'react'
import { getOphimImageMovie } from '@/utils/common'

type Props = {
  movie: Movie
  color?: string
  source?: string
  index?: number
  cdnDomain?: string
}

export default function MovieItem({ movie, color, source, index, cdnDomain }: Readonly<Props>) {
  const [isLoaded, setIsLoaded] = useState(false)

  const normalizePosterUrl = (url: string | object | null | undefined) => {
    if (!url || typeof url === 'object') return null
    const temp = String(url).trim()
    if (temp === '{}' || temp === '') return null

    // If it's already a full URL, return it (e.g. processed by mapping or returned by API)
    if (temp.startsWith('http')) return temp

    const cleanPath = temp.replace(/^\/+/, '')

    // Handle relative paths based on source (as fallback)
    switch (source) {
      case 'ophim':
        return getOphimImageMovie(cdnDomain ?? '', url)
      case 'nguonc':
        return `https://phim.nguonc.com/uploads/movies/${cleanPath}`
      default:
        // Default to KKPhim domain
        return `${cdnDomain}/${cleanPath}`
    }
  }

  const poster = normalizePosterUrl(movie.poster_url)
  const thumb = normalizePosterUrl(movie.thumb_url)

  const optimizedUrl = (url: string | null) => {
    if (!url) return ''
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=250&h=375&fit=cover&output=webp&q=60`
  }

  const isPriority = index !== undefined && index < 6

  // Cycle accent colours for visual variety
  const ACCENTS = ['var(--c-pink)', 'var(--c-yel)', 'var(--c-cyan)', 'var(--c-orange)']
  const accent = color ?? ACCENTS[(index ?? 0) % ACCENTS.length]

  return (
    <Link
      href={
        source === 'nguonc'
          ? `/nguonc/detail-movie/${movie.slug}`
          : source
          ? `/detail-movie/${movie.slug}?source=${source}`
          : `/detail-movie/${movie.slug}`
      }
      className='group block'
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Card art — hard offset shadow on hover via inline style so accent colour is dynamic */}
      <div
        className='relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-200
                   group-hover:-translate-x-0.5 group-hover:-translate-y-0.5'
        style={{ boxShadow: '5px 5px 0 transparent', transition: 'box-shadow .2s, transform .2s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = `7px 7px 0 ${accent}`)}
        onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = `5px 5px 0 transparent`)}
      >
        {/* Aspect ratio 2:3 */}
        <div className='relative aspect-[2/3] overflow-hidden bg-[var(--c-card)]'>
          {/* Skeleton pulse */}
          {!isLoaded && <div className='absolute inset-0 bg-white/5 animate-pulse' />}

          <Image
            src={optimizedUrl(thumb ?? poster) || 'https://via.placeholder.com/250x375?text=No+Poster'}
            alt={movie.name}
            fill
            sizes='(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 20vw, 15vw'
            loading={isPriority ? undefined : 'lazy'}
            priority={isPriority}
            onLoad={() => setIsLoaded(true)}
            className={`object-cover transition-all duration-500 group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            unoptimized
          />

          {/* Hover overlay + play button */}
          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center'>
            <div
              className='w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm scale-90 group-hover:scale-100 transition-transform duration-200'
              style={{ background: accent, boxShadow: `0 0 24px ${accent}` }}
            >
              <svg className='w-5 h-5 text-white ml-0.5' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M8 5.14v14c0 .86.84 1.4 1.58.97l11-7a1.12 1.12 0 0 0 0-1.94l-11-7a1.13 1.13 0 0 0-1.58 1z' />
              </svg>
            </div>
          </div>

          {/* Quality badge — top left */}
          {movie.quality && (
            <span
              className='absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase'
              style={{
                background: accent,
                color: accent === 'var(--c-yel)' ? 'var(--c-bg)' : '#fff'
              }}
            >
              {movie.quality}
            </span>
          )}

          {/* Episode badge — top right */}
          {movie.episode_current && movie.episode_current !== 'Full' && (
            <span className='absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-white/90'>
              {movie.episode_current}
            </span>
          )}

          {/* Lang badge — bottom left */}
          {movie.lang && (
            <span className='absolute bottom-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white/60 backdrop-blur-sm'>
              {movie.lang}
            </span>
          )}

          {/* Source badge — bottom right */}
          {source && (
            <span
              className='absolute bottom-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase opacity-80'
              style={{
                background: source === 'ophim' ? '#ff4d4f' : source === 'nguonc' ? '#52c41a' : '#1890ff',
                color: '#fff'
              }}
            >
              {source === 'nguonc' ? 'Nguồn C' : source}
            </span>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className='pt-2.5 px-0.5 space-y-0.5'>
        <h2 className='text-[13px] font-bold text-white/90 line-clamp-1 group-hover:text-white transition-colors duration-200'>
          {movie.name}
        </h2>
        <p className='text-[11px] text-white/40 line-clamp-1 font-light tracking-wide'>{movie.origin_name}</p>
        <div className='flex items-center justify-between pt-1'>
          <span className='text-[10px] text-white/30 font-light'>{movie.year}</span>
          <div className='flex gap-1 overflow-hidden'>
            {movie.category?.slice(0, 1).map(cat => (
              <span key={cat.id} className='text-[10px] text-white/30 font-light truncate'>
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
