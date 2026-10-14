'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getWatchedList, getWatchedSummary, watchedErrorMessage } from '@/services/watched-service'
import { useWatched } from '../watched-provider'
import WatchedIcon from '../watched-icon'
import WatchedCard, { toRatingTarget } from './watched-card'
import WatchedToolbar from './watched-toolbar'
import WatchedPagination from './watched-pagination'
import WatchedActionSheet from './watched-action-sheet'
import { WatchedEmpty, WatchedError, WatchedGridSkeleton, WatchedNoResult } from './watched-states'
import { describeNoResult, filtersToSearch, parseFilters, toListQuery, type WatchedFilters } from './watched-filters'
import type { WatchedMovie } from '@/types/watched'
import { useAuth } from '@/app/auth-provider'
import ProfilePrivateLocked from '@/component/profile/profile-private-locked'

const formatAverage = (n: number) => n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

interface WatchedViewProps {
  userId?: string
}

// Tab "Đã xem" trong Hồ sơ: lưới phim + sắp xếp / lọc / phân trang (trạng thái nằm trên URL)
export default function WatchedView({ userId: propUserId }: WatchedViewProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id?: string }>()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)
  const { openRating, deleteWatched } = useWatched()
  const { user } = useAuth()
  const [sheetMovie, setSheetMovie] = useState<WatchedMovie | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Trích xuất userId từ prop, params (/profile/[id]/watched) hoặc pathname
  const pathParts = pathname?.split('/').filter(Boolean) || []
  const pathUserId =
    pathParts[0] === 'profile' &&
    pathParts[1] &&
    !['watched', 'history', 'favorite'].includes(pathParts[1])
      ? pathParts[1]
      : undefined

  const effectiveUserId = propUserId || params?.id || pathUserId

  // Nếu đang xem của user khác: chỉ là owner khi đã đăng nhập và user.id khớp với effectiveUserId
  // Nếu ở trang /profile/watched của chính mình: chỉ là owner khi đã đăng nhập
  const isOwner = effectiveUserId
    ? Boolean(user?.id && user.id === effectiveUserId)
    : Boolean(user?.id)

  const summary = useQuery(getWatchedSummary(true, effectiveUserId))
  const list = useQuery({
    ...getWatchedList({ ...toListQuery(filters), userId: effectiveUserId }),
    placeholderData: keepPreviousData
  })

  const setFilters = useCallback(
    (next: WatchedFilters, scrollTop = false) => {
      const qs = filtersToSearch(next)
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      if (scrollTop) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [router, pathname]
  )

  // Xoá phim cuối của trang cuối → lùi về trang còn phim
  const totalPages = list.data?.totalPages ?? 1
  useEffect(() => {
    if (!list.isPlaceholderData && list.data && filters.page > totalPages) setFilters({ ...filters, page: totalPages })
  }, [list.data, list.isPlaceholderData, filters, totalPages, setFilters])

  const rate = (movie: WatchedMovie) => {
    if (isOwner) openRating(toRatingTarget(movie))
  }
  const remove = (movie: WatchedMovie) => {
    if (isOwner) deleteWatched(toRatingTarget(movie))
  }

  const total = summary.data?.total ?? 0
  const loadingFirst = summary.isPending || (list.isPending && !list.data)
  const categoryName = summary.data?.categories.find(c => c.slug === filters.category)?.name
  const countryName = summary.data?.countries.find(c => c.slug === filters.country)?.name
  const error = summary.error ?? list.error

  return (
    <div ref={topRef} className='scroll-mt-24'>
      <div className='dx-wh'>
        <span className='c-marker' />
        <h2>Đã xem</h2>
        {summary.data ? (
          <>
            <span className='c-pill ghost'>{total} phim</span>
            {summary.data.averageScore !== null && (
              <span className='c-pill yel'>★ {formatAverage(summary.data.averageScore)} trung bình</span>
            )}
          </>
        ) : (
          <>
            <span className='dx-sk' style={{ width: 76, height: 24, borderRadius: 99 }} />
            <span className='dx-sk' style={{ width: 120, height: 24, borderRadius: 99 }} />
          </>
        )}
        {isOwner && (
          <span className='dx-r'>
            <WatchedIcon name='lock' size={13} />
            Điểm & bình luận chỉ mình bạn thấy nếu không công khai
          </span>
        )}
      </div>

      {error && !list.data ? (
        watchedErrorMessage(error).includes('riêng tư') ? (
          <ProfilePrivateLocked
            title='Danh sách đã xem riêng tư'
            description='Người dùng này đã đặt danh sách phim đã xem ở chế độ riêng tư.'
            backHref={effectiveUserId ? `/profile/${effectiveUserId}` : '/profile'}
          />
        ) : (
          <WatchedError
            message={watchedErrorMessage(error)}
            onRetry={() => {
              summary.refetch()
              list.refetch()
            }}
          />
        )
      ) : summary.data && total === 0 ? (
        <WatchedEmpty isOwner={isOwner} />
      ) : (
        <>
          <WatchedToolbar
            filters={filters}
            categories={summary.data?.categories ?? []}
            countries={summary.data?.countries ?? []}
            unratedCount={summary.data?.unratedCount ?? 0}
            busy={loadingFirst}
            onChange={patch => setFilters({ ...filters, ...patch, page: 1 })}
          />

          {loadingFirst ? (
            <WatchedGridSkeleton />
          ) : list.data && list.data.count === 0 ? (
            <WatchedNoResult
              description={describeNoResult(filters, categoryName, countryName)}
              onClear={() => setFilters({ ...filters, stars: 'all', category: null, country: null, page: 1 })}
            />
          ) : (
            <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <div className='dx-grid'>
                {list.data?.data.map(movie => (
                  <WatchedCard
                    key={movie.id}
                    movie={movie}
                    isOwner={isOwner}
                    onRate={rate}
                    onDelete={remove}
                    onMore={setSheetMovie}
                  />
                ))}
              </div>
              <WatchedPagination
                page={filters.page}
                totalPages={totalPages}
                onPage={page => setFilters({ ...filters, page }, true)}
              />
            </div>
          )}
        </>
      )}

      {isOwner && sheetMovie && (
        <WatchedActionSheet movie={sheetMovie} onClose={() => setSheetMovie(null)} onRate={rate} onDelete={remove} />
      )}
    </div>
  )
}
