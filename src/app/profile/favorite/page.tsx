'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import HistoryItem from '@/component/item/profile-movie-items'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Loading from '@/component/status/loading'
import { FAVORITE_COUNT_QUERY_KEY } from '@/component/profile/profile-shell'
import { useAuth } from '@/providers/auth-provider'
import WatchedPagination from '@/component/profile/watched/watched-pagination'

interface FavoriteMovie {
  name: string
  slug: string
  image: string
  source?: string
}

interface FavoriteResponse {
  data: FavoriteMovie[]
  count: number
  page: number
  totalPages: number
}

const PAGE_SIZE = 18

export default function FavoritePage() {
  const params = useParams<{ id?: string }>()
  const userId = params?.id
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [page, setPage] = useState<number>(1)

  const isOwner = !userId || userId === user?.id
  const targetId = userId || user?.id

  const { data, isLoading: loading, error, refetch } = useQuery<FavoriteResponse>({
    queryKey: ['favorites_full', targetId, page],
    queryFn: async () => {
      const url = `/api/favorite?page=${page}&limit=${PAGE_SIZE}${targetId ? `&user_id=${targetId}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      return {
        data: (json.data ?? []).map((item: FavoriteMovie) => ({
          name: item.name,
          slug: item.slug,
          image: item.image,
          source: item.source
        })),
        count: json.count ?? 0,
        page: json.page ?? 1,
        totalPages: json.totalPages ?? 1
      }
    },
    enabled: Boolean(targetId)
  })

  const favorites = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const totalCount = data?.count ?? 0

  const handleDelete = async (slug: string) => {
    if (!isOwner) return
    try {
      const res = await fetch('/api/favorite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      })
      const result = await res.json()
      if (!result.error) {
        refetch()
        queryClient.invalidateQueries({ queryKey: [FAVORITE_COUNT_QUERY_KEY] })
      } else {
        alert(result.error)
      }
    } catch (err) {
      console.error('Xóa thất bại:', err)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3.5'>
          <span className='c-marker' />
          <h2 className='text-2xl sm:text-[30px] font-black tracking-[-0.04em]'>
            Phim yêu thích {totalCount > 0 && <span className='text-[var(--c-dim)] text-lg font-normal'>({totalCount})</span>}
          </h2>
        </div>
      </div>

      {error && <p className='text-red-500 mb-4'>{error.message}</p>}

      {!error && favorites.length > 0 ? (
        <>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 content-start'>
            {favorites.map(movie => (
              <div key={`${movie.slug}_${movie.source}`} className='relative group'>
                <HistoryItem
                  slug={movie.slug}
                  name={movie.name}
                  image={movie.image}
                  hideEpisode={true}
                  source={movie.source}
                />
                {isOwner && (
                  <button
                    type='button'
                    onClick={() => handleDelete(movie.slug)}
                    aria-label={`Xóa ${movie.name} khỏi yêu thích`}
                    className='cursor-pointer absolute top-2 right-2 w-7 h-7 flex items-center justify-center 
                               bg-red-600/90 text-white text-xs font-bold rounded-lg hover:bg-red-700 
                               transition-colors duration-200 shadow-md opacity-80 group-hover:opacity-100'
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className='mt-8 flex justify-center'>
              <WatchedPagination page={page} totalPages={totalPages} onPage={p => setPage(p)} />
            </div>
          )}
        </>
      ) : null}

      {!loading && !error && favorites.length === 0 && (
        <div className='text-[var(--c-dim)] bg-[var(--c-card)] p-8 rounded-2xl border border-[var(--c-line)] text-center'>
          {isOwner ? 'Bạn chưa có phim yêu thích nào.' : 'Người dùng này chưa có phim yêu thích nào.'}
        </div>
      )}
    </div>
  )
}
