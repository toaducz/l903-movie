'use client'

import { useEffect, useRef } from 'react'
import { REACTION_EMOJIS } from '@/lib/watch-room/realtime-payload'

// Popover 6 cảm xúc trên ô nhập (desktop) — giữ mở để thả liên tục; Esc / bấm ngoài để đóng

type Props = { onPick: (emoji: string) => void; onClose: () => void; anchorRef: React.RefObject<HTMLElement | null> }

export default function EmojiPopover({ onPick, onClose, anchorRef }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        anchorRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [onClose, anchorRef])

  return (
    <div ref={ref} className='xc-rx' role='menu' aria-label='Thả cảm xúc'>
      {REACTION_EMOJIS.map(e => (
        <button
          key={e}
          type='button'
          role='menuitem'
          className='xc-rxb'
          aria-label={`Thả ${e}`}
          onClick={() => onPick(e)}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

/** Thanh emoji nhanh trên mobile (ngay trên ô nhập) */
export function EmojiQuickBar({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className='xc-qb' role='toolbar' aria-label='Thả cảm xúc'>
      {REACTION_EMOJIS.map(e => (
        <button key={e} type='button' className='xc-rxb' aria-label={`Thả ${e}`} onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  )
}
