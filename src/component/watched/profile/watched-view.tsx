'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

const formatAverage = (n: number) => n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Tab "Đã xem" trong Hồ sơ: lưới phim + sắp xếp / lọc / phân trang (trạng thái nằm trên URL)
export default function WatchedView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)
  const { openRating, deleteWatched } = useWatched()
  const [sheetMovie, setSheetMovie] = useState<WatchedMovie | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const summary = useQuery(getWatchedSummary())
  const list = useQuery({ ...getWatchedList(toListQuery(filters)), placeholderData: keepPreviousData })

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

  const rate = (movie: WatchedMovie) => openRating(toRatingTarget(movie))
  const remove = (movie: WatchedMovie) => deleteWatched(toRatingTarget(movie))

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
        <span className='dx-r'>
          <WatchedIcon name='lock' size={13} />
          Điểm & ghi chú chỉ mình bạn thấy
        </span>
      </div>

      {error && !list.data ? (
        <WatchedError
          message={watchedErrorMessage(error)}
          onRetry={() => {
            summary.refetch()
            list.refetch()
          }}
        />
      ) : summary.data && total === 0 ? (
        <WatchedEmpty />
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
                  <WatchedCard key={movie.id} movie={movie} onRate={rate} onDelete={remove} onMore={setSheetMovie} />
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

      {sheetMovie && (
        <WatchedActionSheet movie={sheetMovie} onClose={() => setSheetMovie(null)} onRate={rate} onDelete={remove} />
      )}
    </div>
  )
}
