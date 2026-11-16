'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CommunityUser } from '@/types/profile'
import WatchedPagination from '@/component/profile/watched/watched-pagination'
import UserItem from '@/component/item/user-item'

interface UsersApiResponse {
  data: CommunityUser[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function UserItemSkeleton() {
  return (
    <div className='p-5 rounded-2xl bg-[var(--c-card)] border border-white/10 animate-pulse'>
      <div className='flex items-center gap-4'>
        <div className='w-14 h-14 rounded-full bg-white/10 shrink-0' />
        <div className='flex-1 space-y-2'>
          <div className='h-4 w-3/4 rounded bg-white/10' />
          <div className='h-3 w-1/2 rounded bg-white/5' />
        </div>
      </div>
      <div className='mt-4 pt-3 border-t border-white/5 flex justify-between'>
        <div className='h-3 w-1/3 rounded bg-white/5' />
        <div className='h-3 w-1/4 rounded bg-white/10' />
      </div>
    </div>
  )
}

export default function UsersDirectoryPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<UsersApiResponse>({
    queryKey: ['community_users', keyword, page],
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: '12',
        ...(keyword.trim() && { q: keyword.trim() })
      })
      const res = await fetch(`/api/users?${qs.toString()}`)
      return res.json()
    }
  })

  const users = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <main className='min-h-screen text-white pt-24 pb-20 px-4 sm:px-10 max-w-[1400px] mx-auto'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <span className='c-marker cyan' />
            <h1 className='text-2xl sm:text-4xl font-black tracking-tight'>
              Cộng đồng thành viên{' '}
              {total > 0 && <span className='text-[var(--c-dim)] text-xl font-normal'>({total})</span>}
            </h1>
          </div>
          <p className='text-sm text-[var(--c-dim)] max-w-xl'>
            Khám phá gu phim, danh sách yêu thích và các bài nhận xét từ những người bạn chung sở thích điện ảnh.
          </p>
        </div>

        {/* Thanh tìm kiếm */}
        <div className='w-full md:w-80 relative'>
          <input
            type='text'
            value={keyword}
            onChange={e => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            placeholder='Tìm theo tên hoặc @handle...'
            className='w-full px-4 py-2.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-line)] text-sm text-white placeholder-[var(--c-faint)] focus:outline-none focus:border-[var(--c-cyan)] transition-colors duration-200'
          />
          {keyword && (
            <button
              type='button'
              onClick={() => {
                setKeyword('')
                setPage(1)
              }}
              className='absolute right-3 top-2.5 text-xs text-[var(--c-faint)] hover:text-white cursor-pointer'
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid danh sách */}
      {isLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <UserItemSkeleton key={i} />
          ))}
        </div>
      ) : users.length > 0 ? (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {users.map((u, i) => (
              <UserItem key={u.id} user={u} index={i} />
            ))}
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className='mt-10 flex justify-center'>
              <WatchedPagination page={page} totalPages={totalPages} onPage={p => setPage(p)} />
            </div>
          )}
        </>
      ) : (
        <div className='text-center py-16 bg-[var(--c-card)] rounded-2xl border border-[var(--c-line)] px-4'>
          <p className='text-2xl mb-2'>🔍</p>
          <p className='font-bold text-white mb-1'>Không tìm thấy thành viên phù hợp</p>
          <p className='text-xs text-[var(--c-dim)]'>Hãy thử tìm kiếm với từ khoá hoặc tên tài khoản khác.</p>
        </div>
      )}
    </main>
  )
}
