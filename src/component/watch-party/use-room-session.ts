'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type Player from 'video.js/dist/types/player'
import { getMovieDetail } from '@/services/movie-service'
import { beaconRoomState, logRoomEvent, saveRoomState, type RoomDetail } from '@/services/watch-room-service'
import { formatPosition } from '@/lib/watch-room/chat-format'
import { createEventThrottle } from '@/lib/watch-room/event-throttle'
import { findEpisode, roomEpisodeOf, sameEpisode, sameMovie } from '@/lib/watch-room/room-media'
import type { ControlMessage, ControlType } from '@/lib/watch-room/sync'
import type { LoggableRoomEventType, RoomEpisode, RoomMessage, RoomMovie } from '@/types/watch-room'
import { useServerClock } from './use-server-clock'
import { usePlayerSync } from './use-player-sync'
import { useRoomChannel, type ReactionMessage } from './use-room-channel'
import { useRoomFeedback } from './use-room-feedback'

// Điều phối 1 phòng: phim/tập hiện tại, player, kênh realtime, toast, snapshot DB, ghi sự kiện, presence

export type RoomMe = { userId: string; displayName: string }
type Playback = { movie: RoomMovie | null; episode: RoomEpisode | null }
type LoggedEvent = { type: LoggableRoomEventType; value?: string }

const SNAPSHOT_MS = 10_000
const PRESENCE_MS = 5_000
const EVENT_LOG_MS = 2_000
const SETTLE_MS = 1_200
const REACTION_THROTTLE_MS = 250

const noop = () => undefined

