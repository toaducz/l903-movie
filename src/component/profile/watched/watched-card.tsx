'use client'

import Image from 'next/image'
import Link from 'next/link'
import SourceBadge from '@/component/item/source-badge'
import { getMovieDetailHref } from '@/utils/movie-link'
import WatchedIcon from '@/component/watched/watched-icon'
import { formatWatchedDate } from '@/utils/watched-format'
import type { RatingTarget } from '@/component/watched/rating-dialog'
import type { WatchedMovie } from '@/types/watched'

/** Dựng target cho popup chấm điểm từ 1 dòng "Đã xem" (giữ nguyên thể loại / quốc gia khi lưu lại) */
export function toRatingTarget(movie: WatchedMovie): RatingTarget {
  return {
    input: {
      slug: movie.slug,
      source: movie.source,
      name: movie.name,
      origin_name: movie.origin_name,
      image: movie.image,
      year: movie.year,
      categories: movie.categories,
      countries: movie.countries
    },
    mode: 'edit',
    initialScore: movie.score,
    initialNote: movie.note ?? '',
    meta: `Đã xem ${formatWatchedDate(movie.watched_at)}`
  }
}

interface WatchedCardProps {
  movie: WatchedMovie
  onRate: (movie: WatchedMovie) => void
  onDelete: (movie: WatchedMovie) => void
  onMore: (movie: WatchedMovie) => void
  isOwner?: boolean
}

export default function WatchedCard({ movie, onRate, onDelete, onMore, isOwner = false }: WatchedCardProps) {
  const href = getMovieDetailHref(movie.slug, movie.source)
  const rated = movie.score !== null

  return (
    <div className={`dx-wc ${isOwner ? 'is-owner' : 'not-owner'}`}>
      <div className='dx-pst'>
        <Link href={href} className='absolute inset-0 cursor-pointer' aria-label={movie.name} tabIndex={-1}>
          {movie.image && (
            <Image
              src={movie.image}
              alt={movie.name}
              fill
              unoptimized
              sizes='(min-width:1280px) 16vw, (min-width:768px) 22vw, 45vw'
              className='object-cover'
            />
          )}
        </Link>

        {rated ? (
          <span className={`dx-sc s${movie.score}`}>★{movie.score}</span>
        ) : (
          <span className='dx-sc s0'>Chưa chấm</span>
        )}
        {isOwner && !rated && (
          <button type='button' className='dx-qk cursor-pointer transition-colors duration-200' onClick={() => onRate(movie)}>
            <WatchedIcon name='star' size={13} strokeWidth={2.6} />
            Chấm nhanh
          </button>
        )}
        <SourceBadge source={movie.source} className='absolute bottom-2 right-2 pointer-events-none' />

        {isOwner && (
          <>
            <div className='dx-wc-ov'>
              <button type='button' className='dx-b dx-b-sm dx-b-yel cursor-pointer transition-colors duration-200' onClick={() => onRate(movie)}>
                <WatchedIcon name='pen' size={15} />
                {rated ? 'Sửa điểm' : 'Chấm điểm'}
              </button>
              <button type='button' className='dx-b dx-b-sm dx-b-gh cursor-pointer transition-colors duration-200' onClick={() => onDelete(movie)}>
                <WatchedIcon name='trash' size={15} />
                Xoá
              </button>
            </div>
            <button
              type='button'
              className='dx-more cursor-pointer transition-colors duration-200'
              aria-label={`Thao tác: ${movie.name}`}
              onClick={() => onMore(movie)}
            >
              <WatchedIcon name='dots' size={18} />
            </button>
          </>
        )}
      </div>

      <Link href={href} className='dx-wc-t hover:text-[var(--c-yel)] cursor-pointer transition-colors duration-200' title={movie.name}>
        {movie.name}
      </Link>
      {movie.note ? (
        <div className='dx-wc-n' title={movie.note}>
          “{movie.note}”
        </div>
      ) : (
        <div className='dx-wc-n no'>Chưa có ghi chú</div>
      )}
      <div className='dx-wc-d'>Xem {formatWatchedDate(movie.watched_at)}</div>
    </div>
  )
}
