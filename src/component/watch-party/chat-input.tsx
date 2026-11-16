'use client'

import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { MESSAGE_MAX } from '@/lib/watch-room/validation'
import XcIcon from './xc-icon'
import EmojiPopover from './emoji-popover'

// Ô nhập chat: Enter gửi, Shift+Enter xuống dòng (bỏ qua khi đang gõ dấu IME), tối đa 500 ký tự

type Props = {
  disabled: boolean
  onSend: (text: string) => boolean
  onReaction: (emoji: string) => void
}

export default function ChatInput({ disabled, onSend, onReaction }: Props) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiBtn = useRef<HTMLButtonElement>(null)
  const closeEmoji = useCallback(() => setEmojiOpen(false), [])

  const submit = () => {
    if (disabled) return
    if (onSend(text)) setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    submit()
  }

  return (
    <div className='xc-cmp'>
      {emojiOpen && <EmojiPopover onPick={onReaction} onClose={closeEmoji} anchorRef={emojiBtn} />}
      <button
        ref={emojiBtn}
        type='button'
        className={`xc-ib i44 xc-emo-btn ${emojiOpen ? 'act' : ''}`}
        aria-label='Thả cảm xúc lên video'
        aria-expanded={emojiOpen}
        onClick={() => setEmojiOpen(v => !v)}
      >
        <XcIcon name='smile' size={20} strokeWidth={2.2} />
      </button>
      <textarea
        className='xc-inp'
        rows={1}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={disabled ? 'Đang nối lại…' : 'Nhắn gì đó…'}
        aria-label='Tin nhắn'
        maxLength={MESSAGE_MAX}
        disabled={disabled}
      />
      <button type='button' className='xc-ib i44' aria-disabled='true' aria-label='Voice chat — sắp có'>
        <XcIcon name='mic' size={18} strokeWidth={2.2} />
        <span className='xc-tp'>Sắp có</span>
      </button>
      <button
        type='button'
        className='xc-ib i44 snd'
        aria-label='Gửi'
        onClick={submit}
        disabled={disabled || !text.trim()}
      >
        <XcIcon name='send' size={18} />
      </button>
    </div>
  )
}
