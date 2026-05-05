'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth-provider'

type Notification = {
  id: string
  slug: string
  movie_name: string
  episode_name: string
  is_read: boolean
  created_at: string
}

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
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Chỉ fetch khi đã đăng nhập
  const { data } = useQuery<{ data: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // tự refetch mỗi 5 phút
    staleTime: 60 * 1000,
  })

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Mutation: đánh dấu tất cả đã đọc
  const markAllRead = useMutation({
    mutationFn: () =>
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

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

  // Khi mở dropdown -> đánh dấu đã đọc hết
  const handleToggle = () => {
    if (!open && unreadCount > 0) {
      markAllRead.mutate()
    }
    setOpen(prev => !prev)
  }

  const handleClickNotification = (slug: string) => {
    setOpen(false)
    router.push(`/detail-movie/${slug}`)
  }

  if (!user) return null

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Nút chuông */}
      <button
        onClick={handleToggle}
        className='relative p-1.5 rounded-full transition-all duration-200 hover:opacity-80 cursor-pointer'
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
          className={`text-white/70 transition-all duration-300 ${unreadCount > 0 ? 'text-[var(--c-yel)] animate-[bell-shake_1s_ease-in-out_infinite]' : ''}`}
        >
          <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
          <path d='M13.73 21a2 2 0 0 1-3.46 0' />
        </svg>

        {/* Badge đỏ số lượng chưa đọc */}
        {unreadCount > 0 && (
          <span
            className='absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-black text-black'
            style={{ background: 'var(--c-pink)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className='absolute right-0 top-full mt-3 w-80 rounded-2xl shadow-2xl z-[9999] border overflow-hidden'
          style={{
            background: 'var(--c-card)',
            borderColor: 'var(--c-line)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Header */}
          <div
            className='px-4 py-3 flex items-center justify-between border-b'
            style={{ borderColor: 'var(--c-line)' }}
          >
            <span className='text-sm font-black text-white'>Thông báo</span>
            {unreadCount > 0 && (
              <span className='text-[10px] font-bold px-2 py-0.5 rounded-full' style={{ background: 'var(--c-pink)', color: 'black' }}>
                {unreadCount} mới
              </span>
            )}
          </div>

          {/* Danh sách */}
          <div className='max-h-80 overflow-y-auto'>
            {notifications.length === 0 ? (
              <div className='py-10 text-center text-white/40 text-sm'>
                <p className='text-2xl mb-2'>🔔</p>
                <p>Chưa có thông báo nào</p>
                <p className='text-xs mt-1 text-white/25'>Theo dõi phim để nhận thông báo khi có tập mới!</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotification(notif.slug)}
                  className='w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b cursor-pointer'
                  style={{ borderColor: 'var(--c-line)' }}
                >
                  {/* Dot chưa đọc */}
                  <span
                    className='mt-1.5 w-2 h-2 rounded-full shrink-0'
                    style={{ background: notif.is_read ? 'transparent' : 'var(--c-pink)' }}
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-white truncate'>
                      {notif.movie_name}
                    </p>
                    <p className='text-xs text-white/50 mt-0.5'>
                      🎬 Ra tập mới: <span className='text-[var(--c-cyan)] font-semibold'>{notif.episode_name}</span>
                    </p>
                    <p className='text-[10px] text-white/30 mt-1'>{timeAgo(notif.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='px-4 py-2.5 text-center border-t' style={{ borderColor: 'var(--c-line)' }}>
              <span className='text-[11px] text-white/30'>Chỉ hiển thị 20 thông báo gần nhất</span>
            </div>
          )}
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
