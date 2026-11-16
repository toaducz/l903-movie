'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { MESSAGE_MAX } from '@/lib/watch-room/validation'
import { pruneBubbles, pushBubbles, type Bubble } from '@/lib/watch-room/fs-bubbles'
import { escapeAction, FS_CHAT_IDLE_CLOSE_MS } from '@/lib/watch-room/fs-chat-keys'
import type { RoomMessage } from '@/types/watch-room'
import Avatar, { nameColor } from './avatar'
import XcIcon from './xc-icon'
import type { PendingMessage } from './use-room-chat'

// Chat khi khung phòng đang toàn màn hình: bong bóng tin mới góc dưới-trái + Enter mở ô gõ nhanh

type Props = {
  hostRef: RefObject<HTMLElement | null>
  messages: RoomMessage[]
  pending: PendingMessage[]
  nameOf: (userId: string) => string
  onSend: (text: string) => boolean
}

// Keyboard Lock API chỉ có trên Chromium nên lib.dom chưa khai báo
type KeyboardLock = { lock: (keys?: string[]) => Promise<void>; unlock: () => void }

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export default function FsChat({ hostRef, messages, pending, nameOf, onSend }: Props) {
  const [active, setActive] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  // Vừa gửi xong mà chưa gõ lại → được tự đóng ô sau FS_CHAT_IDLE_CLOSE_MS
  const [idleArmed, setIdleArmed] = useState(false)
  const inputBox = useRef<HTMLDivElement>(null)
  const escLocked = useRef(false)
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

  const closeInput = () => {
    setTyping(false)
    setIdleArmed(false)
  }

  // Chrome/Edge: lock Esc để Esc đầu tiên chỉ đóng ô gõ; giữ Esc vẫn thoát fullscreen (mặc định của trình duyệt)
  useEffect(() => {
    const kb = (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard
    if (!active || typeof kb?.lock !== 'function') return
    let live = true
    ;(async () => {
      try {
        await kb.lock(['Escape'])
        if (live) escLocked.current = true
      } catch {
        // lock bị từ chối (iframe, quyền…) → Esc giữ hành vi mặc định của trình duyệt
      }
    })()
    return () => {
      live = false
      escLocked.current = false
      try {
        kb.unlock()
      } catch {
        // đã thoát fullscreen thì lock cũng tự hết, không còn gì để mở
      }
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const action = escapeAction({ typing, escLocked: escLocked.current })
      if (action === 'none') return
      e.preventDefault()
      if (action === 'close-input') closeInput()
      else document.exitFullscreen().catch(() => {})
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, typing])

  useEffect(() => {
    if (!typing) return
    const onDown = (e: PointerEvent) => {
      if (!inputBox.current?.contains(e.target as Node)) closeInput()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [typing])

  useEffect(() => {
    if (!typing || !idleArmed || text) return
    const t = setTimeout(closeInput, FS_CHAT_IDLE_CLOSE_MS)
    return () => clearTimeout(t)
  }, [typing, idleArmed, text])

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
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (onSend(text)) {
        setText('')
        setIdleArmed(true)
      }
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
        <div ref={inputBox} className='xc-fsi'>
          <div className='xc-fsi-row'>
            <input
              autoFocus
              value={text}
              onChange={e => {
                setText(e.target.value)
                setIdleArmed(false)
              }}
              onKeyDown={onKeyDown}
              maxLength={MESSAGE_MAX}
              placeholder='Nhắn gì đó… (Esc để đóng)'
              aria-label='Nhắn tin khi đang xem toàn màn hình'
            />
            <button type='button' className='xc-fsi-x' onClick={closeInput} aria-label='Đóng ô chat'>
              <XcIcon name='x' size={16} />
            </button>
          </div>
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
