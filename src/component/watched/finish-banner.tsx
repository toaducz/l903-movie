'use client'

import WatchedIcon from './watched-icon'
import { useMarkWatched } from '@/hooks/use-mark-watched'
import { useFinishBanner } from '@/hooks/use-finish-banner'
import type { MovieDetail, MovieSource } from '@/types/movie'

export { useFinishBanner }

type Props = {
  detail: MovieDetail
  source: MovieSource
  percent: number
  isSeries: boolean
  placement: 'overlay' | 'inline'
  onClose: () => void
}

export default function FinishBanner({ detail, source, percent, isSeries, placement, onClose }: Props) {
  const { marking, markWatched } = useMarkWatched(detail, source)

  const rate = async () => {
    if (await markWatched()) onClose()
  }

  return (
    <section className={`dx-bn ${placement === 'overlay' ? 'dx-bn-ov' : 'dx-bn-in'}`} aria-label='Đánh dấu đã xem'>
      <button type='button' className='dx-md-x dx-bn-x cursor-pointer' aria-label='Đóng' onClick={onClose}>
        <WatchedIcon name='x' size={16} />
      </button>
      <span className='c-sticker'>
        {isSeries ? 'TẬP CUỐI' : 'GẦN HẾT PHIM'} · {Math.min(99, Math.round(percent * 100))}%
      </span>
      <h4>Xem xong rồi?</h4>
      <p>Đánh dấu Đã xem để lưu lại kèm điểm riêng — lần sau giới thiệu cho bạn bè dễ hơn.</p>
      <div className='flex gap-3'>
        <button
          type='button'
          className='dx-b dx-b-pri dx-b-sm cursor-pointer'
          style={{ height: 44 }}
          disabled={marking}
          onClick={rate}
        >
          {marking ? <span className='dx-spin' /> : <WatchedIcon name='star' size={15} strokeWidth={2.6} />}
          {marking ? 'Đang lưu…' : 'Chấm điểm'}
        </button>
        <button type='button' className='dx-b dx-b-gh dx-b-sm cursor-pointer' style={{ height: 44 }} onClick={onClose}>
          Để sau
        </button>
      </div>
    </section>
  )
}
