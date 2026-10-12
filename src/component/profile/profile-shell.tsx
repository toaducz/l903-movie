'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/app/auth-provider'
import { getWatchedSummary } from '@/services/watched-service'

export const FAVORITE_COUNT_QUERY_KEY = 'favorites_count'

type Tab = { href: string; label: string; count?: number }

function profileIdentity(user: User | null) {
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
  const handle = user?.email?.split('@')[0] ?? ''
  const name = meta.full_name || meta.name || handle || 'Bạn'
  const joinedYear = user?.created_at ? new Date(user.created_at).getFullYear() : null
  return { name, handle, joinedYear, initial: name.trim().charAt(0) || '?' }
}

// Header hồ sơ + tab Tổng quan · Yêu thích · Lịch sử · Đã xem (theo design_handoff_da_xem mục 4)
export default function ProfileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const loggedIn = Boolean(user?.id)
  const { name, handle, joinedYear, initial } = profileIdentity(user)

  const { data: favoriteCount } = useQuery({
    queryKey: [FAVORITE_COUNT_QUERY_KEY, user?.id],
    queryFn: async () => {
      const res = await fetch('/api/favorite?page=1&limit=1')
      if (!res.ok) return undefined
      const json = (await res.json()) as { count?: number | null }
      return json.count ?? 0
    },
    enabled: loggedIn
  })
  const { data: watchedSummary } = useQuery(getWatchedSummary(loggedIn))
  const tabsRef = useRef<HTMLElement>(null)

  // Mobile: tab cuộn ngang → đưa tab đang chọn vào khung nhìn
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname, favoriteCount, watchedSummary?.total]) // badge số làm tab rộng ra → canh lại

  const tabs: Tab[] = [
    { href: '/profile', label: 'Tổng quan' },
    { href: '/profile/favorite', label: 'Yêu thích', count: favoriteCount },
    { href: '/profile/history', label: 'Lịch sử' },
    { href: '/profile/watched', label: 'Đã xem', count: watchedSummary?.total }
  ]

  return (
    <div className='pt-16 text-white min-h-screen'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-10'>
        <div className='dx-ph pt-5 sm:pt-9'>
          <span className='dx-av' aria-hidden='true'>
            {initial}
          </span>
          <div className='min-w-0'>
            <h1 className='truncate'>{name}</h1>
            {handle && (
              <div className='text-[13px] text-[var(--c-dim)] truncate'>
                @{handle}
                <span className='hidden sm:inline'>{joinedYear ? ` · tham gia từ ${joinedYear}` : ''}</span>
              </div>
            )}
          </div>
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
