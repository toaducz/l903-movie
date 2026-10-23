'use client'

import WatchedIcon from '@/component/watched/watched-icon'

interface WatchedPaginationProps {
  page: number
  totalPages: number
  onPage: (page: number) => void
}

/** Dãy số trang gọn: 1 … 4 5 6 … 11 (luôn có trang đầu, cuối và 2 trang quanh trang hiện tại) */
export function pageItems(page: number, total: number): (number | 'gap')[] {
  const pages = [...new Set([1, page - 1, page, page + 1, total])]
    .filter(p => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ['gap' as const, p] : [p]))
}

export default function WatchedPagination({ page, totalPages, onPage }: WatchedPaginationProps) {
  if (totalPages <= 1) return null
  const prev = (
    <button type='button' className='cursor-pointer' aria-label='Trang trước' disabled={page <= 1} onClick={() => onPage(page - 1)}>
      <WatchedIcon name='left' size={18} />
    </button>
  )
  const next = (
    <button type='button' className='cursor-pointer' aria-label='Trang sau' disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
      <WatchedIcon name='right' size={18} />
    </button>
  )

  return (
    <nav aria-label='Phân trang'>
      <div className='dx-pg dx-pg-d'>
        {prev}
        {pageItems(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className='dx-gap'>
              …
            </span>
          ) : (
            <button
              key={p}
              type='button'
              className={`cursor-pointer transition-colors duration-200 ${p === page ? 'on' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )
        )}
        {next}
      </div>
      <div className='dx-pg dx-pg-m' style={{ marginTop: 32, justifyContent: 'space-between' }}>
        {prev}
        <span className='font-extrabold text-sm'>
          Trang {page} <span className='text-[var(--c-faint)]'>/ {totalPages}</span>
        </span>
        {next}
      </div>
    </nav>
  )
}