export function useRoomSession(room: RoomDetail, me: RoomMe, onMessage: (m: RoomMessage) => void) {
  const { serverNow } = useServerClock()
  const feedback = useRoomFeedback()
  const { addFlying, showToast } = feedback
  const [playback, setPlayback] = useState<Playback>({ movie: room.state.movie, episode: room.state.episode })
  const [player, setPlayer] = useState<Player | null>(null)
  const [joined, setJoined] = useState(false) // đã vào nhịp phát chung (đã gửi / nhận lệnh)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [settled, setSettled] = useState(false) // đợi câu trả lời state_reply một chút trước khi hiện card
  const pendingRef = useRef<ControlMessage | null>(null)
  const lastReactionRef = useRef(0)

  const names = useMemo(() => new Map(room.members.map(m => [m.userId, m.displayName])), [room.members])
  const nameOf = useCallback(
    (userId: string) => (userId === me.userId ? 'bạn' : (names.get(userId) ?? 'ai đó')),
    [names, me.userId]
  )

  const { movie } = playback
  const detailQuery = useQuery({
    ...getMovieDetail({ slug: movie?.slug ?? '', source: movie?.source }),
    enabled: !!movie
  })
  const resolved = useMemo(
    () => (detailQuery.data ? findEpisode(detailQuery.data.episodes ?? [], playback.episode) : null),
    [detailQuery.data, playback.episode]
  )
  const episode = resolved ? roomEpisodeOf(resolved.serverName, resolved.item) : playback.episode
  const isSynced = Boolean(resolved?.item.link_m3u8)

  // Giá trị mới nhất cho callback realtime (tránh closure cũ)
  const live = useRef({ movie, episode, player, joined })
  useEffect(() => {
    live.current = { movie, episode, player, joined }
  })

  const logger = useMemo(
    () => createEventThrottle<LoggedEvent>(e => void logRoomEvent(room.id, e.type, e.value).catch(noop), EVENT_LOG_MS),
    [room.id]
  )
  useEffect(() => () => logger.flush(), [logger])

  const snapshot = useCallback(() => {
    const { movie: mv, episode: ep, player: p } = live.current
    const usable = p && !p.isDisposed()
    return {
      movie: mv,
      episode: ep,
      positionSec: usable ? (p.currentTime() ?? 0) : 0,
      isPlaying: usable ? !p.paused() : false
    }
  }, [])
  const saveSnapshot = useCallback(() => void saveRoomState(room.id, snapshot()).catch(noop), [room.id, snapshot])

  const channel = useRoomChannel(room.id, me, {
    onControl: m => handleIncoming(m, 'control'),
    onStateReply: m => handleIncoming(m, 'reply'),
    // handleIncoming / sync khai báo bên dưới — chỉ được gọi khi có sự kiện, lúc đó đã sẵn sàng
    onStateRequest: () => {
      const c = sync.currentControl()
      if (c) channel.replyState(c)
    },
    onReaction: (r: ReactionMessage) => addFlying(r.emoji, r.displayName || nameOf(r.by)),
    onMessage
  })
  const { sendControl, sendReaction: broadcastReaction, trackPresence, status } = channel

  // Lệnh do chính mình thao tác trên player
  const sendFromPlayer = useCallback(
    (m: ControlMessage) => {
      sendControl(m)
      setJoined(true)
      logger.push({ type: m.type as LoggableRoomEventType, value: formatPosition(m.positionSec) })
      if (m.type === 'pause') saveSnapshot()
    },
    [sendControl, logger, saveSnapshot]
  )

  const sync = usePlayerSync({
    player,
    myId: me.userId,
    serverNow,
    episode,
    movie,
    send: sendFromPlayer,
    onAutoplayBlocked: () => setAutoplayBlocked(true)
  })
  const { accept, isCurrent, markSent, applyPosition, guard } = sync

  // ── Lệnh đến từ người khác (control) hoặc câu trả lời trạng thái (state_reply) ──
  const handleIncoming = useCallback(
    (m: ControlMessage, kind: 'control' | 'reply') => {
      const fresh = accept(m)
      if (!fresh && !(kind === 'reply' && isCurrent(m))) return
      const wasJoined = live.current.joined
      setJoined(true)
      setAutoplayBlocked(false)

      const cur = live.current
      const movieChanged = !!m.movie && !sameMovie(m.movie, cur.movie)
      if (movieChanged || (m.episode && !sameEpisode(m.episode, cur.episode))) {
        pendingRef.current = m
        setPlayback({ movie: m.movie ?? cur.movie, episode: m.episode })
      } else {
        applyPosition(m)
      }

      if (!fresh) return
      const name = nameOf(m.by)
      const at = formatPosition(m.positionSec)
      if (kind === 'reply') {
        if (!wasJoined) showToast({ userId: m.by, name: `Đã vào cùng ${name}`, text: 'tại', strong: at, tone: 'cyan' })
        return
      }
      const toasts: Record<ControlType, Omit<Parameters<typeof showToast>[0], 'userId' | 'name'>> = {
        play: { text: 'tiếp tục phát', tone: 'cyan' },
        pause: { text: 'đã tạm dừng ·', strong: at, tone: 'yel' },
        seek: { text: 'tua tới', strong: at, tone: 'cyan' },
        episode: { text: 'đổi sang', strong: m.episode?.episodeName, tone: 'cyan' },
        movie: { text: 'đổi phim:', strong: m.movie?.title, tone: 'cyan' }
      }
      showToast({ userId: m.by, name, ...toasts[m.type] })
    },
    [accept, isCurrent, applyPosition, nameOf, showToast]
  )

  /** Gửi một lệnh do mình chủ động (tiếp tục, đổi tập, đổi phim) — áp cả cho máy mình */
  const sendOwn = useCallback(
    (type: ControlType, next: Playback, positionSec: number, isPlaying: boolean) => {
      const m: ControlMessage = {
        type,
        positionSec,
        isPlaying,
        episode: next.episode,
        movie: next.movie,
        sentAt: serverNow(),
        by: me.userId
      }
      markSent(m)
      sendControl(m)
      setJoined(true)
      return m
    },
    [serverNow, me.userId, markSent, sendControl]
  )

  const changeEpisode = useCallback(
    (next: RoomEpisode) => {
      const cur = live.current
      if (sameEpisode(next, cur.episode)) return
      const p = cur.player
      const playing = !!p && !p.isDisposed() && !p.paused()
      const target = { movie: cur.movie, episode: next }
      pendingRef.current = sendOwn('episode', target, 0, playing)
      setPlayback(target)
      logger.push({ type: 'episode', value: next.episodeName })
      void saveRoomState(room.id, { ...target, positionSec: 0, isPlaying: playing }).catch(noop)
    },
    [sendOwn, logger, room.id]
  )

  const changeMovie = useCallback(
    (next: RoomMovie, firstEpisode: RoomEpisode | null) => {
      const target = { movie: next, episode: firstEpisode }
      pendingRef.current = sendOwn('movie', target, 0, false)
      setPlayback(target)
      logger.push({ type: 'movie', value: next.title })
      void saveRoomState(room.id, { ...target, positionSec: 0, isPlaying: false }).catch(noop)
    },
    [sendOwn, logger, room.id]
  )

  /** "▶ Tiếp tục từ mm:ss" / "Xem trước một mình" — bấm tay nên trình duyệt cho phát */
  const startPlayback = useCallback(
    (positionSec: number) => {
      const cur = live.current
      const m = sendOwn('play', { movie: cur.movie, episode: cur.episode }, positionSec, true)
      applyPosition(m)
      logger.push({ type: 'play', value: formatPosition(positionSec) })
    },
    [sendOwn, applyPosition, logger]
  )

  /** Autoplay bị chặn → người dùng bấm "Bấm để vào cùng" */
  const resumeBlocked = useCallback(() => {
    const p = live.current.player
    setAutoplayBlocked(false)
    if (!p || p.isDisposed()) return
    guard.suppress('play')
    p.play()?.catch(noop)
  }, [guard])

  const sendReaction = useCallback(
    (emoji: string) => {
      const now = Date.now()
      if (now - lastReactionRef.current < REACTION_THROTTLE_MS) return
      lastReactionRef.current = now
      broadcastReaction(emoji)
      addFlying(emoji, 'bạn')
    },
    [broadcastReaction, addFlying]
  )

  // Player mới (đổi tập = player mới) → áp lệnh đang chờ
  useEffect(() => {
    if (!player || !pendingRef.current) return
    applyPosition(pendingRef.current, player)
    pendingRef.current = null
  }, [player, applyPosition])
  useEffect(() => {
    if (!isSynced) setPlayer(null)
  }, [isSynced])

  // Vừa mở phim từ trang chi tiết ("Mở trong phòng") → báo cả phòng đổi phim, khi kênh đã sẵn sàng
  const announcedRef = useRef(false)
  useEffect(() => {
    if (status !== 'live' || announcedRef.current) return
    announcedRef.current = true
    const key = `xc-open:${room.id}`
    let opened = false
    try {
      opened = sessionStorage.getItem(key) === '1'
      sessionStorage.removeItem(key)
    } catch {
      // sessionStorage bị chặn → bỏ qua
    }
    const cur = live.current
    if (opened && cur.movie) {
      sendOwn('movie', { movie: cur.movie, episode: cur.episode }, 0, false)
      logger.push({ type: 'movie', value: cur.movie.title })
    }
  }, [status, room.id, sendOwn, logger])
  useEffect(() => {
    if (status !== 'live') return
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [status])

  // Snapshot DB mỗi 10s khi mình đang phát + lúc rời trang
  useEffect(() => {
    const timer = setInterval(() => {
      const p = live.current.player
      if (p && !p.isDisposed() && !p.paused()) saveSnapshot()
    }, SNAPSHOT_MS)
    const onHide = () => {
      if (live.current.joined && live.current.movie) beaconRoomState(room.id, snapshot())
    }
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', onHide)
    }
  }, [room.id, saveSnapshot, snapshot])

  // Presence ~5s: mình đang ở đâu
  useEffect(() => {
    const track = () => {
      const s = snapshot()
      trackPresence({ positionSec: s.positionSec, isPlaying: s.isPlaying, episodeKey: s.episode?.episodeKey ?? null })
    }
    track()
    const timer = setInterval(track, PRESENCE_MS)
    return () => clearInterval(timer)
  }, [trackPresence, snapshot, status])

  return {
    playback: { movie, episode },
    detail: detailQuery.data ?? null,
    detailLoading: detailQuery.isLoading,
    detailError: detailQuery.isError,
    resolved,
    isSynced,
    player,
    setPlayer,
    seekGuard: sync.guard,
    joined,
    setJoined,
    settled,
    autoplayBlocked,
    channel,
    feedback,
    nameOf,
    changeEpisode,
    changeMovie,
    startPlayback,
    resumeBlocked,
    sendReaction
  }
}

export type RoomSession = ReturnType<typeof useRoomSession>
