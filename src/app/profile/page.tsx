'use client'

import HistoryItem from '@/component/item/profile-movie-items'
import { useAuth } from '../auth-provider'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/component/status/loading'
import { useState, useEffect } from 'react'
import SubtitleSettingsPanel from '@/component/player/subtitle-settings-panel'
import { getSubtitleSettings, saveSubtitleSettings, DEFAULT_SUBTITLE_SETTINGS } from '@/utils/subtitle-settings'
import type { SubtitleSettings } from '@/types/subtitle'

type ReviewMovie = {
  id: string
  slug: string
  name: string
  image: string
  score: number
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className='flex items-center gap-3 mb-4'>
      <span className='c-marker yel' />
      <h2 className='text-xl sm:text-2xl font-black tracking-[-0.04em]'>{children}</h2>
    </div>
  )
}

// Tab "Tổng quan" của Hồ sơ: đánh giá công khai, cài đặt phụ đề, đăng xuất
// (Yêu thích / Lịch sử / Đã xem có tab riêng trong ProfileShell)
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

  const { data: reviewsData, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['reviews', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/review?my_reviews=1&limit=5')
      return res.json()
    },
    enabled: !!user
  })
  const reviews: ReviewMovie[] = reviewsData?.data ?? []

  if (isReviewsLoading) return <Loading />

  return (
    <div className='max-w-4xl text-white'>
      {user && <p className='mb-8 text-sm text-[var(--c-dim)]'>Đăng nhập bằng: {user.email}</p>}

      {user && (
        <section className='mb-10'>
          <SectionTitle>Phim đã đánh giá</SectionTitle>
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
            <div className='text-[var(--c-dim)] bg-[var(--c-card)] p-6 rounded-2xl border border-[var(--c-line)] text-center'>
              Bạn chưa tham gia đánh giá bộ phim nào.
            </div>
          )}
        </section>
      )}

      <section className='mb-10 bg-[var(--c-card)] rounded-2xl border border-[var(--c-line)] p-5'>
        <SectionTitle>Cài đặt phụ đề</SectionTitle>
        <SubtitleSettingsPanel settings={subSettings} onChange={handleSubSettingsChange} />
        <p className='text-xs text-[var(--c-faint)] mt-3'>
          Cài đặt được lưu tự động và áp dụng cho tất cả phim bạn xem.
        </p>
      </section>

      <button onClick={logout} className='dx-b dx-b-gh' style={{ color: 'var(--c-orange)' }}>
        Đăng xuất
      </button>
    </div>
  )
}
