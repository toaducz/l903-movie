'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-provider'
import { getWatchedStatus } from '@/services/watched-service'
import WatchedIcon from './watched-icon'
import { useMarkWatched } from './use-mark-watched'
import type { MovieDetail, MovieSource } from '@/types/movie'

// Banner "Xem xong rồi?" (design_handoff_da_xem mục 6): tập cuối + xem > 90% + phim chưa có trong Đã xem.
// Chỉ có ở player riêng (KKPhim) — iframe của nguồn khác không báo tiến độ. Mỗi phim chỉ hỏi 1 lần.

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

type Props = {
  detail: MovieDetail
  source: MovieSource
  percent: number
  isSeries: boolean
  placement: 'overlay' | 'inline'
  onClose: () => void
}

export default function FinishBanner({ detail, source, percent, isSeries, placement, onClose }: Props) {
  const { marking, markWatched } = useMarkWatched(detail, source)

  const rate = async () => {
    if (await markWatched()) onClose()
  }

  return (
    <section className={`dx-bn ${placement === 'overlay' ? 'dx-bn-ov' : 'dx-bn-in'}`} aria-label='Đánh dấu đã xem'>
      <button type='button' className='dx-md-x dx-bn-x' aria-label='Đóng' onClick={onClose}>
        <WatchedIcon name='x' size={16} />
      </button>
      <span className='c-sticker'>
        {isSeries ? 'TẬP CUỐI' : 'GẦN HẾT PHIM'} · {Math.min(99, Math.round(percent * 100))}%
      </span>
      <h4>Xem xong rồi?</h4>
      <p>Đánh dấu Đã xem để lưu lại kèm điểm riêng — lần sau giới thiệu cho bạn bè dễ hơn.</p>
      <div className='flex gap-3'>
        <button
          type='button'
          className='dx-b dx-b-pri dx-b-sm'
          style={{ height: 44 }}
          disabled={marking}
          onClick={rate}
        >
          {marking ? <span className='dx-spin' /> : <WatchedIcon name='star' size={15} strokeWidth={2.6} />}
          {marking ? 'Đang lưu…' : 'Chấm điểm'}
        </button>
        <button type='button' className='dx-b dx-b-gh dx-b-sm' style={{ height: 44 }} onClick={onClose}>
          Để sau
        </button>
      </div>
    </section>
  )
}
