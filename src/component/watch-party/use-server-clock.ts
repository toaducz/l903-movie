'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { estimateServerOffset, type ClockSample } from '@/lib/watch-room/sync'
import { fetchServerTime } from '@/services/watch-room-service'

const SAMPLE_COUNT = 3

/** Ước lượng đồng hồ server (3 mẫu /api/time, chọn RTT nhỏ nhất) để bù trễ lệnh đồng bộ */
export function useServerClock(): { serverNow: () => number; ready: boolean } {
  const offsetRef = useRef(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const measure = async () => {
      const samples: ClockSample[] = []
      for (let i = 0; i < SAMPLE_COUNT && !cancelled; i++) {
        try {
          const sentAt = Date.now()
          const serverTime = await fetchServerTime()
          samples.push({ sentAt, receivedAt: Date.now(), serverTime })
        } catch {
          // mẫu lỗi thì bỏ, còn mẫu khác
        }
      }
      if (cancelled) return
      offsetRef.current = estimateServerOffset(samples)
      setReady(true)
    }
    void measure()
    return () => {
      cancelled = true
    }
  }, [])

  const serverNow = useCallback(() => Date.now() + offsetRef.current, [])
  return { serverNow, ready }
}
