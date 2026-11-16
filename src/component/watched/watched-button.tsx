'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import WatchedIcon from './watched-icon'
import { useWatched } from '@/providers/watched-provider'
import { getWatchedStatus, toWatchedInput } from '@/services/watched-service'
import { useMarkWatched } from '@/hooks/use-mark-watched'
import { formatWatchedDate } from '@/utils/watched-format'
import type { MovieDetail, MovieSource } from '@/types/movie'
import type { WatchedMovie } from '@/types/watched'

interface WatchedButtonProps {
  detail: MovieDetail
  source: MovieSource
  className?: string
}

// Nút "Đã xem" ở trang chi tiết: chưa xem → đánh dấu ngay + mở popup chấm điểm; đã xem → mở popup sửa
export default function WatchedButton({ detail, source, className = '' }: WatchedButtonProps) {
  const { user } = useAuth()
  const { openRating } = useWatched()
  const { marking, markWatched } = useMarkWatched(detail, source)
  const [hovered, setHovered] = useState(false)
  const slug = detail.movie.slug
  const { data: watched, isLoading } = useQuery(getWatchedStatus(slug, Boolean(user?.id)))

  const openEdit = (entry: WatchedMovie) =>
    openRating({
      input: toWatchedInput(detail, source),
      mode: 'edit',
      initialScore: entry.score,
      initialNote: entry.note ?? '',
      meta: `Đã xem ${formatWatchedDate(entry.watched_at)}`
    })

  const base = `dx-b cursor-pointer ${className}`

  if (marking) {
    return (
      <button type='button' className={`${base} dx-b-gh cursor-not-allowed`} style={{ opacity: 0.7 }} disabled>
        <span className='dx-spin' />
        Đang lưu…
      </button>
    )
  }

  if (!user?.id || isLoading || !watched) {
    return (
      <button
        type='button'
        className={`${base} dx-b-gh ${!user?.id || isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        disabled={!user?.id || isLoading}
        style={!user?.id || isLoading ? { opacity: 0.7 } : undefined}
        title={!user?.id ? 'Đăng nhập để đánh dấu đã xem' : undefined}
        onClick={markWatched}
      >
        <WatchedIcon name='check' size={18} strokeWidth={2.6} />
        Đã xem xong!
      </button>
    )
  }

  const scoreLabel = watched.score ? `★${watched.score}` : null
  return (
    <button
      type='button'
      className={`${base} dx-b-done cursor-pointer transition-colors duration-200`}
      aria-label={scoreLabel ? `Đã xem, ${watched.score} sao — sửa điểm` : 'Đã xem, chưa chấm — chấm điểm'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openEdit(watched)}
    >
      {hovered ? (
        <>
          <WatchedIcon name='pen' size={17} />
          {scoreLabel ? `Sửa điểm · ${scoreLabel}` : 'Chấm điểm'}
        </>
      ) : (
        <>
          <WatchedIcon name='check' size={18} strokeWidth={3} />
          Đã xem <span className='dx-sep'>·</span>
          {scoreLabel ? (
            <span className='dx-st'>{scoreLabel}</span>
          ) : (
            <span className='font-semibold opacity-80'>Chưa chấm</span>
          )}
        </>
      )}
    </button>
  )
}
