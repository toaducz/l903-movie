import { formatPosition } from '@/lib/watch-room/chat-format'
import type { RoomMovie } from '@/types/watch-room'
import Poster from './poster'
import XcIcon from './xc-icon'

// Card "Tiếp tục xem" phủ lên player khi vào lại phòng mà chưa ai đang phát

type Props = {
  movie: RoomMovie
  episodeName: string | null
  positionSec: number
  lastByName: string | null
  updatedAt: string | null
  canSeek: boolean
  onResume: () => void
  onPickOther: () => void
}

function when(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return `hôm nay ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `hôm qua ${time}`
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${time}`
}

export default function ResumeCard(props: Props) {
  const { movie, episodeName, positionSec, lastByName, updatedAt, canSeek, onResume, onPickOther } = props
  const at = formatPosition(positionSec)
  const fresh = positionSec < 5
  return (
    <div className='xc-pov'>
      <div className='xc-pcard' role='dialog' aria-label='Tiếp tục xem'>
        <div className='xc-k'>{fresh ? 'SẴN SÀNG XEM' : 'TIẾP TỤC XEM'}</div>
        <div className='flex gap-3.5 items-center'>
          <Poster
            src={movie.poster}
            width={64}
            radius={10}
            className='hidden sm:block'
            style={{ transform: 'rotate(-3deg)', boxShadow: '4px 4px 0 var(--c-pink)' }}
          />
          <div className='min-w-0'>
            <h4 className='truncate'>{movie.title}</h4>
            <div className='font-mono text-[13px] text-[var(--c-dim)] mt-1'>
              <span className='text-[var(--c-yel)] font-extrabold'>
                {[episodeName, fresh ? null : at].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        </div>
        {lastByName && updatedAt && (
          <p className='hidden sm:block'>
            Lần cuối xem cùng <b className='text-white'>{lastByName}</b> · {when(updatedAt)}
          </p>
        )}
        <div className='flex gap-3 flex-wrap'>
          <button type='button' className='dx-b dx-b-pri dx-b-sm sm:!h-12' onClick={onResume}>
            <XcIcon name='play' size={15} />
            {fresh || !canSeek ? 'Bắt đầu xem' : `Tiếp tục từ ${at}`}
          </button>
          <button type='button' className='dx-b dx-b-gh dx-b-sm sm:!h-12' onClick={onPickOther}>
            Chọn phim khác
          </button>
        </div>
      </div>
    </div>
  )
}
