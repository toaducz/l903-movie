'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/app/auth-provider'
import { findEpisode, findEpisodeByLink, roomEpisodeOf, toRoomMovie } from '@/lib/watch-room/room-media'
import { resolveMovieSource } from '@/utils/env'
import type { MovieDetail, MovieSource } from '@/types/movie'
import XcIcon from './xc-icon'
import RoomPickerDialog from './room-picker-dialog'

// Nút "Xem chung" ở trang chi tiết phim → popup chọn / tạo phòng

type Props = {
  detail: MovieDetail
  source: MovieSource
  /** link_embed của tập đang chọn ở trang chi tiết (không có → tập đầu) */
  episodeLink?: string | null
  className?: string
}

export default function WatchPartyButton({ detail, source, episodeLink, className = '' }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const target = useMemo(() => {
    const servers = detail.episodes ?? []
    const ep = findEpisodeByLink(servers, episodeLink) ?? findEpisode(servers, null)
    return {
      movie: toRoomMovie(detail.movie, resolveMovieSource(source)),
      episode: ep ? roomEpisodeOf(ep.serverName, ep.item) : null,
      synced: Boolean(ep?.item.link_m3u8)
    }
  }, [detail, source, episodeLink])

  // Trang chi tiết đã yêu cầu đăng nhập (middleware); vẫn ẩn nút nếu phiên chưa tải xong
  if (!user) return null

  return (
    <>
      <button
        type='button'
        className={`dx-b xc-b-xc ${className}`}
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <XcIcon name='users' size={18} strokeWidth={2.2} />
        Xem chung
      </button>
      {open && (
        <RoomPickerDialog
          movie={target.movie}
          episode={target.episode}
          synced={target.synced}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
