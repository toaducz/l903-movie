'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCombinedSearch } from '@/services/movie-service'
import { resolveMovieSource } from '@/utils/env'
import { SOURCE_LABELS } from '@/lib/watch-room/room-media'
import type { MovieItem } from '@/types/movie'
import XcIcon from './xc-icon'
import Poster from './poster'

// Ô tìm phim để mở trong phòng — dùng API tìm gộp, ưu tiên KKPHIM (tự đồng bộ) lên đầu

const DEBOUNCE_MS = 400
const MIN_KEYWORD = 2
const MAX_RESULTS = 8

type Props = {
  onPick: (item: MovieItem) => void
  busySlug?: string | null
  autoFocus?: boolean
}

export default function MovieSearch({ onPick, busySlug, autoFocus }: Props) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [input])

  const { data, isFetching, isError } = useQuery({
    ...getCombinedSearch({ keyword, limit: 12 }),
    enabled: keyword.length >= MIN_KEYWORD
  })

  const results = useMemo(() => {
    const items = data?.items ?? []
    const isKK = (m: MovieItem) => resolveMovieSource(m.source) === 'kkphim'
    return [...items.filter(isKK), ...items.filter(m => !isKK(m))].slice(0, MAX_RESULTS)
  }, [data])

  const showList = keyword.length >= MIN_KEYWORD

  return (
    <div className='xc-srch'>
      <span className='si'>
        <XcIcon name='search' size={20} />
      </span>
      <input
        className='xc-inp'
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder='Tìm phim đi mại dô…'
        aria-label='Tìm phim để mở trong phòng'
        autoFocus={autoFocus}
        maxLength={100}
      />
      {showList && (
        <div className='xc-res' role='listbox' aria-label='Kết quả tìm phim' aria-busy={isFetching}>
          {isError && <p className='p-3 text-sm text-[var(--c-dim)]'>Không tìm được, thử lại sau nhé.</p>}
          {!isError && !results.length && (
            <p className='p-3 text-sm text-[var(--c-dim)]'>{isFetching ? 'Đang tìm…' : 'Không thấy phim nào.'}</p>
          )}
          {results.map((m, i) => {
            const source = resolveMovieSource(m.source)
            const synced = source === 'kkphim'
            return (
              <div key={`${source}-${m.slug}`} className='xc-ri' role='option' aria-selected={false}>
                <Poster src={m.poster_url || m.thumb_url} width={36} />
                <div className='flex-1 min-w-0 text-left'>
                  <b className='truncate'>{m.name}</b>
                  <small>
                    {[m.year, SOURCE_LABELS[source] ?? source, synced ? 'tự đồng bộ' : 'không tự đồng bộ']
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </div>
                <button
                  type='button'
                  className={`dx-b dx-b-sm ${i === 0 ? 'dx-b-pri' : 'dx-b-gh'} !h-[34px] !px-3 !text-xs`}
                  style={i === 0 ? { boxShadow: '2px 2px 0 var(--c-yel)' } : undefined}
                  disabled={!!busySlug}
                  onClick={() => onPick({ ...m, source })}
                >
                  {busySlug === m.slug ? <span className='xc-spin' /> : 'Mở'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
