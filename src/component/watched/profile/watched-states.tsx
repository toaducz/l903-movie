import Image from 'next/image'
import Link from 'next/link'
import emptyGif from '@/assets/gif/dantsu-flame-eating.gif'
import notFoundImg from '@/assets/image/pekora-not-found.jpg'
import WatchedIcon from '../watched-icon'

export function WatchedGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className='dx-grid' aria-busy='true' aria-label='Đang tải danh sách'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className='dx-sk' style={{ aspectRatio: '2/3', borderRadius: 16 }} />
          <div className='dx-sk' style={{ height: 13, marginTop: 12, width: '80%' }} />
          <div className='dx-sk' style={{ height: 11, marginTop: 8, width: '95%' }} />
          <div className='dx-sk' style={{ height: 9, marginTop: 8, width: '40%' }} />
        </div>
      ))}
    </div>
  )
}

export function WatchedEmpty({ isOwner = true }: { isOwner?: boolean }) {
  return (
    <div className='dx-empty'>
      <div className='relative'>
        <div className='dx-img'>
          <Image src={emptyGif} alt='Trống trơn' fill unoptimized className='object-cover' />
        </div>
        <span className='c-sticker'>TRỐNG TRƠN!</span>
      </div>
      <h3>{isOwner ? 'Chưa có phim nào trong Đã xem' : 'Chưa có phim nào trong danh sách Đã xem'}</h3>
      <p>
        {isOwner ? (
          <>
            Xem xong phim nào thì bấm <b className='text-[var(--c-cyan)]'>✓</b> để lưu lại kèm điểm riêng. Lần sau ai hỏi
            &quot;phim nào hay?&quot; là có ngay danh sách.
          </>
        ) : (
          'Người dùng này chưa lưu bộ phim nào vào danh sách đã xem.'
        )}
      </p>
      {isOwner && (
        <Link href='/' className='dx-b dx-b-pri cursor-pointer'>
          <WatchedIcon name='search' size={16} strokeWidth={2.6} />
          Khám phá phim
        </Link>
      )}
    </div>
  )
}

export function WatchedNoResult({ description, onClear }: { description: string; onClear: () => void }) {
  return (
    <div className='dx-empty' style={{ paddingTop: 24 }}>
      <div className='dx-img sm'>
        <Image src={notFoundImg} alt='' fill className='object-cover' sizes='200px' />
      </div>
      <h3>Không có phim nào khớp</h3>
      <p>{description}</p>
      <button type='button' className='dx-b dx-b-gh' onClick={onClear}>
        Xoá bộ lọc
      </button>
    </div>
  )
}

export function WatchedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className='dx-err my-6' role='alert'>
      <WatchedIcon name='warn' size={18} className='text-[var(--c-orange)] shrink-0' />
      <div className='flex-1'>
        <b>Chưa tải được danh sách.</b> {message}
      </div>
      <button type='button' className='dx-b dx-b-sm dx-b-gh' onClick={onRetry}>
        Thử lại
      </button>
    </div>
  )
}
