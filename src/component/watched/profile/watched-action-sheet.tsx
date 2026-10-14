'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getMovieDetailHref } from '@/utils/movie-link'
import BottomSheet from '../bottom-sheet'
import WatchedIcon from '../watched-icon'
import { formatWatchedDate } from '../watched-format'
import type { WatchedMovie } from '@/types/watched'

type Props = {
  movie: WatchedMovie
  onClose: () => void
  onRate: (movie: WatchedMovie) => void
  onDelete: (movie: WatchedMovie) => void
}

/** Sheet thao tác khi bấm ⋯ trên thẻ (mobile không có hover) */
export default function WatchedActionSheet({ movie, onClose, onRate, onDelete }: Props) {
  const router = useRouter()
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }

  return (
    <BottomSheet label={`Thao tác: ${movie.name}`} onClose={onClose}>
      <div className='flex gap-3.5 items-center pt-2.5 pb-3'>
        <div className='relative w-[52px] shrink-0 aspect-[2/3] rounded-lg overflow-hidden border border-[var(--c-line)] bg-[var(--c-bg-2)]'>
          {movie.image && <Image src={movie.image} alt='' fill sizes='52px' unoptimized className='object-cover' />}
        </div>
        <div className='min-w-0'>
          <b className='block text-base truncate'>{movie.name}</b>
          <div className='text-xs text-[var(--c-dim)] mt-0.5'>
            {movie.score ? <span className='text-[var(--c-yel)] font-extrabold'>★{movie.score}</span> : 'Chưa chấm'} ·
            Xem {formatWatchedDate(movie.watched_at)}
          </div>
        </div>
      </div>
      <button type='button' className='dx-sh-row' onClick={then(() => onRate(movie))}>
        <WatchedIcon name='pen' size={20} strokeWidth={2} />
        {movie.score ? 'Sửa điểm & bình luận' : 'Chấm điểm & bình luận'}
      </button>
      <button
        type='button'
        className='dx-sh-row'
        onClick={then(() => router.push(getMovieDetailHref(movie.slug, movie.source)))}
      >
        <WatchedIcon name='ext' size={20} strokeWidth={2} />
        Mở trang phim
      </button>
      <button type='button' className='dx-sh-row del' onClick={then(() => onDelete(movie))}>
        <WatchedIcon name='trash' size={20} strokeWidth={2} />
        Xoá khỏi Đã xem
      </button>
      <button type='button' className='dx-b dx-b-gh w-full mt-2.5' style={{ height: 52 }} onClick={onClose}>
        Đóng
      </button>
    </BottomSheet>
  )
}
