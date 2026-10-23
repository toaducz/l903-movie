'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getWatchingInProgress, removeFromViewHistory, WatchingItem } from '@/utils/local-storage'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import SourceBadge from '@/component/item/source-badge'
import WatchedIcon from '@/component/watched/watched-icon'
import { continueKey, useFinishFromContinue } from '@/hooks/use-finish-from-continue'

type DbItem = {
  slug: string
  name: string
  image: string
  episode_name?: string
  progress: number
  duration: number
  source: string
}

interface ContinueWatchingSkeletonProps {
  count?: number
}

interface ContinueWatchingCardSkeletonProps {
  index: number
}

function ContinueWatchingCardSkeleton({ index }: ContinueWatchingCardSkeletonProps) {
  return (
    <div
      className='relative flex-shrink-0 w-36 sm:w-44'
      style={{
        transform: index % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)'
      }}
    >
      {/* Poster art skeleton */}
      <div className='relative rounded-xl overflow-hidden border border-white/10 bg-[var(--c-card)] h-52 sm:h-64 animate-pulse'>
        <div className='absolute inset-0 bg-white/5' />

        {/* Top-right percent badge placeholder */}
        <div className='absolute top-2 right-2 w-9 h-5 rounded-md bg-white/10 border border-white/10' />

        {/* Bottom-right source badge placeholder */}
        <div className='absolute bottom-2.5 right-2 w-12 h-4 rounded bg-white/10' />

        {/* Progress bar placeholder */}
        <div className='absolute bottom-0 left-0 right-0 h-1 bg-white/10'>
          <div className='h-full w-2/5 bg-[var(--c-pink)]/40' />
        </div>
      </div>

      {/* Title & subtitle skeleton */}
      <div className='mt-2.5 px-0.5 space-y-1.5'>
        <div className='h-3.5 w-3/4 rounded bg-white/10 animate-pulse' />
        <div className='h-3 w-1/2 rounded bg-white/5 animate-pulse' />
      </div>
    </div>
  )
}

