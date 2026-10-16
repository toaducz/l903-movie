'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth-provider'
import { getMovieDetailHref } from '@/utils/movie-link'
import type { UserNotification, InteractionItem } from '@/types/notification'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'episodes' | 'interactions'>('episodes')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 1. Fetch thông báo tập mới
  const { data: episodesData } = useQuery<{ data: UserNotification[] }>({
    queryKey: ['notifications', 'episodes'],
    queryFn: () => fetch('/api/notifications?type=episode').then(r => r.json()),
    enabled: Boolean(user),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000
  })

  // 2. Fetch thông báo tương tác & cộng đồng
  const { data: interactionsData } = useQuery<{ data: InteractionItem[] }>({
    queryKey: ['notifications', 'interactions'],
    queryFn: () => fetch('/api/notifications/interactions').then(r => r.json()),
    enabled: Boolean(user),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000
  })

  // 3. Theo dõi mốc thời gian xem tab Cộng đồng lần cuối (localStorage)
  const [lastSeenCommunity, setLastSeenCommunity] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('last_seen_community_at')
      if (stored) {
        setLastSeenCommunity(stored)
      } else {
        const now = new Date().toISOString()
        localStorage.setItem('last_seen_community_at', now)
        setLastSeenCommunity(now)
      }
    }
  }, [])

  const episodeNotifs = episodesData?.data ?? []
  const interactionNotifs = interactionsData?.data ?? []

  const unreadEpisodesCount = episodeNotifs.filter(n => !n.is_read).length
  const unreadRepliesCount = interactionNotifs.filter(n => n.isDirectReplyToMe && !n.is_read).length
  const unreadCommunityCount = lastSeenCommunity
    ? interactionNotifs.filter(
        n => !n.isDirectReplyToMe && new Date(n.created_at).getTime() > new Date(lastSeenCommunity).getTime()
      ).length
    : 0

  const unreadInteractionsCount = unreadRepliesCount + unreadCommunityCount
  const totalUnreadCount = unreadEpisodesCount + unreadInteractionsCount

  // Mutation: đánh dấu đã đọc theo loại tab
  const markRead = useMutation({
    mutationFn: (type: 'episode' | 'reply') =>
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, type })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markCommunitySeen = () => {
    const now = new Date().toISOString()
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_seen_community_at', now)
    }
    setLastSeenCommunity(now)
  }

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Khi mở dropdown -> đánh dấu đã đọc tab hiện tại
  const handleToggle = () => {
    if (!open) {
      if (activeTab === 'episodes' && unreadEpisodesCount > 0) {
        markRead.mutate('episode')
      } else if (activeTab === 'interactions') {
        if (unreadRepliesCount > 0) markRead.mutate('reply')
        if (unreadCommunityCount > 0) markCommunitySeen()
      }
    }
    setOpen(prev => !prev)
  }

  // Khi chuyển tab -> nếu tab đích có tin chưa đọc thì mark read luôn
  const handleSelectTab = (tab: 'episodes' | 'interactions') => {
    setActiveTab(tab)
    if (tab === 'episodes' && unreadEpisodesCount > 0) {
      markRead.mutate('episode')
    } else if (tab === 'interactions') {
      if (unreadRepliesCount > 0) markRead.mutate('reply')
      if (unreadCommunityCount > 0) markCommunitySeen()
    }
  }

  const handleClickNotification = (slug: string, source?: string) => {
    setOpen(false)
    router.push(getMovieDetailHref(slug, source))
  }

  if (!user) return null

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Nút chuông */}
      <button
        type='button'
        onClick={handleToggle}
        className='relative p-1.5 rounded-full transition-colors duration-200 hover:opacity-80 cursor-pointer'
        style={{ background: 'rgba(255,255,255,.08)' }}
        aria-label='Thông báo'
      >
        {/* Icon chuông */}
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className={`text-white/70 transition-colors duration-200 ${totalUnreadCount > 0 ? 'text-[var(--c-yel)] animate-[bell-shake_1s_ease-in-out_infinite]' : ''}`}
        >
          <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
          <path d='M13.73 21a2 2 0 0 1-3.46 0' />
        </svg>

        {/* Badge đỏ số lượng chưa đọc */}
        {totalUnreadCount > 0 && (
          <span
            className='absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-black text-black'
            style={{ background: 'var(--c-pink)' }}
          >
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown 2 Tab */}
      {open && (
        <div
          className='absolute right-0 top-full mt-3 w-88 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-[9999] border overflow-hidden'
          style={{
            background: 'var(--c-card)',
            borderColor: 'var(--c-line)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Header + Tabs Switcher */}
          <div className='border-b' style={{ borderColor: 'var(--c-line)' }}>
            <div className='px-4 pt-3 pb-2 flex items-center justify-between'>
              <span className='text-sm font-black text-white'>Thông báo</span>
              {totalUnreadCount > 0 && (
                <span
                  className='text-[10px] font-bold px-2 py-0.5 rounded-full'
                  style={{ background: 'var(--c-pink)', color: 'black' }}
                >
                  {totalUnreadCount} mới
                </span>
              )}
            </div>

            {/* 2 Tab Navigation */}
            <div className='flex px-2 pb-1 gap-1'>
              <button
                type='button'
                onClick={() => handleSelectTab('episodes')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'episodes'
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🎬 Tập mới</span>
                {unreadEpisodesCount > 0 && (
                  <span
                    className='min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center'
                    style={{ background: 'var(--c-pink)', color: 'black' }}
                  >
                    {unreadEpisodesCount}
                  </span>
                )}
              </button>

              <button
                type='button'
                onClick={() => handleSelectTab('interactions')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'interactions'
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>💬 Tương tác</span>
                {unreadInteractionsCount > 0 && (
                  <span
                    className='min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center'
                    style={{ background: 'var(--c-pink)', color: 'black' }}
                  >
                    {unreadInteractionsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Danh sách thông báo theo Tab */}
          <div className='max-h-84 overflow-y-auto divide-y divide-white/5'>
            {activeTab === 'episodes' ? (
              // TAB 1: TẬP MỚI
              episodeNotifs.length === 0 ? (
                <div className='py-10 text-center text-white/40 text-sm'>
                  <p className='text-2xl mb-2'>🔔</p>
                  <p>Chưa có thông báo tập mới</p>
                  <p className='text-xs mt-1 text-white/25'>Theo dõi phim để nhận thông báo khi có tập mới!</p>
                </div>
              ) : (
                episodeNotifs.map(notif => (
                  <button
                    key={notif.id}
                    type='button'
                    onClick={() => handleClickNotification(notif.slug, notif.source)}
                    className='w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors duration-200 border-b cursor-pointer'
                    style={{ borderColor: 'var(--c-line)' }}
                  >
                    <span
                      className='mt-1.5 w-2 h-2 rounded-full shrink-0'
                      style={{ background: notif.is_read ? 'transparent' : 'var(--c-pink)' }}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-bold text-white truncate'>{notif.movie_name}</p>
                      <p className='text-xs text-white/50 mt-0.5'>
                        🎬 Ra tập mới: <span className='text-[var(--c-cyan)] font-semibold'>{notif.episode_name}</span>
                      </p>
                      <p className='text-[10px] text-white/30 mt-1'>{timeAgo(notif.created_at)}</p>
                    </div>
                  </button>
                ))
              )
            ) : (
              // TAB 2: TƯƠNG TÁC & CỘNG ĐỒNG
              interactionNotifs.length === 0 ? (
                <div className='py-10 text-center text-white/40 text-sm'>
                  <p className='text-2xl mb-2'>💬</p>
                  <p>Chưa có tương tác cộng đồng</p>
                  <p className='text-xs mt-1 text-white/25'>Các đánh giá, bình luận và hoạt động sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                interactionNotifs.map(item => {
                  const isReply = item.type === 'reply'
                  const isReview = item.type === 'community_review'
                  const isWatched = item.type === 'community_watched'

                  const isNew = item.isDirectReplyToMe
                    ? !item.is_read
                    : Boolean(lastSeenCommunity && new Date(item.created_at).getTime() > new Date(lastSeenCommunity).getTime())

                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => handleClickNotification(item.slug)}
                      className={`w-full text-left px-3.5 py-3 flex items-start gap-2.5 transition-colors duration-200 cursor-pointer hover:bg-white/5 ${
                        item.isDirectReplyToMe ? 'bg-[var(--c-pink)]/10 border-l-2 border-[var(--c-pink)]' : ''
                      }`}
                    >
                      {/* Dot báo mới */}
                      <span
                        className='mt-3 w-1.5 h-1.5 rounded-full shrink-0'
                        style={{ background: isNew ? 'var(--c-pink)' : 'transparent' }}
                      />

                      {/* Icon hoặc avatar */}
                      <div className='mt-0.5 shrink-0'>
                        {isReply && (
                          <div
                            className='w-7 h-7 rounded-full flex items-center justify-center text-xs'
                            style={{ background: 'var(--c-pink)', color: 'black' }}
                          >
                            💬
                          </div>
                        )}
                        {isReview && (
                          <div className='w-7 h-7 rounded-full bg-[var(--c-yel)]/20 text-[var(--c-yel)] flex items-center justify-center text-xs font-bold'>
                            ★
                          </div>
                        )}
                        {isWatched && (
                          <div className='w-7 h-7 rounded-full bg-[var(--c-cyan)]/20 text-[var(--c-cyan)] flex items-center justify-center text-xs font-bold'>
                            🎬
                          </div>
                        )}
                      </div>

                      {/* Nội dung chi tiết */}
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <span className='text-xs font-bold text-white'>@{item.actor_name}</span>
                          {item.isDirectReplyToMe && (
                            <span
                              className='text-[9px] font-bold px-1.5 py-0.2 rounded'
                              style={{ background: 'var(--c-pink)', color: 'black' }}
                            >
                              Trả lời bạn
                            </span>
                          )}
                        </div>

                        <p className='text-xs text-white/70 mt-0.5'>
                          {isReply && <span>đã phản hồi bạn tại </span>}
                          {isReview && (
                            <span>
                              {item.score ? (
                                <>
                                  đã chấm <span className='text-[var(--c-yel)] font-bold'>★ {item.score}</span> cho{' '}
                                </>
                              ) : (
                                'đã đánh giá '
                              )}
                            </span>
                          )}
                          {isWatched && <span>đã xem xong </span>}
                          <span className='font-semibold text-white'>{item.movie_name}</span>
                        </p>

                        {/* Đoạn trích comment/review nếu có */}
                        {item.content && (
                          <p className='text-[11px] text-white/50 italic mt-1 line-clamp-2 bg-white/5 px-2 py-1 rounded'>
                            &ldquo;{item.content}&rdquo;
                          </p>
                        )}

                        <p className='text-[10px] text-white/30 mt-1.5'>{timeAgo(item.created_at)}</p>
                      </div>
                    </button>
                  )
                })
              )
            )}
          </div>

          {/* Footer */}
          <div className='px-4 py-2 text-center border-t' style={{ borderColor: 'var(--c-line)' }}>
            <span className='text-[11px] text-white/30'>Hiển thị hoạt động mới nhất</span>
          </div>
        </div>
      )}

      {/* Keyframes cho hiệu ứng rung chuông */}
      <style>{`
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(4deg); }
          90% { transform: rotate(-2deg); }
        }
      `}</style>
    </div>
  )
}
