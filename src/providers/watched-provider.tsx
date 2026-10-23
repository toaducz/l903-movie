'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import RatingDialog, { SCORE_LABELS, type RatingTarget } from '@/component/watched/rating-dialog'
import WatchedToast, { type WatchedToastData } from '@/component/watched/watched-toast'
import { removeWatched, saveWatched, watchedErrorMessage, WATCHED_QUERY_KEY } from '@/services/watched-service'
import type { WatchedMovie } from '@/types/watched'

type ToastInput = Omit<WatchedToastData, 'id'>

export interface WatchedContextValue {
  openRating: (target: RatingTarget) => void
  closeRating: () => void
  showToast: (toast: ToastInput) => void
  /** Xoá khỏi "Đã xem" + toast Hoàn tác (khôi phục cả điểm và ghi chú) */
  deleteWatched: (target: RatingTarget) => Promise<void>
  /** Đồng bộ lại mọi query "Đã xem" (nút trang chi tiết, trang Hồ sơ…) */
  refreshWatched: () => Promise<void>
}

const WatchedContext = createContext<WatchedContextValue | null>(null)

export function useWatched(): WatchedContextValue {
  const ctx = useContext(WatchedContext)
  if (!ctx) throw new Error('useWatched phải dùng bên trong <WatchedProvider>')
  return ctx
}

export default function WatchedProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<RatingTarget | null>(null)
  const [toast, setToast] = useState<WatchedToastData | null>(null)
  const toastId = useRef(0)

  const refreshWatched = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [WATCHED_QUERY_KEY] }),
    [queryClient]
  )

  const showToast = useCallback((input: ToastInput) => {
    toastId.current += 1
    setToast({ ...input, id: toastId.current })
  }, [])

  const dismissToast = useCallback((id: number) => setToast(prev => (prev?.id === id ? null : prev)), [])

  const deleteWatched = useCallback(
    async (snapshot: RatingTarget) => {
      const { input } = snapshot
      try {
        await removeWatched(input.slug)
      } catch (err) {
        showToast({ variant: 'error', title: 'Chưa xoá được', sub: watchedErrorMessage(err) })
        return
      }
      await refreshWatched()
      showToast({
        variant: 'delete',
        title: 'Đã xoá khỏi Đã xem',
        sub: input.name,
        onUndo: async () => {
          try {
            const restored = await saveWatched({ ...input, score: snapshot.initialScore })
            if (snapshot.initialNote?.trim()) {
              await fetch('/api/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  slug: input.slug,
                  name: input.name,
                  image: input.image || '',
                  score: snapshot.initialScore || 0,
                  review_text: snapshot.initialNote.trim(),
                  parent_id: null,
                  watched_movie_id: restored.id
                })
              })
            }
            await refreshWatched()
            showToast({ variant: 'undone', title: 'Đã hoàn tác', sub: 'Phim quay lại Đã xem' })
          } catch {
            showToast({ variant: 'error', title: 'Chưa hoàn tác được', sub: input.name })
          }
        }
      })
    },
    [refreshWatched, showToast]
  )

  const handleSaved = useCallback(
    (movie: WatchedMovie) => {
      setTarget(null)
      queryClient.setQueryData([WATCHED_QUERY_KEY, 'status', movie.slug], movie)
      refreshWatched()
      if (movie.score) {
        showToast({
          variant: 'saved',
          title: `Đã lưu ★${movie.score}`,
          sub: `${movie.name} · ${SCORE_LABELS[movie.score]}`
        })
      }
    },
    [queryClient, refreshWatched, showToast]
  )

  const handleDelete = useCallback(() => {
    if (!target) return
    setTarget(null)
    deleteWatched(target)
  }, [target, deleteWatched])

  const value = useMemo(
    () => ({ openRating: setTarget, closeRating: () => setTarget(null), showToast, deleteWatched, refreshWatched }),
    [showToast, deleteWatched, refreshWatched]
  )

  return (
    <WatchedContext.Provider value={value}>
      {children}
      {target && (
        <RatingDialog
          key={`${target.input.slug}_${target.mode}`}
          target={target}
          onClose={() => setTarget(null)}
          onSaved={handleSaved}
          onDelete={handleDelete}
        />
      )}
      <WatchedToast toast={toast} onDismiss={dismissToast} />
    </WatchedContext.Provider>
  )
}
