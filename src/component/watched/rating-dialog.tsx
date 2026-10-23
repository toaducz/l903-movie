'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import WatchedIcon from './watched-icon'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useAuth } from '@/providers/auth-provider'
import { saveWatched } from '@/services/watched-service'
import { WATCHED_NOTE_MAX } from '@/lib/watched-validation'
import type { WatchedMovie, WatchedUpsertInput } from '@/types/watched'

export const SCORE_LABELS = ['Chọn số sao', 'Phí thời gian', 'Tạm được', 'Ổn áp', 'Hay đấy', 'Phải xem!'] as const
const NOTE_WARN_AT = 180
const SWIPE_CLOSE_PX = 80

export type RatingTarget = {
  input: WatchedUpsertInput // snapshot phim (slug, nguồn, tên, ảnh…)
  mode: 'new' | 'edit'
  initialScore: number | null
  initialNote: string
  meta?: string // dòng phụ dưới tên phim, vd "2021 · Hàn Quốc · 12 tập"
}

type Props = {
  target: RatingTarget
  onClose: () => void
  onSaved: (movie: WatchedMovie) => void
  onDelete: () => void
}

type Status = 'idle' | 'saving' | 'error'

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

export default function RatingDialog({ target, onClose, onSaved, onDelete }: Props) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const isEdit = target.mode === 'edit'
  const [rating, setRating] = useState(target.initialScore ?? 0)
  const [hover, setHover] = useState(0)
  const [note, setNote] = useState(target.initialNote)
  const [status, setStatus] = useState<Status>('idle')
  const panelRef = useRef<HTMLDivElement>(null)
  const touchY = useRef<number | null>(null)
  const saving = status === 'saving'

  // Khoá cuộn trang + trả focus về nút đã mở popup khi đóng
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panelRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')
    first?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  const save = async () => {
    if (!rating || saving) return
    setStatus('saving')
    try {
      // 1. Save score to watched_movies
      const movie = await saveWatched({ ...target.input, score: rating })
      
      const trimmedNote = note.trim()

      // 2. Đồng bộ note với movie_reviews
      if (trimmedNote) {
        await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: target.input.slug,
            name: target.input.name,
            image: target.input.image || '',
            score: rating,
            review_text: trimmedNote,
            user_email: user?.email,
            parent_id: null,
            watched_movie_id: movie.id
          })
        })
      } else if (target.initialNote) {
        // Nếu trước đó đã có ghi chú nhưng nay xóa trắng -> xóa review gốc tương ứng
        await fetch(`/api/review?slug=${target.input.slug}`, {
          method: 'DELETE'
        })
      }
      
      onSaved({ ...movie, note: trimmedNote || null })
    } catch {
      setStatus('error')
    }
  }

  // Bỏ qua (mới) = vẫn đánh dấu đã xem, không chấm · Huỷ (sửa) = đóng, không đổi gì
  const dismiss = () => {
    if (!saving) onClose()
  }

  const toggleStar = (value: number) => setRating(prev => (prev === value ? 0 : value))

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const inTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA'
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss()
      return
    }
    if (e.key === 'Tab') {
      const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (!nodes.length) return
      const [firstNode, lastNode] = [nodes[0], nodes[nodes.length - 1]]
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
      return
    }
    if (inTextarea || saving) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = Math.min(5, Math.max(1, (rating || 0) + (e.key === 'ArrowRight' ? 1 : -1)))
      setRating(next)
      panelRef.current?.querySelector<HTMLElement>(`[data-star="${next}"]`)?.focus()
    } else if (e.key === 'Enter' && (e.target as HTMLElement).getAttribute('role') === 'radio') {
      e.preventDefault()
      save()
    }
  }

  const shown = hover || rating
  const sticker = isEdit ? 'SỬA ĐIỂM' : 'XEM XONG!'

  const header = (
    <div className='flex gap-4 items-center' style={{ paddingRight: isMobile ? 0 : 44 }}>
      <div
        className='relative w-[72px] shrink-0 aspect-[2/3] rounded-[10px] overflow-hidden border border-[var(--c-line)] bg-[var(--c-bg-2)]'
        style={{ transform: 'rotate(-3deg)', boxShadow: '4px 4px 0 var(--c-yel)' }}
      >
        {target.input.image && (
          <Image src={target.input.image} alt='' fill sizes='72px' className='object-cover' unoptimized />
        )}
      </div>
      <div className='min-w-0'>
        <span className={`c-sticker ${isEdit ? 'cyan' : ''}`}>{sticker}</span>
        <h3 id='dx-rating-title' className='mt-2 mb-0.5 text-[22px] font-black tracking-[-0.03em] leading-[1.15]'>
          {target.input.name}
        </h3>
        {target.meta && <div className='text-xs text-[var(--c-dim)]'>{target.meta}</div>}
        <div className='inline-flex gap-1.5 items-center text-xs font-semibold text-[var(--c-cyan)] mt-1.5'>
          <WatchedIcon name='lock' size={13} />
          Điểm & bình luận chỉ mình bạn thấy nếu không public
        </div>
      </div>
    </div>
  )

  const stars = (
    <div className={saving ? 'dx-dis' : ''}>
      <div className='dx-stars' role='radiogroup' aria-label='Số sao' onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(v => {
          const cls = [
            !hover && v <= rating ? 'on' : '',
            hover && v <= hover ? 'pv' : '',
            hover === v ? 'cur' : ''
          ].join(' ')
          return (
            <button
              key={v}
              type='button'
              role='radio'
              aria-checked={rating === v}
              aria-label={`${v} sao – ${SCORE_LABELS[v]}`}
              tabIndex={(rating || 1) === v ? 0 : -1}
              data-star={v}
              className={`dx-star ${cls}`}
              onMouseEnter={() => setHover(v)}
              onClick={() => toggleStar(v)}
            >
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M12 2.8l2.85 5.78 6.37.93-4.61 4.49 1.09 6.35L12 17.35l-5.7 3 1.09-6.35-4.61-4.49 6.37-.93z' />
              </svg>
            </button>
          )
        })}
        <span className={`dx-slab l${shown} ${hover ? 'ghost' : ''}`} aria-hidden='true'>
          {shown ? `${shown}★ · ${SCORE_LABELS[shown]}` : SCORE_LABELS[0]}
        </span>
      </div>
    </div>
  )

  const noteField = (
    <div className={saving ? 'dx-dis' : ''}>
      <label htmlFor='dx-note' className='text-[13px] font-bold mb-2 flex justify-between'>
        Ghi chú cho bản thân <span className='text-[var(--c-faint)] font-medium'>không bắt buộc</span>
      </label>
      <div className='dx-ta'>
        <textarea
          id='dx-note'
          maxLength={WATCHED_NOTE_MAX}
          placeholder='VD: Hàn chữa lành, đoạn đầu hơi chậm'
          value={note}
          disabled={saving}
          onChange={e => setNote(e.target.value)}
        />
        <span className={`dx-cnt ${note.length >= NOTE_WARN_AT ? 'warn' : ''}`}>
          {note.length}/{WATCHED_NOTE_MAX}
        </span>
      </div>
    </div>
  )

  const errorBox = status === 'error' && (
    <div className='dx-err' role='alert'>
      <WatchedIcon name='warn' size={18} strokeWidth={2.2} className='shrink-0 mt-px text-[var(--c-orange)]' />
      <div>
        <b className='text-white'>Chưa lưu được — mạng đang chập chờn.</b>
        <br />
        Điểm và ghi chú vẫn còn nguyên, bấm &quot;Thử lại&quot; nhé.
      </div>
    </div>
  )

  const saveBtn = (
    <button
      type='button'
      className={`dx-b dx-b-pri ${!rating && !saving ? 'dx-b-dis' : ''} ${isMobile ? 'w-full !h-[52px]' : ''}`}
      style={saving ? { opacity: 0.85, pointerEvents: 'none' } : undefined}
      disabled={!rating || saving}
      onClick={save}
    >
      {saving ? (
        <>
          <span className='dx-spin' />
          Đang lưu…
        </>
      ) : status === 'error' ? (
        'Thử lại'
      ) : (
        'Lưu'
      )}
    </button>
  )
  const skipBtn = (
    <button
      type='button'
      className={`dx-b dx-b-gh ${saving ? 'dx-b-dis' : ''} ${isMobile ? 'w-full !h-[52px]' : ''}`}
      disabled={saving}
      onClick={dismiss}
    >
      {isEdit ? 'Huỷ' : 'Bỏ qua'}
    </button>
  )
  const deleteBtn = isEdit && (
    <button
      type='button'
      className={`dx-b dx-b-txt ${saving ? 'dx-b-dis' : ''} ${isMobile ? '!h-12' : ''}`}
      disabled={saving}
      onClick={onDelete}
    >
      <WatchedIcon name='trash' size={16} />
      Xoá khỏi Đã xem
    </button>
  )

  const dialogProps = {
    ref: panelRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'dx-rating-title',
    onKeyDown: handleKeyDown
  } as const

  if (isMobile) {
    return (
      <div className='dx-backdrop dx-sheet-wrap' onClick={dismiss}>
        <div
          {...dialogProps}
          className='dx-sheet'
          onClick={e => e.stopPropagation()}
          onTouchStart={e => {
            touchY.current = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null
          }}
          onTouchEnd={e => {
            if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > SWIPE_CLOSE_PX) dismiss()
            touchY.current = null
          }}
        >
          <div className='dx-handle' />
          {header}
          {stars}
          {noteField}
          {errorBox}
          <div className='flex flex-col gap-3'>
            {saveBtn}
            {skipBtn}
            {deleteBtn && <div className='flex justify-center'>{deleteBtn}</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='dx-backdrop' onClick={dismiss}>
      <div {...dialogProps} className='dx-md' onClick={e => e.stopPropagation()}>
        <button type='button' className='dx-md-x' aria-label='Đóng' onClick={dismiss} disabled={saving}>
          <WatchedIcon name='x' size={18} />
        </button>
        {header}
        {stars}
        {noteField}
        {errorBox}
        <div className='flex gap-3.5 items-center'>
          {deleteBtn}
          {!rating && !isEdit && !hover && (
            <span className='text-xs text-[var(--c-faint)]'>Chọn sao để Lưu — hoặc Bỏ qua để chỉ đánh dấu.</span>
          )}
          <span className='flex-1' />
          {skipBtn}
          {saveBtn}
        </div>
      </div>
    </div>
  )
}
