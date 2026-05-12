'use client'

import { useEffect, useState } from 'react'
import HistoryItem from '@/component/item/profile-movie-items'
import { getViewHistory } from '@/utils/local-storage'
import { useAuth } from '@/app/auth-provider'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/component/status/loading'

type HistoryMovie = { name: string; slug: string; image: string; episode_name?: string; source?: string }

export default function HistoryPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: allMoviesBase, isLoading, refetch } = useQuery({
    queryKey: ['history_full', user?.id],
    queryFn: async () => {
      if (!user) return getViewHistory()
      const res = await fetch('/api/history')
      if (res.status === 401) return getViewHistory()
      const json = await res.json()
      return (json.data ?? []).map((d: HistoryMovie) => ({
        name: d.name,
        slug: d.slug,
        image: d.image,
        episode_name: d.episode_name,
        source: d.source
      }))
    }
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
    if (user) {
      await fetch('/api/history', { method: 'DELETE' })
    } else {
      localStorage.removeItem('viewHistory')
    }
    setPage(1)
    refetch()
  }

  if (isLoading) return <Loading />

  return (
    <div className='pt-16 px-4 max-w-5xl mx-auto min-h-screen'>
      <h1 className='text-2xl font-bold mb-6'>Lịch sử xem</h1>

      {visibleMovies.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 content-start'>
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
        <p className='text-gray-500'>Bạn chưa xem phim nào.</p>
      )}

      {visibleMovies.length < allMovies.length && <p className='text-center mt-4 text-gray-400'>Đang tải thêm...</p>}

      {visibleMovies.length > 0 && (
        <div className='mt-6 text-center'>
          <button onClick={clearHistory} className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition mb-10 cursor-pointer'>
            Xóa hết lịch sử xem
          </button>
        </div>
      )}
    </div>
  )
}
