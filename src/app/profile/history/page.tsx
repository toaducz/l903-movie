'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import HistoryItem from '@/component/item/profile-movie-items'
import { getViewHistory } from '@/utils/local-storage'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/component/status/loading'
import ProfilePrivateLocked from '@/component/profile/profile-private-locked'

interface HistoryMovie {
  name: string
  slug: string
  image: string
  episode_name?: string
  source?: string
}

export default function HistoryPage() {
  const params = useParams<{ id?: string }>()
  const userId = params?.id
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  const isOwner = !userId || userId === user?.id
  const targetId = userId || user?.id

  const { data: allMoviesBase, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['history_full', targetId],
    queryFn: async () => {
      if (isOwner && !user) return getViewHistory()
      const url = isOwner ? '/api/history' : `/api/history?user_id=${targetId}`
      const res = await fetch(url)
      if (res.status === 401 && isOwner) return getViewHistory()
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải lịch sử xem')
      }
      return (json.data ?? []).map((d: HistoryMovie) => ({
        name: d.name,
        slug: d.slug,
        image: d.image,
        episode_name: d.episode_name,
        source: d.source
      }))
    },
    enabled: Boolean(targetId || (!userId && typeof window !== 'undefined'))
  })

  const allMovies = allMoviesBase || []
  const visibleMovies = allMovies.slice(0, page * PAGE_SIZE)

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
        visibleMovies.length < allMovies.length
      ) {
        setPage(prev => prev + 1)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [visibleMovies.length, allMovies.length])

  const clearHistory = async () => {
    if (!isOwner) return
    if (user) {
      await fetch('/api/history', { method: 'DELETE' })
    } else {
      localStorage.removeItem('viewHistory')
    }
    setPage(1)
    refetch()
  }

  if (isLoading) return <Loading />

  if (isError && error?.message?.includes('riêng tư')) {
    return (
      <ProfilePrivateLocked
        title='Lịch sử xem riêng tư'
        description='Người dùng này đã đặt lịch sử xem phim ở chế độ riêng tư.'
        backHref={userId ? `/profile/${userId}` : '/profile'}
      />
    )
  }

  return (
    <div>
      <div className='flex items-center gap-3.5 mb-6'>
        <span className='c-marker' />
        <h2 className='text-2xl sm:text-[30px] font-black tracking-[-0.04em]'>Lịch sử xem</h2>
      </div>

      {visibleMovies.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 content-start'>
          {visibleMovies.map((movie: HistoryMovie) => (
            <HistoryItem
              key={`${movie.slug}_${movie.source}`}
              slug={movie.slug}
              name={movie.name}
              image={movie.image}
              episodeName={movie.episode_name}
              source={movie.source}
            />
          ))}
        </div>
      ) : (
        <div className='text-[var(--c-dim)] bg-[var(--c-card)] p-8 rounded-2xl border border-[var(--c-line)] text-center'>
          {isOwner ? 'Bạn chưa xem phim nào.' : 'Người dùng này chưa có lịch sử xem phim.'}
        </div>
      )}

      {visibleMovies.length < allMovies.length && <p className='text-center mt-4 text-[var(--c-faint)]'>Đang tải thêm...</p>}

      {isOwner && visibleMovies.length > 0 && (
        <div className='mt-8 text-center'>
          <button
            type='button'
            onClick={clearHistory}
            className='px-4 py-2 bg-red-600/90 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 cursor-pointer text-sm font-semibold'
          >
            Xóa hết lịch sử xem
          </button>
        </div>
      )}
    </div>
  )
}
