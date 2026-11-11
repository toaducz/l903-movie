'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomMember } from '@/types/watch-room'
import { useIsMobile } from '@/component/watched/use-is-mobile'
import { AvatarStack } from './avatar'
import XcDialog from './xc-dialog'
import XcIcon from './xc-icon'

// Popup mời: link /moi/<token> + Copy (2s "✓ Đã copy"), mobile thêm "Chia sẻ qua…" nếu trình duyệt hỗ trợ

const COPIED_MS = 2000

export const inviteUrlOf = (token: string) =>
  typeof window === 'undefined' ? `/moi/${token}` : `${window.location.origin}/moi/${token}`

/** Copy vào clipboard, trả trạng thái copied trong 2s */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      setCopied(false)
    }
  }, [])
  return { copied, copy }
}

type Props = {
  roomName: string
  inviteToken: string
  members: RoomMember[]
  isNew: boolean
  onClose: () => void
}

export default function InviteDialog({ roomName, inviteToken, members, isNew, onClose }: Props) {
  const isMobile = useIsMobile()
  const url = inviteUrlOf(inviteToken)
  const { copied, copy } = useCopy()
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const share = () => {
    navigator.share?.({ title: `Vào phòng ${roomName}`, url }).catch(() => undefined)
  }

  const copyBtn = copied ? (
    <button type='button' className='dx-b xc-b-cy dx-b-sm' onClick={() => copy(url)} aria-label='Copy link mời'>
      <XcIcon name='check' size={16} strokeWidth={3} />
      Đã copy
    </button>
  ) : (
    <button
      type='button'
      className='dx-b dx-b-pri dx-b-sm'
      style={{ boxShadow: '3px 3px 0 var(--c-yel)' }}
      onClick={() => copy(url)}
      aria-label='Copy link mời'
      data-autofocus
    >
      <XcIcon name='copy' size={16} />
      Copy
    </button>
  )

  return (
    <XcDialog label='Mời vào phòng' onClose={onClose} width={460} tone='yel'>
      <div className={isMobile ? '' : 'pr-11'}>
        <span className={`c-sticker ${isNew ? 'pink' : ''}`}>{isNew ? 'PHÒNG MỚI!' : 'MỜI BẠN'}</span>
        <h3 className='mt-2 mb-0.5 text-[22px] font-black tracking-[-0.03em] leading-[1.15]'>
          {isNew ? 'Xong! Giờ rủ bạn vào ' : 'Mời vào '}
          <span className='text-[var(--c-yel)]'>{roomName}</span>
        </h3>
        <div className='text-[13px] text-[var(--c-dim)]'>
          Ai đã đăng nhập bấm link là vào phòng luôn, không cần duyệt.
        </div>
      </div>

      <div className={`xc-lk ${copied ? 'ok' : ''}`}>
        <XcIcon name='link' size={16} />
        <span className='u' aria-label='Link mời'>
          {url.replace(/^https?:\/\//, '')}
        </span>
        {!isMobile && copyBtn}
      </div>
      <span className='sr-only' aria-live='polite'>
        {copied ? 'Đã copy link mời' : ''}
      </span>

      <div className='xc-warnl'>
        <XcIcon name='lock' size={16} strokeWidth={2.2} />
        <div>
          <b>Ai có link đều vào được.</b> Chỉ gửi cho người bạn muốn rủ.
        </div>
      </div>

      {isMobile ? (
        <div className='flex flex-col gap-2.5'>
          <button
            type='button'
            className={`dx-b w-full !h-[52px] ${copied ? 'xc-b-cy' : 'dx-b-pri'}`}
            onClick={() => copy(url)}
          >
            <XcIcon name={copied ? 'check' : 'copy'} size={16} />
            {copied ? 'Đã copy link' : 'Copy link'}
          </button>
          {canShare && (
            <button type='button' className='dx-b dx-b-gh w-full !h-[52px]' onClick={share}>
              <XcIcon name='share' size={16} />
              Chia sẻ qua…
            </button>
          )}
        </div>
      ) : (
        <div className='flex gap-3.5 items-center'>
          <AvatarStack size={26} people={members.map(m => ({ userId: m.userId, name: m.displayName }))} />
          <span className='text-xs text-[var(--c-dim)]'>
            {members.length > 1 ? `${members.length} thành viên` : 'Mới có mình bạn'}
          </span>
          <span className='flex-1' />
          <button type='button' className='dx-b dx-b-gh dx-b-sm' onClick={onClose}>
            Xong
          </button>
        </div>
      )}
    </XcDialog>
  )
}
