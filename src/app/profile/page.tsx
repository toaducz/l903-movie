'use client'

import Link from 'next/link'
import { useAuth } from '../auth-provider'
import HistoryItem from '@/component/item/profile-movie-items'
import { useQuery } from '@tanstack/react-query'
import { getViewHistory } from '@/utils/local-storage'
import Loading from '@/component/status/loading'
import { useState, useEffect } from 'react'
import SubtitleSettingsPanel from '@/component/player/subtitle-settings-panel'
import { getSubtitleSettings, saveSubtitleSettings, DEFAULT_SUBTITLE_SETTINGS } from '@/utils/subtitle-settings'
import type { SubtitleSettings } from '@/types/subtitle'

type FavoriteMovie = {
  name: string
  image: string
  slug: string
  episode_name?: string
  source?: string
}

type ReviewMovie = {
  id: string
  slug: string
  name: string
  image: string
  score: number
}

export default function ProfilePage() {
  const { logout, user } = useAuth()
  const [subSettings, setSubSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_SETTINGS)

  useEffect(() => {
    setSubSettings(getSubtitleSettings())
  }, [])

  const handleSubSettingsChange = (s: SubtitleSettings) => {
    setSubSettings(s)
    saveSubtitleSettings(s)
  }
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['history', user?.id],
    queryFn: async () => {
      if (!user) return { data: getViewHistory() }
      const res = await fetch('/api/history')
      if (res.status === 401) return { data: getViewHistory() }
      return res.json()
    }
  })

  const { data: favoritesData, isLoading: isFavoritesLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/favorite?page=1&limit=5')
      return res.json()
    },
    enabled: !!user
  })

  const { data: reviewsData, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['reviews', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/review?my_reviews=1&limit=5')
      return res.json()
    },
    enabled: !!user
  })

  const history: FavoriteMovie[] = (historyData?.data ?? []).slice(0, 5)
  const favorites: FavoriteMovie[] = favoritesData?.data
    ? favoritesData.data.map((item: FavoriteMovie) => ({
        name: item.name,
        image: item.image,
        slug: item.slug,
        source: item.source
      }))
    : []
  const reviews: ReviewMovie[] = reviewsData?.data ?? []

  const isLoading = isHistoryLoading || isFavoritesLoading || isReviewsLoading

  if (isLoading) return <Loading />

  return (
    <div className='pt-16 pb-20 px-4 max-w-4xl mx-auto bg-transparent text-white'>
      {user && <p className='mb-6'>Đăng nhập bằng: {user.email}</p>}
      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-3'>Phim đã xem gần đây</h2>
        {history.length > 0 ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
            {history.map((movie, index) => (
              <HistoryItem
                key={`${movie.slug}_${index}`}
                slug={movie.slug}
                name={movie.name}
                image={movie.image}
                episodeName={movie.episode_name}
                source={movie.source}
              />
            ))}
          </div>
        ) : (
          <p className='text-gray-500'>Chưa có phim nào</p>
        )}
        <div className='mt-3'>
          <Link href='/profile/history' className='text-blue-600 hover:underline'>
            Xem thêm
          </Link>
        </div>
      </section>

      {/* Phim yêu thích */}
      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-3'>Phim yêu thích</h2>
        {favorites.length > 0 ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
            {favorites.map(movie => (
              <HistoryItem
                key={movie.slug}
                slug={movie.slug}
                name={movie.name}
                image={movie.image}
                hideEpisode={true}
                source={movie.source}
              />
            ))}
          </div>
        ) : (
          <p className='text-gray-500'>Bạn chưa có phim yêu thích nào.</p>
        )}
        <div className='mt-3'>
          <Link href='/profile/favorite' className='text-blue-600 hover:underline'>
            Xem thêm
          </Link>
        </div>
      </section>

      {/* Phim đã đánh giá */}
      {user && (
        <section className='mb-8'>
          <h2 className='text-xl font-semibold mb-3 border-l-4 border-yellow-500 pl-3'>Phim đã đánh giá</h2>
          {reviews.length > 0 ? (
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
              {reviews.map(review => (
                <div key={review.id} className='relative transition-transform hover:scale-105'>
                  <HistoryItem slug={review.slug} name={review.name} image={review.image} hideEpisode={true} />
                  <div className='absolute top-2 right-2 bg-black/80 text-yellow-500 text-sm font-bold px-3 py-1 rounded-full border border-yellow-500/50 shadow-lg flex items-center gap-1 backdrop-blur-md'>
                    <span>★</span> {review.score}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-gray-500 bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-center'>
              Bạn chưa tham gia đánh giá bộ phim nào.
            </div>
          )}
        </section>
      )}

      <section className='mb-8 bg-gray-900/60 rounded-xl border border-gray-800 p-5'>
        <h2 className='text-xl font-semibold mb-4 border-l-4 border-yellow-500 pl-3'>Cài đặt phụ đề</h2>
        <SubtitleSettingsPanel settings={subSettings} onChange={handleSubSettingsChange} />
        <p className='text-xs text-gray-500 mt-3'>Cài đặt được lưu tự động và áp dụng cho tất cả phim bạn xem.</p>
      </section>

      <div className='flex justify-center mt-6'>
        <button onClick={logout} className='px-4 py-2 bg-red-600 text-white rounded cursor-pointer hover:opacity-90'>
          Đăng xuất
        </button>
      </div>
    </div>
  )
}
