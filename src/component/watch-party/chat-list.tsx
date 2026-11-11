'use client'

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { buildChatItems, linkify } from '@/lib/watch-room/chat-format'
import type { RoomMessage } from '@/types/watch-room'
import Avatar, { nameColor } from './avatar'
import XcIcon, { type XcIconName } from './xc-icon'
import type { PendingMessage } from './use-room-chat'

// Danh sách chat: phân cách ngày, dòng sự kiện, nhóm tin cùng người; tự dính đáy khi đang ở đáy

const STICK_BOTTOM_PX = 80
const LOAD_OLDER_PX = 60

type Props = {
  messages: RoomMessage[]
  pending: PendingMessage[]
  myId: string
  nameOf: (userId: string) => string
  hasMore: boolean
  loading: boolean
  loadError: boolean
  onLoadOlder: () => void
  onReload: () => void
  onRetry: (tempId: number) => void
}

const EVENT_ICON: Record<string, XcIconName> = {
  play: 'play',
  pause: 'pause',
  seek: 'next',
  episode: 'sync',
  movie: 'sync',
  join: 'users',
  leave: 'users',
  rename: 'info',
  create: 'plus'
}

function eventText(m: RoomMessage, count: number): string {
  const v = m.event?.value
  const verb: Record<string, string> = {
    play: v ? `tiếp tục phát · ${v}` : 'tiếp tục phát',
    pause: v ? `tạm dừng · ${v}` : 'tạm dừng',
    seek: `tua tới ${v ?? ''}`,
    episode: `đổi sang ${v ?? 'tập khác'}`,
    movie: `đổi phim: ${v ?? ''}`,
    join: 'đã vào phòng',
    leave: 'đã rời phòng',
    rename: 'đổi tên phòng',
    create: 'tạo phòng'
  }
  const text = verb[m.event?.type ?? ''] ?? 'làm gì đó'
  return count > 1 ? `${text} (×${count})` : text
}

const clock = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Nội dung tin: text node + link (không bao giờ chèn HTML) */
function MessageText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((part, i) =>
        part.kind === 'link' ? (
          <a key={i} href={part.href} target='_blank' rel='noopener noreferrer'>
            {part.value}
          </a>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        )
      )}
    </>
  )
}

export default function ChatList(props: Props) {
  const { messages, pending, myId, nameOf, hasMore, loading, loadError, onLoadOlder, onReload, onRetry } = props
  const listRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const prevHeight = useRef<number | null>(null)
  const items = useMemo(() => buildChatItems(messages, myId, new Date()), [messages, myId])

  // Tải tin cũ → giữ nguyên chỗ đang đọc; tin mới → dính đáy nếu đang ở đáy
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (prevHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeight.current
      prevHeight.current = null
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [items, pending])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [loading])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_BOTTOM_PX
    if (el.scrollTop < LOAD_OLDER_PX && hasMore && prevHeight.current === null) {
      prevHeight.current = el.scrollHeight
      onLoadOlder()
    }
  }

  return (
    <div ref={listRef} className='xc-chat' onScroll={onScroll} role='log' aria-label='Tin nhắn trong phòng'>
      {hasMore && <div className='xc-ev'>Cuộn lên để xem tin cũ hơn</div>}
      {loading && <div className='xc-ev'>Đang tải tin nhắn…</div>}
      {loadError && (
        <button type='button' className='xc-ev underline' onClick={onReload}>
          Không tải được tin nhắn · thử lại
        </button>
      )}
      {items.map((item, i) => {
        if (item.kind === 'day') {
          return (
            <div key={`d-${i}`} className='xc-dv'>
              {item.label}
            </div>
          )
        }
        if (item.kind === 'event') {
          const m = item.message
          return (
            <div key={m.id} className='xc-ev'>
              <XcIcon name={EVENT_ICON[m.event?.type ?? ''] ?? 'info'} size={11} strokeWidth={2.8} />
              <span>
                <b>{nameOf(m.userId)}</b> {eventText(m, item.count)}
              </span>
            </div>
          )
        }
        const last = item.messages[item.messages.length - 1]
        const name = nameOf(item.userId)
        return (
          <div key={item.messages[0].id} className={`xc-msg ${item.mine ? 'me' : ''}`}>
            {!item.mine && <Avatar userId={item.userId} name={name} size={28} />}
            <div className='xc-mb'>
              {!item.mine && (
                <span className='xc-mn' style={{ color: nameColor(item.userId) }}>
                  {name}
                </span>
              )}
              {item.messages.map(m => (
                <div key={m.id} className='xc-bub'>
                  <MessageText text={m.text ?? ''} />
                </div>
              ))}
              <span className='xc-mt'>{clock(last.createdAt)}</span>
            </div>
          </div>
        )
      })}
      {pending.map(p => (
        <div key={`p-${p.tempId}`} className='xc-msg me'>
          <div className='xc-mb'>
            <div className={`xc-bub ${p.status === 'sending' ? 'sending' : ''}`}>
              <MessageText text={p.text} />
            </div>
            {p.status === 'sending' ? (
              <span className='xc-mt'>đang gửi</span>
            ) : (
              <button type='button' className='dx-b dx-b-txt !h-7 !px-1 !text-xs' onClick={() => onRetry(p.tempId)}>
                <XcIcon name='warn' size={12} />
                Gửi lại
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
