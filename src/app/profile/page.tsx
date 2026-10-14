'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import HistoryItem from '@/component/item/profile-movie-items'
import { useAuth } from '../auth-provider'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/component/status/loading'
import { useState, useEffect } from 'react'
import SubtitleSettingsPanel from '@/component/player/subtitle-settings-panel'
import { getSubtitleSettings, saveSubtitleSettings, DEFAULT_SUBTITLE_SETTINGS } from '@/utils/subtitle-settings'
import type { SubtitleSettings } from '@/types/subtitle'
import type { UserPrivacySettings } from '@/types/profile'
import type { WatchedMovie } from '@/types/watched'

function SectionTitle({ children }: { children: string }) {
  return (
    <div className='flex items-center gap-3 mb-4'>
      <span className='c-marker yel' />
      <h2 className='text-xl sm:text-2xl font-black tracking-[-0.04em]'>{children}</h2>
    </div>
  )
}

function PrivacyToggleRow({
  title,
  description,
  enabled,
  disabled = false,
  onChange
}: {
  title: string
  description: string
  enabled: boolean
  disabled?: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-[var(--c-line)] last:border-b-0 transition-opacity duration-200 ${
        disabled ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className='pr-4'>
        <p className='font-bold text-[14px] text-white flex items-center gap-2'>
          <span>{title}</span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors duration-200 ${
              enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/10 text-[var(--c-faint)]'
            }`}
          >
            {disabled && !enabled ? 'Đang tải...' : enabled ? 'Công khai' : 'Riêng tư'}
          </span>
        </p>
        <p className='text-xs text-[var(--c-dim)] mt-0.5'>{description}</p>
      </div>

      <button
        type='button'
        role='switch'
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'
        } ${enabled ? 'bg-[var(--c-cyan)]' : 'bg-white/20'}`}
        title={disabled ? 'Đang đồng bộ cài đặt...' : undefined}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}


// Tab "Tổng quan" của Hồ sơ: đánh giá công khai, quyền riêng tư, cài đặt phụ đề
export default function ProfilePage() {
  const params = useParams<{ id?: string }>()
  const userId = params?.id
  const { logout, user } = useAuth()
  const [subSettings, setSubSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_SETTINGS)

  const isOwner = !userId || userId === user?.id
  const targetId = userId || user?.id

  useEffect(() => {
    if (isOwner) {
      setSubSettings(getSubtitleSettings())
    }
  }, [isOwner])

  const handleSubSettingsChange = (s: SubtitleSettings) => {
    setSubSettings(s)
    saveSubtitleSettings(s)
  }

  // Reviews của user mục tiêu
  // Phim đã xem có chấm điểm (1-5 sao) của user mục tiêu
  const { data: ratedData, isLoading: isRatedLoading } = useQuery<{ data: WatchedMovie[]; is_private?: boolean }>({
    queryKey: ['watched', 'rated', targetId],
    queryFn: async () => {
      const url = isOwner
        ? '/api/watched?limit=10&sort=score&min_score=1'
        : `/api/watched?user_id=${targetId}&limit=10&sort=score&min_score=1`
      const res = await fetch(url)
      const json = await res.json()
      if (res.status === 403 && json.is_private) {
        return { data: [], is_private: true }
      }
      if (!res.ok) return { data: [] }
      return json
    },
    enabled: Boolean(targetId)
  })
  const ratedMovies: WatchedMovie[] = ratedData?.data ?? []
  const isPrivate = Boolean(!isOwner && ratedData?.is_private)

  // Cài đặt riêng tư của chính chủ
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false)
  const {
    data: privacyData,
    isLoading: isPrivacyLoading,
    refetch: refetchPrivacy
  } = useQuery<UserPrivacySettings>({
    queryKey: ['user_privacy'],
    queryFn: async () => {
      const res = await fetch('/api/user/privacy')
      const json = await res.json()
      return json.data ?? { is_history_public: false, is_watched_public: false }
    },
    enabled: Boolean(isOwner && user)
  })

  const isToggleDisabled = isPrivacyLoading || isUpdatingPrivacy

  const handleTogglePrivacy = async (field: 'is_history_public' | 'is_watched_public', value: boolean) => {
    if (!isOwner || isToggleDisabled) return
    setIsUpdatingPrivacy(true)
    try {
      const next = {
        is_history_public: field === 'is_history_public' ? value : (privacyData?.is_history_public ?? false),
        is_watched_public: field === 'is_watched_public' ? value : (privacyData?.is_watched_public ?? false)
      }
      await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      })
      await refetchPrivacy()
    } finally {
      setIsUpdatingPrivacy(false)
    }
  }

  if (isRatedLoading) return <Loading />

  return (
    <div className='max-w-4xl text-white'>
      {isOwner && user && <p className='mb-8 text-sm text-[var(--c-dim)]'>Đăng nhập bằng: {user.email}</p>}

      {/* Phim đã đánh giá */}
      <section className='mb-10'>
        <div className='flex items-center justify-between mb-4'>
          <SectionTitle>Phim đã đánh giá</SectionTitle>
          {!isPrivate && ratedMovies.length > 0 && (
            <Link
              href={isOwner ? '/profile/watched' : `/profile/${targetId}/watched`}
              className='text-xs sm:text-sm text-yellow-400 hover:text-yellow-300 transition-colors duration-200 cursor-pointer flex items-center gap-1 font-medium'
            >
              <span>Xem tất cả</span>
              <span>&rarr;</span>
            </Link>
          )}
        </div>
        {isPrivate ? (
          <div className='text-[var(--c-dim)] bg-[var(--c-card)] p-8 rounded-2xl border border-[var(--c-line)] text-center flex flex-col items-center justify-center gap-2'>
            <div className='w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-1 shadow-inner'>
              🔒
            </div>
            <p className='font-bold text-white text-base'>Danh sách đánh giá đang ở chế độ riêng tư</p>
            <p className='text-xs text-[var(--c-dim)] max-w-sm'>
              Người dùng này đã cài đặt danh sách phim đã xem & đánh giá ở chế độ riêng tư.
            </p>
          </div>
        ) : ratedMovies.length > 0 ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
            {ratedMovies.map(movie => (
              <div key={movie.id} className='relative transition-transform duration-200 hover:scale-105'>
                <HistoryItem slug={movie.slug} name={movie.name} image={movie.image || ''} hideEpisode={true} />
                <div className='absolute top-2 right-2 bg-black/80 text-yellow-400 text-sm font-bold px-2.5 py-0.5 rounded-full border border-yellow-500/40 shadow-lg flex items-center gap-1 backdrop-blur-md'>
                  <span>★</span> {movie.score}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-[var(--c-dim)] bg-[var(--c-card)] p-6 rounded-2xl border border-[var(--c-line)] text-center'>
            {isOwner ? 'Bạn chưa chấm điểm bộ phim nào.' : 'Người dùng này chưa chấm điểm bộ phim nào.'}
          </div>
        )}
      </section>

      {/* Cụm Cài đặt quyền riêng tư (chỉ chính chủ mới thấy) */}
      {isOwner && (
        <section className='mb-10 bg-[var(--c-card)] rounded-2xl border border-[var(--c-line)] p-5 sm:p-6'>
          <SectionTitle>Quyền riêng tư hồ sơ</SectionTitle>
          <p className='text-xs text-[var(--c-faint)] -mt-2 mb-4'>
            Quản lý việc thành viên khác có thể nhìn thấy các nội dung trong hồ sơ của bạn hay không.
          </p>

          <PrivacyToggleRow
            title='Lịch sử xem phim'
            description='Cho phép các thành viên khác xem danh sách các tập phim bạn đang xem dở và đã xem.'
            enabled={Boolean(privacyData?.is_history_public)}
            disabled={isToggleDisabled}
            onChange={val => handleTogglePrivacy('is_history_public', val)}
          />

          <PrivacyToggleRow
            title='Phim đã xem xong!'
            description='Cho phép các thành viên khác xem danh sách phim bạn đã đánh dấu xem xong và chấm điểm.'
            enabled={Boolean(privacyData?.is_watched_public)}
            disabled={isToggleDisabled}
            onChange={val => handleTogglePrivacy('is_watched_public', val)}
          />
        </section>
      )}

      {/* Cài đặt phụ đề (chỉ chính chủ mới thấy) */}
      {isOwner && (
        <section className='mb-10 bg-[var(--c-card)] rounded-2xl border border-[var(--c-line)] p-5'>
          <SectionTitle>Cài đặt phụ đề</SectionTitle>
          <SubtitleSettingsPanel settings={subSettings} onChange={handleSubSettingsChange} />
          <p className='text-xs text-[var(--c-faint)] mt-3'>
            Cài đặt được lưu tự động và áp dụng cho tất cả phim bạn xem.
          </p>
        </section>
      )}

      {/* Đăng xuất (chỉ chính chủ) */}
      {isOwner && (
        <button
          type='button'
          onClick={logout}
          className='dx-b dx-b-gh cursor-pointer hover:bg-white/10 transition-colors duration-200'
          style={{ color: 'var(--c-orange)' }}
        >
          Đăng xuất
        </button>
      )}
    </div>
  )
}
