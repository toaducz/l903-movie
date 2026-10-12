'use client'

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

const SWIPE_CLOSE_PX = 80
const FOCUSABLE = 'button:not([disabled]), a[href], select, [tabindex]:not([tabindex="-1"])'

type Props = {
  label: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet mobile (thao tác thẻ ⋯, bộ lọc): khoá cuộn, Esc / vuốt xuống / bấm nền để đóng, giữ focus bên trong */
export default function BottomSheet({ label, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const touchY = useRef<number | null>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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

  return (
    <div className='dx-backdrop dx-sheet-wrap' onClick={onClose}>
      <div
        ref={panelRef}
        className='dx-sheet'
        style={{ gap: 6 }}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        onTouchStart={e => {
          touchY.current = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null
        }}
        onTouchEnd={e => {
          if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > SWIPE_CLOSE_PX) onClose()
          touchY.current = null
        }}
      >
        <div className='dx-handle' />
        {children}
      </div>
    </div>
  )
}
