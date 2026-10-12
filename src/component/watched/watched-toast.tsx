'use client'

import { useEffect, useRef } from 'react'
import WatchedIcon, { type WatchedIconName } from './watched-icon'

export type WatchedToastVariant = 'move' | 'delete' | 'saved' | 'undone' | 'error'

export type WatchedToastData = {
  id: number
  variant: WatchedToastVariant
  title: string
  sub?: string
  onUndo?: () => void
}

const ICONS: Record<WatchedToastVariant, WatchedIconName> = {
  move: 'check',
  delete: 'trash',
  saved: 'star',
  undone: 'undo',
  error: 'warn'
}

const UNDONE_HIDE_MS = 2000
const SWIPE_DISMISS_PX = 80

type Props = {
  toast: WatchedToastData | null
  onDismiss: (id: number) => void
}

// Chỉ 1 toast một lúc — toast mới thay toast cũ (key theo id để chạy lại animation)
export default function WatchedToast({ toast, onDismiss }: Props) {
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    if (toast?.variant !== 'undone') return
    const timer = setTimeout(() => onDismiss(toast.id), UNDONE_HIDE_MS)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  const isDanger = toast.variant === 'delete' || toast.variant === 'error'
  const hasBar = toast.variant !== 'undone'

  const handleUndo = () => {
    onDismiss(toast.id)
    toast.onUndo?.()
  }

  return (
    <div className='dx-toast-wrap' role='status' aria-live='polite'>
      <div
        key={toast.id}
        className={`dx-toast ${isDanger ? 'del' : ''}`}
        onTouchStart={e => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX.current !== null && Math.abs(e.changedTouches[0].clientX - touchX.current) > SWIPE_DISMISS_PX) {
            onDismiss(toast.id)
          }
          touchX.current = null
        }}
      >
        <span className='dx-t-ic'>
          <WatchedIcon name={ICONS[toast.variant]} size={18} strokeWidth={2.8} />
        </span>
        <div className='flex-1 min-w-0'>
          <b className='block text-sm font-extrabold'>{toast.title}</b>
          {toast.sub && <span className='block text-xs text-[var(--c-dim)] truncate'>{toast.sub}</span>}
        </div>
        {toast.onUndo && (
          <button type='button' className='dx-t-undo' onClick={handleUndo}>
            Hoàn tác
          </button>
        )}
        <button type='button' className='dx-t-x' aria-label='Đóng' onClick={() => onDismiss(toast.id)}>
          <WatchedIcon name='x' size={16} />
        </button>
        {hasBar && <i className='dx-t-bar' onAnimationEnd={() => onDismiss(toast.id)} />}
      </div>
    </div>
  )
}