export function ContinueWatchingSkeleton({ count = 6 }: ContinueWatchingSkeletonProps) {
  return (
    <section className='px-5 sm:px-10 pt-8 pb-2' aria-busy='true' aria-label='Đang tải danh sách đang xem'>
      {/* Section header */}
      <div className='max-w-[1400px] mx-auto flex items-end justify-between mb-5'>
        <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
          <span className='c-marker animate-pulse' />
          Đang xem dở
        </h2>
      </div>

      {/* Row container */}
      <div className='max-w-[1400px] mx-auto relative'>
        <div className='flex gap-4 overflow-hidden pb-2 no-scrollbar'>
          {Array.from({ length: count }, (_, i) => (
            <ContinueWatchingCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ContinueWatchingSection() {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const removeFromContinue = async (item: WatchingItem) => {
    const isSame = (x: WatchingItem) => x.slug === item.slug && x.source === item.source
    // Ẩn ngay trên UI, xóa cả localStorage để không bị fallback hiện lại
    queryClient.setQueryData<WatchingItem[]>(['continue_watching'], prev => (prev ?? []).filter(x => !isSame(x)))
    removeFromViewHistory(item.slug, item.episodeName)

    const params = new URLSearchParams({ slug: item.slug })
    if (item.source) params.set('source', item.source)
    try {
      const res = await fetch(`/api/history?${params.toString()}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error('Xóa khỏi danh sách đang xem thất bại:', err)
      queryClient.invalidateQueries({ queryKey: ['continue_watching'] })
      throw err
    }
  }

  const { finish, remove, doneKey, leavingKey } = useFinishFromContinue({
    removeFromContinue,
    refreshContinue: () => queryClient.invalidateQueries({ queryKey: ['continue_watching'] })
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['continue_watching'],
    queryFn: async () => {
      const res = await fetch('/api/history')
      if (res.status === 401) {
        return getWatchingInProgress().slice(0, 20)
      }
      const json = await res.json()
      if (!json || !json.data) {
        return getWatchingInProgress().slice(0, 20)
      }
      const dbItems: WatchingItem[] = json.data
        .filter((d: DbItem) => {
          if (!d.episode_name || d.duration <= 0) return false
          const isMovie = d.episode_name.toLowerCase() === 'full' || /^tập\s*0?1$/i.test(d.episode_name)
          return d.progress > 30 || !isMovie
        })
        .map((d: DbItem) => {
          const percent = Math.min(Math.round((d.progress / d.duration) * 100), 99)
          return { ...d, episodeName: d.episode_name, percent, source: d.source }
        })
      const merged = dbItems.length > 0 ? dbItems : getWatchingInProgress()
      return merged.slice(0, 20)
    }
  })

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [items])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
  }

  if (isLoading) {
    return <ContinueWatchingSkeleton />
  }

  if (items.length === 0) return null

  return (
    <div className='px-5 sm:px-10 pt-8 pb-2'>
      {/* Section header */}
      <div className='max-w-[1400px] mx-auto flex items-end justify-between mb-5'>
        <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
          <span className='c-marker' />
          Đang xem dở
        </h2>
      </div>

      {/* Scrollable row */}
      <div className='max-w-[1400px] mx-auto relative group/row'>
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className='cursor-pointer absolute left-0 top-0 bottom-2 z-10 w-10 flex items-center justify-center bg-gradient-to-r from-black/70 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-7 w-7 text-white drop-shadow'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2.5}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className='absolute right-0 top-0 bottom-2 z-10 w-10 flex items-center justify-center bg-gradient-to-l cursor-pointer from-black/70 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-7 w-7 text-white drop-shadow'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2.5}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
            </svg>
          </button>
        )}
        <div ref={scrollRef} className='flex gap-4 overflow-x-auto pb-2 no-scrollbar'>
          {items.map((item, i) => (
            <div
              key={continueKey(item)}
              className={`dx-cc relative flex-shrink-0 w-36 sm:w-44 group/card ${
                leavingKey === continueKey(item) ? 'dx-cc-leaving' : ''
              }`}
              style={{
                transform: i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)',
                transition: 'transform .2s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.04)')}
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.transform = i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)')
              }
            >
              {/* Cụm nút góc trên trái: ✓ Xem xong · X Xoá (ngoài Link để không điều hướng) */}
              {doneKey !== continueKey(item) && leavingKey !== continueKey(item) && (
                <div className='dx-cc-acts'>
                  <button
                    type='button'
                    className='dx-ib dx-ib-ok cursor-pointer'
                    aria-label={`Đánh dấu xem xong ${item.name}`}
                    onClick={() => finish(item)}
                    disabled={Boolean(doneKey || leavingKey)}
                  >
                    <WatchedIcon name='check' size={15} strokeWidth={3} />
                    <span className='dx-tip' aria-hidden='true'>
                      Xem xong
                    </span>
                  </button>
                  <button
                    type='button'
                    className='dx-ib dx-ib-x cursor-pointer'
                    aria-label={`Xoá ${item.name} khỏi Đang xem`}
                    title='Xoá khỏi Đang xem'
                    onClick={() => remove(item)}
                    disabled={Boolean(doneKey || leavingKey)}
                  >
                    <WatchedIcon name='x' size={13} strokeWidth={2.6} />
                  </button>
                </div>
              )}
              <Link
                href={`/detail-movie/${item.slug}?watch=1&ep=${encodeURIComponent(item.episodeName ?? '')}&t=${Math.floor(
                  item.progress
                )}${item.source ? `&source=${item.source}` : ''}`}
                className='block'
              >
                {/* Art + progress */}
                <div className='relative rounded-xl overflow-hidden border border-white/10 bg-[var(--c-card)]'>
                  <Image
                    src={item.image || 'https://via.placeholder.com/400x600?text=No+Poster'}
                    alt={item.name}
                    width={176}
                    height={264}
                    unoptimized
                    className='w-full h-52 sm:h-64 object-cover group-hover/card:opacity-80 transition-opacity duration-200'
                  />
                  {/* Percent badge */}
                  <span
                    className='absolute top-2 right-2 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-[var(--c-cyan)]'
                    style={{ background: 'rgba(13,10,20,.85)', color: 'var(--c-cyan)' }}
                  >
                    {item.percent}%
                  </span>
                  {/* Source badge — góc dưới phải (góc trên trái dành cho cụm nút) */}
                  <SourceBadge source={item.source} className='absolute bottom-2.5 right-2' />
                  {/* Progress bar */}
                  <div className='absolute bottom-0 left-0 right-0 h-1 bg-white/10'>
                    <div className='h-full' style={{ width: `${item.percent}%`, background: 'var(--c-pink)' }} />
                  </div>
                  {doneKey === continueKey(item) && (
                    <div className='dx-cc-done'>
                      <span className='dx-bub'>
                        <WatchedIcon name='check' size={26} strokeWidth={3} />
                      </span>
                      Đã xem xong!
                    </div>
                  )}
                  {/* Play hover */}
                  <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200'>
                    <div className='bg-black/60 rounded-full p-2'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-8 w-8 text-white'
                        viewBox='0 0 20 20'
                        fill='currentColor'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className='mt-2.5 px-0.5'>
                  <p className='text-white text-[13px] font-bold line-clamp-1'>{item.name}</p>
                  <p className='text-white/40 text-[11px] mt-0.5 font-mono'>{item.episodeName}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
