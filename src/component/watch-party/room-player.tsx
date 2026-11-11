'use client'

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type Player from 'video.js/dist/types/player'
import VideoPlayer from '@/component/player/custom-player'
import type { EpisodeItem } from '@/types/movie'
import type { EchoGuard } from '@/lib/watch-room/sync'
import Avatar from './avatar'
import XcIcon from './xc-icon'
import type { FlyingEmoji, SyncToast } from './use-room-feedback'

// Player trong phòng: KKPHIM (có m3u8) → VideoPlayer đồng bộ; nguồn khác → iframe. Kèm chip đồng bộ, toast, emoji bay.

export type SyncChip = 'ok' | 'lost' | 'solo' | 'ifr' | 'connecting'

type Props = {
  item: EpisodeItem | null
  poster?: string
  isSynced: boolean
  guard: EchoGuard
  onPlayer: (p: Player) => void
  chip: SyncChip | null
  toast: SyncToast | null
  flying: FlyingEmoji[]
  /** lớp phủ: chưa chọn phim / tiếp tục xem / bạn offline / autoplay bị chặn */
  overlay?: ReactNode
  empty?: boolean
  loading?: boolean
  error?: boolean
}

const CHIPS: Record<SyncChip, { cls: string; text: string }> = {
  ok: { cls: '', text: 'Đang đồng bộ ✓' },
  lost: { cls: 'lost', text: 'Mất kết nối, đang nối lại…' },
  solo: { cls: 'solo', text: 'Chỉ mình bạn trong phòng' },
  ifr: { cls: 'ifr', text: 'Nguồn nhúng · không đồng bộ' },
  connecting: { cls: 'solo', text: 'Đang kết nối…' }
}

function Chip({ chip }: { chip: SyncChip }) {
  const { cls, text } = CHIPS[chip]
  return (
    <span className={`xc-sy ${cls}`} role='status'>
      {chip === 'ok' && <span className='xc-pulse' />}
      {(chip === 'lost' || chip === 'connecting') && <span className='xc-spin' />}
      {chip === 'solo' && <XcIcon name='users' size={12} strokeWidth={2.6} />}
      {chip === 'ifr' && <XcIcon name='info' size={12} strokeWidth={2.6} />}
      {text}
    </span>
  )
}

/** VideoPlayer remount theo link (đổi tập = player mới) để áp lệnh đang chờ sau khi tải xong */
function SyncedPlayer({
  src,
  poster,
  guard,
  onPlayer
}: {
  src: string
  poster?: string
  guard: EchoGuard
  onPlayer: (p: Player) => void
}) {
  const options = useMemo(
    () => ({
      autoplay: false,
      controls: true,
      responsive: false,
      fluid: false,
      poster: poster || undefined,
      sources: [{ src, type: 'application/x-mpegURL' }]
    }),
    [src, poster]
  )
  const onSeekProgrammatic = useCallback(() => guard.suppress('seek'), [guard])
  return (
    <VideoPlayer options={options} onReady={onPlayer} disableProgressRestore onSeekProgrammatic={onSeekProgrammatic} />
  )
}

function EmbedPlayer({ src, title }: { src: string; title: string }) {
  const [loading, setLoading] = useState(true)
  return (
    <div className='absolute inset-0'>
      {loading && (
        <div className='absolute inset-0 grid place-items-center bg-black/80 text-xs text-white/60'>
          Đang tải trình phát…
        </div>
      )}
      <iframe
        src={src}
        title={title}
        allowFullScreen
        onLoad={() => setLoading(false)}
        className='w-full h-full border-none'
      />
    </div>
  )
}

export default function RoomPlayer(props: Props) {
  const { item, poster, isSynced, guard, onPlayer, chip, toast, flying, overlay, empty, loading, error } = props

  let media: ReactNode = null
  if (loading)
    media = (
      <div className='absolute inset-0 grid place-items-center'>
        <span className='xc-spin' />
      </div>
    )
  else if (error)
    media = (
      <div className='absolute inset-0 grid place-items-center text-sm text-[var(--c-dim)]'>
        Không tải được phim này.
      </div>
    )
  else if (item && isSynced)
    media = <SyncedPlayer key={item.link_m3u8} src={item.link_m3u8} poster={poster} guard={guard} onPlayer={onPlayer} />
  else if (item?.link_embed) media = <EmbedPlayer key={item.link_embed} src={item.link_embed} title={item.name} />

  return (
    <div className={`xc-pl ${empty ? 'xc-stripe' : ''}`}>
      {media}
      {chip && (
        <div className='xc-pl-tl'>
          <Chip chip={chip} />
        </div>
      )}
      {toast && (
        <div
          key={toast.id}
          className={`xc-stt ${toast.tone === 'cyan' ? '' : toast.tone}`}
          role='status'
          aria-live='polite'
        >
          <Avatar userId={toast.userId} name={toast.name} size={26} />
          <span className='truncate'>
            <b>{toast.name}</b> {toast.text} {toast.strong && <span className='t'>{toast.strong}</span>}
          </span>
        </div>
      )}
      <div className='xc-fly' aria-hidden='true'>
        {flying.map(f => (
          <span key={f.id} className='xc-fe' style={{ left: f.left, '--dx': `${f.dx}px` } as CSSProperties}>
            {f.emoji}
            <small>{f.name}</small>
          </span>
        ))}
      </div>
      {overlay}
    </div>
  )
}
