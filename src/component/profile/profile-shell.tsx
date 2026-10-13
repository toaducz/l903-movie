'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/app/auth-provider'
import { getWatchedSummary } from '@/services/watched-service'
import type { PublicUserProfile } from '@/types/profile'

export const FAVORITE_COUNT_QUERY_KEY = 'favorites_count'

interface Tab {
  href: string
  label: string
  count?: number
}

interface ProfileShellProps {
  children: ReactNode
  targetUserId?: string
}

function profileIdentity(user: User | null) {
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
  const handle = user?.email?.split('@')[0] ?? ''
  const name = meta.full_name || meta.name || handle || 'Bạn'
  const joinedYear = user?.created_at ? new Date(user.created_at).getFullYear() : null
  return { name, handle, joinedYear, initial: name.trim().charAt(0) || '?' }
}

export default function ProfileShell({ children, targetUserId: propTargetUserId }: ProfileShellProps) {
  const pathname = usePathname()
  const params = useParams<{ id?: string }>()
  const targetUserId = propTargetUserId || params?.id
  const { user } = useAuth()
  const tabsRef = useRef<HTMLElement>(null)

  const isOwner = !targetUserId || targetUserId === user?.id
  const effectiveUserId = targetUserId || user?.id
  const loggedIn = Boolean(user?.id)

  // 1. Nếu xem người khác -> fetch profile công khai
  const { data: publicProfileData } = useQuery<{ data: PublicUserProfile }>({
    queryKey: ['public_profile', targetUserId],
    queryFn: async () => {
      const res = await fetch(`/api/user/${targetUserId}/public-profile`)
      return res.json()
    },
    enabled: Boolean(!isOwner && targetUserId)
  })
  const publicProfile = publicProfileData?.data

  // Identity hiển thị
  const selfIdentity = profileIdentity(user)
  const name = isOwner ? selfIdentity.name : publicProfile?.name || 'Đang tải...'
  const handle = isOwner ? selfIdentity.handle : publicProfile?.handle || ''
  const joinedYear = isOwner ? selfIdentity.joinedYear : publicProfile?.joinedYear
  const initial = isOwner ? selfIdentity.initial : publicProfile?.initial || '?'

  // 2. Favorite count
  const { data: favoriteCount } = useQuery({
    queryKey: [FAVORITE_COUNT_QUERY_KEY, effectiveUserId],
    queryFn: async () => {
      const url = isOwner
        ? '/api/favorite?page=1&limit=1'
        : `/api/favorite?user_id=${targetUserId}&page=1&limit=1`
      const res = await fetch(url)
      if (!res.ok) return undefined
      const json = (await res.json()) as { count?: number | null }
      return json.count ?? 0
    },
    enabled: Boolean(effectiveUserId)
  })

  // 3. Watched summary (chỉ fetch khi là chính chủ hoặc người đó mở public)
  const shouldFetchWatched = isOwner ? loggedIn : Boolean(publicProfile?.privacy.is_watched_public)
  const { data: watchedSummary } = useQuery({
    ...getWatchedSummary(shouldFetchWatched),
    queryKey: ['watched', 'summary', effectiveUserId],
    queryFn: async () => {
      const url = isOwner ? '/api/watched?summary=1' : `/api/watched?user_id=${targetUserId}&summary=1`
      const res = await fetch(url)
      if (!res.ok) return null
      return res.json()
    },
    enabled: shouldFetchWatched
  })

  const basePath = isOwner ? '/profile' : `/profile/${targetUserId}`

  // 4. Xây dựng danh sách tabs theo quyền riêng tư
  const tabs: Tab[] = [
    { href: basePath, label: 'Tổng quan' },
    { href: `${basePath}/favorite`, label: 'Yêu thích', count: favoriteCount }
  ]

  // Tab Lịch sử: chính chủ luôn thấy, người khác chỉ thấy khi chủ nhà bật public
  if (isOwner || publicProfile?.privacy.is_history_public) {
    tabs.push({ href: `${basePath}/history`, label: 'Lịch sử' })
  }

  // Tab Đã xem xong: chính chủ luôn thấy, người khác chỉ thấy khi chủ nhà bật public
  if (isOwner || publicProfile?.privacy.is_watched_public) {
    tabs.push({ href: `${basePath}/watched`, label: 'Đã xem xong!', count: watchedSummary?.total })
  }

  // Mobile: tab cuộn ngang → đưa tab đang chọn vào khung nhìn
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname, favoriteCount, watchedSummary?.total])

  return (
    <div className='text-white min-h-screen'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-10'>
        <div className='dx-ph pt-5 sm:pt-9 flex items-center justify-between'>
          <div className='flex items-center gap-4 min-w-0'>
            <span className='dx-av' aria-hidden='true'>
              {initial}
            </span>
            <div className='min-w-0'>
              <h1 className='truncate text-2xl sm:text-3xl font-black tracking-tight'>{name}</h1>
              {handle && (
                <div className='text-[13px] text-[var(--c-dim)] truncate'>
                  @{handle}
                  <span className='hidden sm:inline'>{joinedYear ? ` · tham gia từ ${joinedYear}` : ''}</span>
                  {!isOwner && <span className='ml-2 text-[var(--c-cyan)] font-mono text-xs'>[Hồ sơ thành viên]</span>}
                </div>
              )}
            </div>
          </div>

          <Link
            href='/users'
            className='hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-[var(--c-dim)] hover:text-white hover:border-[var(--c-cyan)] hover:bg-white/5 transition-colors duration-200 cursor-pointer'
          >
            <span>👥</span> Thành viên cộng đồng
          </Link>
        </div>

        <nav ref={tabsRef} className='dx-tabs' aria-label='Hồ sơ'>
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`dx-tab ${active ? 'on' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
                {typeof tab.count === 'number' && <span className='dx-n'>{tab.count}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className='max-w-[1400px] mx-auto px-4 sm:px-10 pt-6 sm:pt-8 pb-16'>{children}</div>
    </div>
  )
}
