'use client'

import { useCallback, useEffect, useRef } from 'react'
import type Player from 'video.js/dist/types/player'
import {
  canReplyState,
  createEchoGuard,
  isNewer,
  isPlausibleSentAt,
  nextSentAt,
  shouldApplyQueued,
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
  /** đang hiện nút "Bấm để vào cùng" → trạng thái máy mình chưa đáng tin để trả lời người khác */
  autoplayBlocked?: boolean
}

// Kéo thanh tua bắn nhiều seeking/seeked liên tiếp → chỉ gửi 1 lệnh khi đã dừng tay
const SEEK_SETTLE_MS = 300

export function usePlayerSync(opts: Options) {
  const { player } = opts
  const guardRef = useRef(createEchoGuard())
  const lastRef = useRef<ControlMessage | null>(null)
  const userSeekRef = useRef(false) // người dùng vừa tua, đợi 'seeked' ổn định để gửi
  const queuedRef = useRef<{ player: Player; handler: () => void } | null>(null)
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
      sentAt: nextSentAt(serverNow(), lastRef.current),
      by: myId
    }
  }, [])

  // Lắng nghe thao tác của người dùng trên player
  useEffect(() => {
    if (!player) return
    const guard = guardRef.current
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
      if (!guard.isSuppressed('seek')) userSeekRef.current = true
    }
    const onSeeked = () => {
      clearTimeout(seekTimer)
      seekTimer = setTimeout(() => {
        if (!userSeekRef.current || player.isDisposed()) return
        userSeekRef.current = false
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
      userSeekRef.current = false // lệnh từ xa thắng thao tác tua đang chờ gửi
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

  /** Last-write-wins: nhận lệnh nếu mới hơn lệnh cuối đã áp / đã gửi; sentAt lệch quá ±30s thì bỏ */
  const accept = useCallback((m: ControlMessage, opts: { allowPast?: boolean } = {}): boolean => {
    if (!isPlausibleSentAt(m.sentAt, optsRef.current.serverNow(), opts)) return false
    if (!isNewer(m, lastRef.current)) return false
    lastRef.current = m
    return true
  }, [])

  /** Áp vị trí + play/pause (không kiểm LWW); player chưa có metadata thì đợi loadedmetadata */
  const applyPosition = useCallback(
    (m: ControlMessage, player?: Player | null) => {
      const p = player ?? optsRef.current.player
      if (!p || p.isDisposed()) return
      // Chỉ giữ 1 lệnh chờ loadedmetadata; lúc áp kiểm lại xem còn là lệnh mới nhất không
      const queued = queuedRef.current
      if (queued && !queued.player.isDisposed()) queued.player.off('loadedmetadata', queued.handler)
      queuedRef.current = null
      if (p.readyState() >= 1) return applyNow(p, m)
      const handler = () => {
        queuedRef.current = null
        if (!p.isDisposed() && shouldApplyQueued(m, lastRef.current)) applyNow(p, m)
      }
      queuedRef.current = { player: p, handler }
      p.one('loadedmetadata', handler)
    },
    [applyNow]
  )

  /** Áp lệnh từ người khác cùng tập (last-write-wins) */
  const applyRemote = useCallback(
    (m: ControlMessage) => {
      if (accept(m)) applyPosition(m)
    },
    [accept, applyPosition]
  )

  /** Lệnh này chính là lệnh cuối đã áp (trả lời state_request lặp lại) → dùng để chỉnh lại vị trí khi bị lệch */
  const isCurrent = useCallback(
    (m: Pick<ControlMessage, 'sentAt' | 'by'>) =>
      !!lastRef.current && lastRef.current.sentAt === m.sentAt && lastRef.current.by === m.by,
    []
  )

  /**
   * Trạng thái của mình để trả lời state_request; null khi chưa đồng bộ lần nào.
   * Giữ sentAt/by của lệnh cuối (để LWW không coi câu trả lời là lệnh mới) và lùi vị trí về thời điểm đó
   * — máy nhận bù trễ lại sẽ ra đúng vị trí hiện tại.
   */
  const currentControl = useCallback((): ControlMessage | null => {
    const p = optsRef.current.player
    const last = lastRef.current
    if (!p || p.isDisposed() || !last) return null
    const ready = canReplyState({
      hasMetadata: p.readyState() >= 1,
      localPlaying: !p.paused(),
      lastIsPlaying: last.isPlaying,
      autoplayBlocked: !!optsRef.current.autoplayBlocked
    })
    if (!ready) return null
    const now = build(p, p.paused() ? 'pause' : 'play')
    const elapsed = now.isPlaying ? (now.sentAt - last.sentAt) / 1000 : 0
    return { ...now, positionSec: Math.max(0, now.positionSec - elapsed), sentAt: last.sentAt, by: last.by }
  }, [build])

  /** Mình chủ động gửi lệnh không đến từ player (vd "Tiếp tục từ mm:ss", đổi tập) → ghi nhận để LWW */
  const markSent = useCallback((m: ControlMessage) => {
    lastRef.current = m
  }, [])

  return { accept, isCurrent, applyPosition, applyRemote, currentControl, markSent, guard: guardRef.current }
}
