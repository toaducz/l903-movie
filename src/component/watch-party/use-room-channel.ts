'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/watch-room/supabase-browser'
import { tokenRefreshDelay, tokenRetryDelay, type ControlMessage } from '@/lib/watch-room/sync'
import { mapMessageRow } from '@/lib/watch-room/room-mapper'
import {
  parseControlMessage,
  parsePresence,
  parseReaction,
  type PresenceInfo,
  type ReactionMessage
} from '@/lib/watch-room/realtime-payload'
import { fetchRealtimeToken } from '@/services/watch-room-service'
import type { RoomMessage } from '@/types/watch-room'

// Kênh Realtime private 'room:<id>': lệnh điều khiển, emoji, xin/trả trạng thái (broadcast),
// ai đang online (presence) và tin chat mới (postgres_changes). Tự nối lại + làm mới token.

export type { PresenceInfo, ReactionMessage }
export type ChannelStatus = 'connecting' | 'live' | 'reconnecting'

export type RoomChannelHandlers = {
  onControl(m: ControlMessage): void
  onReaction(m: ReactionMessage): void
  onMessage(m: RoomMessage): void
  onStateRequest(): void
  onStateReply(m: ControlMessage): void
}

type PresencePayload = Omit<PresenceInfo, 'userId' | 'displayName' | 'onlineAt'>

const MAX_BACKOFF_SEC = 15

export function useRoomChannel(
  roomId: string,
  me: { userId: string; displayName: string },
  handlers: RoomChannelHandlers
) {
  const [status, setStatus] = useState<ChannelStatus>('connecting')
  const [presence, setPresence] = useState<PresenceInfo[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const lastPresenceRef = useRef<PresencePayload | null>(null)
  // Giữ handler/me trong ref để không subscribe lại mỗi lần render
  const handlersRef = useRef(handlers)
  const meRef = useRef(me)
  useEffect(() => {
    handlersRef.current = handlers
    meRef.current = me
  })

  const broadcast = useCallback((event: string, payload: object) => {
    const channel = channelRef.current
    if (!channel || !subscribedRef.current) return
    void channel.send({ type: 'broadcast', event, payload })
  }, [])

  const sendPresence = useCallback((p: PresencePayload) => {
    const channel = channelRef.current
    if (!channel || !subscribedRef.current) return
    const { userId, displayName } = meRef.current
    void channel.track({ userId, displayName, ...p, onlineAt: Date.now() })
  }, [])

  const requestState = useCallback(() => broadcast('state_request', { by: meRef.current.userId }), [broadcast])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    let disposed = false
    let backoffSec = 1
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let tokenTimer: ReturnType<typeof setTimeout> | undefined

    let tokenFailures = 0

    // Lấy token mới + hẹn làm mới trước hạn 60s (Review Focus 3).
    // Lỗi: lúc đang nối (connect) thì để scheduleReconnect lo; lúc làm mới định kỳ thì tự thử lại có backoff.
    const refreshToken = async (retryOnFail: boolean): Promise<boolean> => {
      clearTimeout(tokenTimer)
      try {
        const { token, expiresAt } = await fetchRealtimeToken()
        if (disposed) return false
        await supabase.realtime.setAuth(token)
        tokenFailures = 0
        tokenTimer = setTimeout(() => void refreshToken(true), tokenRefreshDelay(expiresAt, Date.now()))
        return true
      } catch {
        if (!disposed && retryOnFail) {
          tokenTimer = setTimeout(() => void refreshToken(true), tokenRetryDelay(tokenFailures))
        }
        tokenFailures++
        return false
      }
    }

    const scheduleReconnect = () => {
      if (disposed) return
      setStatus('reconnecting')
      subscribedRef.current = false
      const old = channelRef.current
      channelRef.current = null
      if (old) void supabase.removeChannel(old)
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => void connect(), backoffSec * 1000)
      backoffSec = Math.min(backoffSec * 2, MAX_BACKOFF_SEC)
    }

    const connect = async () => {
      if (disposed) return
      if (!(await refreshToken(false))) return scheduleReconnect()
      if (disposed) return

      const { userId } = meRef.current
      const channel = supabase.channel(`room:${roomId.toLowerCase()}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: userId } }
      })
      channelRef.current = channel

      channel
        .on('broadcast', { event: 'control' }, ({ payload }) => {
          const m = parseControlMessage(payload)
          if (m) handlersRef.current.onControl(m)
        })
        .on('broadcast', { event: 'reaction' }, ({ payload }) => {
          const m = parseReaction(payload)
          if (m) handlersRef.current.onReaction(m)
        })
        .on('broadcast', { event: 'state_request' }, () => handlersRef.current.onStateRequest())
        .on('broadcast', { event: 'state_reply' }, ({ payload }) => {
          const m = parseControlMessage(payload)
          if (m) handlersRef.current.onStateReply(m)
        })
        .on('presence', { event: 'sync' }, () => {
          setPresence(parsePresence(channel.presenceState() as Record<string, unknown[]>))
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'watch_room_messages', filter: `room_id=eq.${roomId}` },
          ({ new: row }) => {
            const m = mapMessageRow(row)
            if (m) handlersRef.current.onMessage(m)
          }
        )
        .subscribe(state => {
          if (disposed || channelRef.current !== channel) return
          if (state === 'SUBSCRIBED') {
            backoffSec = 1
            subscribedRef.current = true
            setStatus('live')
            if (lastPresenceRef.current) sendPresence(lastPresenceRef.current)
            // Vừa vào / vừa nối lại → xin trạng thái mới nhất của người khác
            requestState()
          } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
            scheduleReconnect()
          }
        })
    }

    // Tab ẩn / máy ngủ rồi quay lại → hỏi trạng thái mới nhất (Review Focus 4)
    const onVisible = () => {
      if (document.visibilityState === 'visible') requestState()
    }
    document.addEventListener('visibilitychange', onVisible)
    void connect()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      clearTimeout(tokenTimer)
      document.removeEventListener('visibilitychange', onVisible)
      subscribedRef.current = false
      const channel = channelRef.current
      channelRef.current = null
      if (channel) void supabase.removeChannel(channel)
    }
  }, [roomId, requestState, sendPresence])

  const sendControl = useCallback((m: ControlMessage) => broadcast('control', m), [broadcast])
  const replyState = useCallback((m: ControlMessage) => broadcast('state_reply', m), [broadcast])
  const sendReaction = useCallback(
    (emoji: string) => {
      const { userId, displayName } = meRef.current
      broadcast('reaction', { emoji, by: userId, displayName })
    },
    [broadcast]
  )
  const trackPresence = useCallback(
    (p: PresencePayload) => {
      lastPresenceRef.current = p
      sendPresence(p)
    },
    [sendPresence]
  )

  return { status, presence, sendControl, sendReaction, requestState, replyState, trackPresence }
}
