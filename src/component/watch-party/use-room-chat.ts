'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getRoomMessages, sendRoomMessage } from '@/services/watch-room-service'
import { parseMessageText } from '@/lib/watch-room/validation'
import type { RoomMessage } from '@/types/watch-room'

// Chat của phòng: lịch sử (50 tin/trang, cuộn lên tải thêm), tin mới realtime, gửi lạc quan + gửi lại khi lỗi

export type PendingMessage = { tempId: number; text: string; status: 'sending' | 'error' }

export function useRoomChat(roomId: string) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [pending, setPending] = useState<PendingMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const loadingOlder = useRef(false)
  const seq = useRef(0)

  /** Gộp tin mới vào danh sách, bỏ trùng theo id (realtime + phản hồi POST có thể về cùng lúc) */
  const addMessages = useCallback((incoming: RoomMessage[]) => {
    setMessages(list => {
      const ids = new Set(list.map(m => m.id))
      const fresh = incoming.filter(m => !ids.has(m.id))
      return fresh.length ? [...list, ...fresh] : list
    })
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const page = await getRoomMessages(roomId)
      addMessages(page.data)
      setHasMore(page.hasMore)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [roomId, addMessages])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  /** Nối lại realtime → postgres_changes không phát lại tin bị lỡ: tải trang mới nhất rồi gộp (bỏ trùng theo id) */
  const catchUp = useCallback(async () => {
    try {
      addMessages((await getRoomMessages(roomId)).data)
    } catch {
      // lần nối lại sau sẽ thử tiếp
    }
  }, [roomId, addMessages])

  const loadOlder = useCallback(async () => {
    if (loadingOlder.current || !hasMore) return
    const oldest = messages.reduce<string | null>(
      (min, m) => (min === null || m.createdAt < min ? m.createdAt : min),
      null
    )
    if (!oldest) return
    loadingOlder.current = true
    try {
      const page = await getRoomMessages(roomId, oldest)
      addMessages(page.data)
      setHasMore(page.hasMore)
    } catch {
      // thử lại ở lần cuộn sau
    } finally {
      loadingOlder.current = false
    }
  }, [roomId, messages, hasMore, addMessages])

  const deliver = useCallback(
    async (tempId: number, text: string) => {
      setPending(list => list.map(p => (p.tempId === tempId ? { ...p, status: 'sending' } : p)))
      try {
        const saved = await sendRoomMessage(roomId, text)
        addMessages([saved])
        setPending(list => list.filter(p => p.tempId !== tempId))
      } catch {
        setPending(list => list.map(p => (p.tempId === tempId ? { ...p, status: 'error' } : p)))
      }
    },
    [roomId, addMessages]
  )

  /** Trả về false nếu tin không hợp lệ (rỗng / quá 500 ký tự) */
  const send = useCallback(
    (raw: string): boolean => {
      const parsed = parseMessageText(raw)
      if (!parsed.ok) return false
      const tempId = ++seq.current
      setPending(list => [...list, { tempId, text: parsed.value, status: 'sending' }])
      void deliver(tempId, parsed.value)
      return true
    },
    [deliver]
  )

  const retry = useCallback(
    (tempId: number) => {
      const item = pending.find(p => p.tempId === tempId)
      if (item) void deliver(tempId, item.text)
    },
    [pending, deliver]
  )

  return {
    messages,
    pending,
    hasMore,
    loading,
    loadError,
    reload: loadInitial,
    catchUp,
    loadOlder,
    addMessages,
    send,
    retry
  }
}
