'use client'

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import BottomSheet from '@/component/watched/bottom-sheet'
import { useIsMobile } from '@/component/watched/use-is-mobile'
import XcIcon from './xc-icon'

// Khung popup chung của "Xem chung": modal ở desktop (khoá cuộn, Esc, giữ focus, trả focus) / bottom sheet ở mobile

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

type Props = {
  label: string
  onClose: () => void
  children: ReactNode
  width?: number
  /** màu bóng cứng của modal: pink (mặc định) / yel */
  tone?: 'pink' | 'yel'
}

export default function XcDialog({ label, onClose, children, width = 520, tone = 'pink' }: Props) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isMobile) return
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [isMobile])

  if (isMobile) {
    return (
      <BottomSheet label={label} onClose={onClose}>
        <div className='flex flex-col gap-[18px]'>{children}</div>
      </BottomSheet>
    )
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!nodes.length) return
    const [first, last] = [nodes[0], nodes[nodes.length - 1]]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const style: CSSProperties = {
    width,
    boxShadow: `12px 12px 0 var(--c-${tone})`,
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  }
  return (
    <div className='dx-backdrop' onClick={onClose}>
      <div
        ref={panelRef}
        className='dx-md'
        style={style}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <button type='button' className='dx-md-x' aria-label='Đóng' onClick={onClose}>
          <XcIcon name='x' size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
