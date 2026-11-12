'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { MESSAGE_MAX } from '@/lib/watch-room/validation'
import { pruneBubbles, pushBubbles, type Bubble } from '@/lib/watch-room/fs-bubbles'
import type { RoomMessage } from '@/types/watch-room'
import Avatar, { nameColor } from './avatar'
import type { PendingMessage } from './use-room-chat'

// Chat khi khung phòng đang toàn màn hình: bong bóng tin mới góc dưới-trái + Enter mở ô gõ nhanh

type Props = {
  hostRef: RefObject<HTMLElement | null>
  messages: RoomMessage[]
  pending: PendingMessage[]
  nameOf: (userId: string) => string
  onSend: (text: string) => boolean
}

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export default function FsChat({ hostRef, messages, pending, nameOf, onSend }: Props) {
  const [active, setActive] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const seen = useRef(new Set<string>())
  // Chỉ báo lỗi của tin gửi từ ô này, không phải lỗi cũ còn treo trong khung chat
  const errorFloor = useRef(0)

  useEffect(() => {
    const sync = () => {
      const on = !!hostRef.current && document.fullscreenElement === hostRef.current
      setActive(on)
      if (!on) {
        setBubbles([])
        setTyping(false)
      }
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [hostRef])

  // Tin có trước lúc vào fullscreen chỉ đánh dấu đã thấy, không phát lại
  useEffect(() => {
    const fresh = messages.filter(m => !seen.current.has(m.id))
    fresh.forEach(m => seen.current.add(m.id))
    if (active && fresh.length) setBubbles(list => pushBubbles(list, fresh, Date.now()))
  }, [messages, active])

  useEffect(() => {
    if (!bubbles.length) return
    const wait = Math.max(0, Math.min(...bubbles.map(b => b.expiresAt)) - Date.now())
    const t = setTimeout(() => setBubbles(list => pruneBubbles(list, Date.now())), wait)
    return () => clearTimeout(t)
  }, [bubbles])

  useEffect(() => {
    if (!active || typing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || isTypingTarget(e.target)) return
      // chặn Enter "bấm" luôn nút control bar đang focus
      e.preventDefault()
      errorFloor.current = Math.max(0, ...pending.map(p => p.tempId))
      setTyping(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, typing, pending])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setTyping(false)
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (onSend(text)) setText('')
    }
  }

  if (!active) return null
  const error = pending.findLast(p => p.status === 'error' && p.tempId > errorFloor.current)?.error

  return (
    <div className='xc-fsc'>
      <ul className='xc-fsb-list' aria-live='polite'>
        {bubbles.map(b => {
          const name = nameOf(b.userId)
          return (
            <li key={b.id} className='xc-fsb'>
              <Avatar userId={b.userId} name={name} size={28} />
              <div className='min-w-0'>
                <b style={{ color: nameColor(b.userId) }}>{name}</b>
                <p>{b.text}</p>
              </div>
            </li>
          )
        })}
      </ul>
      {typing && (
        <div className='xc-fsi'>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MESSAGE_MAX}
            placeholder='Nhắn gì đó… (Esc để đóng)'
            aria-label='Nhắn tin khi đang xem toàn màn hình'
          />
          {error && (
            <small role='alert' className='xc-fse'>
              {error}
            </small>
          )}
        </div>
      )}
    </div>
  )
}
