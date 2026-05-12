'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getWatchingInProgress, WatchingItem } from '@/utils/local-storage'

import { useQuery } from '@tanstack/react-query'

type DbItem = {
  slug: string
  name: string
  image: string
  episode_name?: string
  progress: number
  duration: number
  source: string
}

export default function ContinueWatchingSection() {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  if (isLoading || items.length === 0) return null

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
            <Link
              key={`${item.slug}_${item.source}`}
              href={`/detail-movie/${item.slug}?watch=1&ep=${encodeURIComponent(item.episodeName ?? '')}&t=${Math.floor(
                item.progress
              )}${item.source ? `&source=${item.source}` : ''}`}
              className='flex-shrink-0 w-36 sm:w-44 group/card block'
              style={{
                transform: i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)',
                transition: 'transform .2s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.04)')}
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.transform = i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)')
              }
            >
              {/* Art + progress */}
              <div className='relative rounded-xl overflow-hidden border border-white/10 bg-[var(--c-card)]'>
                <Image
                  src={`https://wsrv.nl/?url=${encodeURIComponent(item.image)}&w=400&h=600&fit=cover`}
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
                {/* Source badge */}
                {item.source && (
                  <span
                    className='absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase opacity-80 z-10'
                    style={{
                      background:
                        item.source === 'ophim' ? '#ff4d4f' : item.source === 'nguonc' ? '#52c41a' : '#1890ff',
                      color: '#fff'
                    }}
                  >
                    {item.source === 'nguonc' ? 'Nguồn C' : item.source}
                  </span>
                )}
                {/* Progress bar */}
                <div className='absolute bottom-0 left-0 right-0 h-1 bg-white/10'>
                  <div className='h-full' style={{ width: `${item.percent}%`, background: 'var(--c-pink)' }} />
                </div>
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
          ))}
        </div>
      </div>
    </div>
  )
}
