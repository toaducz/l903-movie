import type { MovieItem } from '@/types/movie'
import MovieSearch from './movie-search'

// Phòng chưa chọn phim: sticker + ô tìm ngay trong khung player

type Props = { onPick: (item: MovieItem) => void; busySlug: string | null }

export default function RoomEmptyState({ onPick, busySlug }: Props) {
  return (
    <div className='absolute inset-0 z-[62] flex flex-col items-center justify-center gap-4 px-5 text-center'>
      <span className='c-sticker pink'>CHƯA CÓ PHIM</span>
      <div className='hidden sm:block text-[28px] lg:text-[36px] font-black tracking-[-0.045em]'>
        Xem gì đây hai bạn?
      </div>
      <MovieSearch onPick={onPick} busySlug={busySlug} />
    </div>
  )
}
