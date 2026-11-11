'use client'

import { useCallback, useEffect, useRef } from 'react'
import type Player from 'video.js/dist/types/player'
import {
  createEchoGuard,
  isNewer,
  shouldSeek,
  targetPosition,
  type ControlMessage,
  type ControlType
} from '@/lib/watch-room/sync'
import type { RoomEpisode, RoomMovie } from '@/types/watch-room'

// Gắn đồng bộ vào video.js: phát lệnh khi NGƯỜI DÙNG play / pause / tua, áp lệnh từ xa mà không phát ngược lại (echo guard)

type Options = {
  player: Player | null
  myId: string
  serverNow: () => number
  episode: RoomEpisode | null
  movie: RoomMovie | null
  send(m: ControlMessage): void
  /** Trình duyệt chặn tự phát → phòng hiện nút "Bấm để vào cùng" */
  onAutoplayBlocked?: () => void
}

// Kéo thanh tua bắn nhiều seeking/seeked liên tiếp → chỉ gửi 1 lệnh khi đã dừng tay
const SEEK_SETTLE_MS = 300

export function usePlayerSync(opts: Options) {
  const { player } = opts
  const guardRef = useRef(createEchoGuard())
  const lastRef = useRef<Pick<ControlMessage, 'sentAt' | 'by'> | null>(null)
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const build = useCallback((p: Player, type: ControlType): ControlMessage => {
    const { myId, serverNow, episode, movie } = optsRef.current
    return {
      type,
      positionSec: Math.max(0, p.currentTime() ?? 0),
      isPlaying: !p.paused(),
      episode,
      movie,
      sentAt: serverNow(),
      by: myId
    }
  }, [])

  // Lắng nghe thao tác của người dùng trên player
  useEffect(() => {
    if (!player) return
    const guard = guardRef.current
    let userSeekPending = false
    let seekTimer: ReturnType<typeof setTimeout> | undefined

    const emit = (type: ControlType) => {
      const msg = build(player, type)
      lastRef.current = msg
      optsRef.current.send(msg)
    }
    const onPlay = () => {
      if (!guard.isSuppressed('play')) emit('play')
    }
    const onPause = () => {
      // Hết phim / đang tua cũng bắn pause → bỏ qua
      if (guard.isSuppressed('pause') || player.ended() || player.seeking()) return
      emit('pause')
    }
    // 'seeking' bắn ngay khi currentTime đổi → so với cờ suppress đáng tin hơn 'seeked' (có thể trễ do tải)
    const onSeeking = () => {
      if (!guard.isSuppressed('seek')) userSeekPending = true
    }
    const onSeeked = () => {
      clearTimeout(seekTimer)
      seekTimer = setTimeout(() => {
        if (!userSeekPending || player.isDisposed()) return
        userSeekPending = false
        emit('seek')
      }, SEEK_SETTLE_MS)
    }

    player.on('play', onPlay)
    player.on('pause', onPause)
    player.on('seeking', onSeeking)
    player.on('seeked', onSeeked)
    return () => {
      clearTimeout(seekTimer)
      if (player.isDisposed()) return
      player.off('play', onPlay)
      player.off('pause', onPause)
      player.off('seeking', onSeeking)
      player.off('seeked', onSeeked)
    }
  }, [player, build])

  const applyNow = useCallback((p: Player, m: ControlMessage) => {
    const guard = guardRef.current
    const duration = p.duration()
    const target = targetPosition(m, optsRef.current.serverNow(), Number.isFinite(duration) ? (duration ?? null) : null)
    if (shouldSeek(p.currentTime() ?? 0, target)) {
      guard.suppress('seek')
      p.currentTime(target)
    }
    if (m.isPlaying && p.paused()) {
      guard.suppress('play')
      guard.suppress('pause') // play bị chặn có thể bắn pause ngay sau
      p.play()?.catch(() => optsRef.current.onAutoplayBlocked?.())
    } else if (!m.isPlaying && !p.paused()) {
      guard.suppress('pause')
      p.pause()
    }
  }, [])

  /** Áp lệnh từ người khác (last-write-wins); player chưa có metadata thì đợi loadedmetadata */
  const applyRemote = useCallback(
    (m: ControlMessage) => {
      if (!isNewer(m, lastRef.current)) return
      lastRef.current = m
      const p = optsRef.current.player
      if (!p || p.isDisposed()) return
      if (p.readyState() < 1) p.one('loadedmetadata', () => applyNow(p, m))
      else applyNow(p, m)
    },
    [applyNow]
  )

  /** Trạng thái hiện tại của mình để trả lời state_request; null khi chưa đồng bộ lần nào */
  const currentControl = useCallback((): ControlMessage | null => {
    const p = optsRef.current.player
    if (!p || p.isDisposed() || !lastRef.current) return null
    return build(p, p.paused() ? 'pause' : 'play')
  }, [build])

  /** Mình chủ động gửi lệnh không đến từ player (vd "Tiếp tục từ mm:ss", đổi tập) → ghi nhận để LWW */
  const markSent = useCallback((m: ControlMessage) => {
    lastRef.current = m
  }, [])

  return { applyRemote, currentControl, markSent, guard: guardRef.current }
}
