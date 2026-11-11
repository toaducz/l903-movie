'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Phản hồi trên player: toast đồng bộ (1 cái, 3s, cái mới thay cái cũ) + emoji bay (tối đa 12, 2.6s)

export type SyncToast = {
  id: number
  userId: string
  name: string
  text: string
  /** phần nhấn mạnh (thời gian / tên tập / tên phim) */
  strong?: string
  tone: 'cyan' | 'yel' | 'org'
}

export type FlyingEmoji = { id: number; emoji: string; name: string; left: number; dx: number }

const TOAST_MS = 3000
const FLY_MS = 2600
const MAX_FLYING = 12

export function useRoomFeedback() {
  const [toast, setToast] = useState<SyncToast | null>(null)
  const [flying, setFlying] = useState<FlyingEmoji[]>([])
  const seq = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const showToast = useCallback(
    (t: Omit<SyncToast, 'id'>) => {
      const id = ++seq.current
      setToast({ ...t, id })
      later(() => setToast(cur => (cur?.id === id ? null : cur)), TOAST_MS)
    },
    [later]
  )

  const addFlying = useCallback(
    (emoji: string, name: string) => {
      const id = ++seq.current
      const item: FlyingEmoji = {
        id,
        emoji,
        name,
        left: 10 + Math.round(Math.random() * 70),
        dx: Math.round(Math.random() * 60 - 30)
      }
      setFlying(list => [...list, item].slice(-MAX_FLYING))
      later(() => setFlying(list => list.filter(f => f.id !== id)), FLY_MS)
    },
    [later]
  )

  return { toast, showToast, flying, addFlying }
}
