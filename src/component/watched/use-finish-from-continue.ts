'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWatched } from './watched-provider'
import {
  getWatchedStatus,
  removeWatched,
  saveWatched,
  toWatchedInput,
  toWatchedInputFromHistory,
  watchedErrorMessage
} from '@/services/watched-service'
import { getMovieDetail } from '@/services/movie-service'
import { resolveMovieSource } from '@/utils/env'
import { saveViewHistory, saveWatchDuration, saveWatchProgress, type WatchingItem } from '@/utils/local-storage'
import type { WatchedMovie } from '@/types/watched'

const DONE_OVERLAY_MS = 600 // giữ lớp phủ "Đã xem xong!"
const LEAVE_MS = 250 // thẻ thu khỏi hàng

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
export const continueKey = (item: WatchingItem) => `${item.slug}_${item.source ?? ''}`

type Options = {
  /** Bỏ phim khỏi "Đang xem dở" (UI + localStorage + server) */
  removeFromContinue: (item: WatchingItem) => Promise<void>
  /** Tải lại hàng "Đang xem dở" sau khi hoàn tác */
  refreshContinue: () => void
}

// Khôi phục mục "Đang xem dở" với đúng tập + % cũ (localStorage + server nếu đã đăng nhập)
export async function restoreContinue(item: WatchingItem) {
  saveViewHistory({
    name: item.name,
    image: item.image,
    slug: item.slug,
    episodeName: item.episodeName,
    source: item.source
  })
  if (item.episodeName) {
    const key = `${item.slug}_${item.episodeName}`
    saveWatchProgress(key, item.progress)
    saveWatchDuration(key, item.duration)
  }
  const res = await fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: item.slug,
      name: item.name,
      image: item.image,
      episode_name: item.episodeName,
      progress: item.progress,
      duration: item.duration,
      source: item.source
    })
  })
  if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status}`)
}

// Luồng bấm ✓ trên thẻ "Đang xem dở": phủ "Đã xem xong!" → thẻ rời hàng → popup chấm điểm + toast Hoàn tác
export function useFinishFromContinue({ removeFromContinue, refreshContinue }: Options) {
  const queryClient = useQueryClient()
  const { openRating, closeRating, showToast, refreshWatched } = useWatched()
  const [doneKey, setDoneKey] = useState<string | null>(null)
  const [leavingKey, setLeavingKey] = useState<string | null>(null)

  const finish = useCallback(
    async (item: WatchingItem) => {
      if (doneKey || leavingKey) return
      const key = continueKey(item)
      const input = toWatchedInputFromHistory(item)
      const source = resolveMovieSource(item.source)
      setDoneKey(key)

      let previous: WatchedMovie | null = null
      let entry: WatchedMovie
      try {
        const [prev, saved] = await Promise.all([
          queryClient.fetchQuery(getWatchedStatus(item.slug)),
          saveWatched(input),
          wait(DONE_OVERLAY_MS)
        ])
        previous = prev
        entry = saved
      } catch (err) {
        setDoneKey(null)
        showToast({ variant: 'error', title: 'Chưa đánh dấu được', sub: watchedErrorMessage(err) })
        return
      }

      try {
        setLeavingKey(key)
        await wait(LEAVE_MS)
        await removeFromContinue(item)
      } finally {
        setDoneKey(null)
        setLeavingKey(null)
      }
      refreshWatched()

      let undone = false
      openRating({
        input,
        mode: previous ? 'edit' : 'new',
        initialScore: entry.score,
        initialNote: entry.note ?? '',
        meta: item.episodeName
      })
      showToast({
        variant: 'move',
        title: 'Đã chuyển vào Đã xem',
        sub: item.name,
        onUndo: async () => {
          undone = true
          closeRating()
          try {
            if (previous) await saveWatched({ ...input, score: previous.score })
            else await removeWatched(item.slug)
            // Note: không restore note vì giờ note ở movie_reviews
            await restoreContinue(item)
            refreshContinue()
            refreshWatched()
            showToast({ variant: 'undone', title: 'Đã hoàn tác', sub: 'Phim quay lại Đang xem dở' })
          } catch {
            showToast({ variant: 'error', title: 'Chưa hoàn tác được', sub: item.name })
          }
        }
      })

      // Bổ sung thể loại / quốc gia / năm (mục "Đang xem dở" không có) để lọc ở tab Đã xem — chạy nền
      try {
        const detail = await queryClient.fetchQuery(getMovieDetail({ slug: item.slug, source }))
        if (!undone) await saveWatched(toWatchedInput(detail, source))
      } catch {
        // Không bắt buộc: thiếu thể loại/quốc gia chỉ ảnh hưởng bộ lọc
      }
    },
    [queryClient, openRating, closeRating, showToast, refreshWatched, removeFromContinue, refreshContinue, doneKey, leavingKey]
  )

  const remove = useCallback(
    async (item: WatchingItem) => {
      if (doneKey || leavingKey) return
      const key = continueKey(item)
      setLeavingKey(key)
      await wait(LEAVE_MS)
      try {
        await removeFromContinue(item)
      } catch {
        setLeavingKey(null)
        showToast({ variant: 'error', title: 'Chưa xoá được', sub: item.name })
        return
      }
      setLeavingKey(null)

      showToast({
        variant: 'delete',
        title: 'Đã xoá khỏi Đang xem',
        sub: item.name,
        onUndo: async () => {
          try {
            await restoreContinue(item)
            refreshContinue()
            showToast({ variant: 'undone', title: 'Đã hoàn tác', sub: 'Phim quay lại Đang xem dở' })
          } catch {
            showToast({ variant: 'error', title: 'Chưa hoàn tác được', sub: item.name })
          }
        }
      })
    },
    [removeFromContinue, refreshContinue, showToast, doneKey, leavingKey]
  )

  return { finish, remove, doneKey, leavingKey }
}
