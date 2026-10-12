'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWatched } from './watched-provider'
import { saveWatched, toWatchedInput, watchedErrorMessage, WATCHED_QUERY_KEY } from '@/services/watched-service'
import type { MovieDetail, MovieSource } from '@/types/movie'

export function detailMeta(detail: MovieDetail): string {
  const { movie } = detail
  const total = movie.episode_total && movie.episode_total !== '1' ? `${movie.episode_total} tập` : ''
  return [movie.year || '', movie.country?.[0]?.name ?? '', total].filter(Boolean).join(' · ')
}

/** Đánh dấu phim đang mở là "Đã xem" rồi mở popup chấm điểm (nút ở trang chi tiết + banner cuối phim) */
export function useMarkWatched(detail: MovieDetail, source: MovieSource) {
  const queryClient = useQueryClient()
  const { openRating, showToast, refreshWatched } = useWatched()
  const [marking, setMarking] = useState(false)

  const markWatched = async (): Promise<boolean> => {
    setMarking(true)
    try {
      const input = toWatchedInput(detail, source)
      const entry = await saveWatched(input)
      queryClient.setQueryData([WATCHED_QUERY_KEY, 'status', detail.movie.slug], entry)
      refreshWatched()
      openRating({
        input,
        mode: 'new',
        initialScore: entry.score,
        initialNote: entry.note ?? '',
        meta: detailMeta(detail)
      })
      return true
    } catch (err) {
      showToast({ variant: 'error', title: 'Chưa đánh dấu được', sub: watchedErrorMessage(err) })
      return false
    } finally {
      setMarking(false)
    }
  }

  return { marking, markWatched }
}
