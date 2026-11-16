'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { getWatchedStatus } from '@/services/watched-service'

const flagKey = (slug: string) => `l903:finish-banner:${slug}`

function readFlag(slug: string): boolean {
  try {
    return localStorage.getItem(flagKey(slug)) === '1'
  } catch {
    return false
  }
}

function writeFlag(slug: string) {
  try {
    localStorage.setItem(flagKey(slug), '1')
  } catch {
    // Trình duyệt chặn localStorage → banner có thể hỏi lại lần sau, không sao
  }
}

/** Quyết định có hiện banner không; `eligible` = đang ở player riêng + tập cuối + đã xem > 90% */
export function useFinishBanner(slug: string, eligible: boolean) {
  const { user } = useAuth()
  const loggedIn = Boolean(user?.id)
  const { data: watched, isPending } = useQuery(getWatchedStatus(slug, loggedIn))
  const [shown, setShown] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    setShown(false)
    setClosed(false)
  }, [slug])

  // Lần đầu đủ điều kiện → hiện và ghi cờ ngay để không hỏi lại phim này
  useEffect(() => {
    if (shown || !eligible || !loggedIn || isPending || watched || readFlag(slug)) return
    writeFlag(slug)
    setShown(true)
  }, [eligible, loggedIn, isPending, watched, shown, slug])

  return { visible: shown && !closed && !watched, close: () => setClosed(true) }
}
