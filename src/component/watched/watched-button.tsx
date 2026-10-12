'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-provider'
import WatchedIcon from './watched-icon'
import { useWatched } from './watched-provider'
import {
  getWatchedStatus,
  saveWatched,
  toWatchedInput,
  watchedErrorMessage,
  WATCHED_QUERY_KEY
} from '@/services/watched-service'
import { formatWatchedDate } from './watched-format'
import type { MovieDetail, MovieSource } from '@/types/movie'
import type { WatchedMovie } from '@/types/watched'

type Props = {
  detail: MovieDetail
  source: MovieSource
  className?: string
}

function detailMeta(detail: MovieDetail): string {
  const { movie } = detail
  const total = movie.episode_total && movie.episode_total !== '1' ? `${movie.episode_total} tập` : ''
  return [movie.year || '', movie.country?.[0]?.name ?? '', total].filter(Boolean).join(' · ')
}

// Nút "Đã xem" ở trang chi tiết: chưa xem → đánh dấu ngay + mở popup chấm điểm; đã xem → mở popup sửa
export default function WatchedButton({ detail, source, className = '' }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { openRating, showToast, refreshWatched } = useWatched()
  const [marking, setMarking] = useState(false)
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

  const markWatched = async () => {
    setMarking(true)
    try {
      const input = toWatchedInput(detail, source)
      const entry = await saveWatched(input)
      queryClient.setQueryData([WATCHED_QUERY_KEY, 'status', slug], entry)
      refreshWatched()
      openRating({
        input,
        mode: 'new',
        initialScore: entry.score,
        initialNote: entry.note ?? '',
        meta: detailMeta(detail)
      })
    } catch (err) {
      showToast({ variant: 'error', title: 'Chưa đánh dấu được', sub: watchedErrorMessage(err) })
    } finally {
      setMarking(false)
    }
  }

  const base = `dx-b ${className}`

  if (marking) {
    return (
      <button type='button' className={`${base} dx-b-gh`} style={{ opacity: 0.7 }} disabled>
        <span className='dx-spin' />
        Đang lưu…
      </button>
    )
  }

  if (!user?.id || isLoading || !watched) {
    return (
      <button
        type='button'
        className={`${base} dx-b-gh`}
        disabled={!user?.id || isLoading}
        style={!user?.id || isLoading ? { opacity: 0.7 } : undefined}
        title={!user?.id ? 'Đăng nhập để đánh dấu đã xem' : undefined}
        onClick={markWatched}
      >
        <WatchedIcon name='check' size={18} strokeWidth={2.6} />
        Đã xem
      </button>
    )
  }

  const scoreLabel = watched.score ? `★${watched.score}` : null
  return (
    <button
      type='button'
      className={`${base} dx-b-done`}
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
