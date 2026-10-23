'use client'

import { useState } from 'react'
import BottomSheet from '@/component/watched/bottom-sheet'
import WatchedIcon from '@/component/watched/watched-icon'
import FacetDropdown from './facet-dropdown'
import {
  SORT_OPTIONS,
  STAR_OPTIONS,
  taxonomyFilterCount,
  type StarFilter,
  type WatchedFilters
} from '@/utils/watched-filters'
import type { WatchedFacet, WatchedSort } from '@/types/watched'

type FilterPatch = Partial<Omit<WatchedFilters, 'page'>>

interface WatchedToolbarProps {
  filters: WatchedFilters
  categories: WatchedFacet[]
  countries: WatchedFacet[]
  unratedCount: number
  busy: boolean
  onChange: (patch: FilterPatch) => void
}

export default function WatchedToolbar(props: WatchedToolbarProps) {
  return (
    <>
      <DesktopToolbar {...props} />
      <MobileToolbar {...props} />
    </>
  )
}

function StarChips({
  value,
  unratedCount,
  onPick
}: {
  value: StarFilter
  unratedCount: number
  onPick: (v: StarFilter) => void
}) {
  return STAR_OPTIONS.map(o => (
    <button
      key={o.value}
      type='button'
      className={`dx-chip cursor-pointer transition-colors duration-200 ${value === o.value ? 'on' : ''}`}
      aria-pressed={value === o.value}
      onClick={() => onPick(o.value)}
    >
      {o.value === 'unrated' && unratedCount > 0 ? `${o.label} · ${unratedCount}` : o.label}
    </button>
  ))
}

function DesktopToolbar({ filters, categories, countries, unratedCount, busy, onChange }: WatchedToolbarProps) {
  return (
    <div className={`dx-tb ${busy ? 'dx-busy' : ''}`}>
      <div className='dx-seg' role='group' aria-label='Sắp xếp'>
        {SORT_OPTIONS.map(o => (
          <button
            key={o.value}
            type='button'
            className={`cursor-pointer transition-colors duration-200 ${filters.sort === o.value ? 'on' : ''}`}
            aria-pressed={filters.sort === o.value}
            onClick={() => onChange({ sort: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className='dx-vr' />
      <FacetDropdown
        label='Thể loại'
        facets={categories}
        value={filters.category}
        onChange={category => onChange({ category })}
      />
      <FacetDropdown
        label='Quốc gia'
        facets={countries}
        value={filters.country}
        onChange={country => onChange({ country })}
      />
      <span className='dx-vr' />
      <div className='dx-chips flex-wrap' role='group' aria-label='Lọc theo số sao'>
        <StarChips value={filters.stars} unratedCount={unratedCount} onPick={stars => onChange({ stars })} />
      </div>
    </div>
  )
}

function MobileToolbar({ filters, categories, countries, unratedCount, busy, onChange }: WatchedToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const activeCount = taxonomyFilterCount(filters)
  const categoryName = categories.find(c => c.slug === filters.category)?.name
  const countryName = countries.find(c => c.slug === filters.country)?.name

  return (
    <div className={`dx-tb-m mt-[18px] mb-[22px] ${busy ? 'dx-busy' : ''}`}>
      <div className='flex gap-2.5 mb-3'>
        <label className='dx-dd flex-1 justify-between cursor-pointer'>
          <span className='sr-only'>Sắp xếp</span>
          <select
            value={filters.sort}
            onChange={e => onChange({ sort: e.target.value as WatchedSort })}
            className='font-bold cursor-pointer'
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <WatchedIcon name='chev' size={14} />
        </label>
        <button
          type='button'
          className={`dx-dd cursor-pointer ${activeCount ? 'act' : ''}`}
          aria-haspopup='dialog'
          onClick={() => setSheetOpen(true)}
        >
          <WatchedIcon name='filter' size={16} />
          {activeCount ? `Lọc · ${activeCount}` : 'Lọc'}
        </button>
      </div>

      <div className='dx-chips scroll' role='group' aria-label='Lọc theo số sao'>
        <StarChips value={filters.stars} unratedCount={unratedCount} onPick={stars => onChange({ stars })} />
      </div>

      {(categoryName || countryName) && (
        <div className='flex gap-1.5 flex-wrap mt-3'>
          {categoryName && (
            <button type='button' className='dx-chip cy cursor-pointer' onClick={() => onChange({ category: null })}>
              Thể loại: {categoryName}
              <WatchedIcon name='x' size={12} />
              <span className='sr-only'>Bỏ lọc</span>
            </button>
          )}
          {countryName && (
            <button type='button' className='dx-chip cy cursor-pointer' onClick={() => onChange({ country: null })}>
              Quốc gia: {countryName}
              <WatchedIcon name='x' size={12} />
              <span className='sr-only'>Bỏ lọc</span>
            </button>
          )}
        </div>
      )}

      {sheetOpen && (
        <BottomSheet label='Lọc phim đã xem' onClose={() => setSheetOpen(false)}>
          <FacetSection
            title='Thể loại'
            facets={categories}
            value={filters.category}
            onPick={category => onChange({ category })}
          />
          <FacetSection
            title='Quốc gia'
            facets={countries}
            value={filters.country}
            onPick={country => onChange({ country })}
          />
          <button
            type='button'
            className='dx-b dx-b-pri w-full mt-4 cursor-pointer transition-colors duration-200'
            style={{ height: 52 }}
            onClick={() => setSheetOpen(false)}
          >
            Xong
          </button>
        </BottomSheet>
      )}
    </div>
  )
}

function FacetSection({
  title,
  facets,
  value,
  onPick
}: {
  title: string
  facets: WatchedFacet[]
  value: string | null
  onPick: (slug: string | null) => void
}) {
  return (
    <section className='pt-3'>
      <h3 className='text-[13px] font-bold mb-2.5'>{title}</h3>
      {facets.length ? (
        <div className='flex gap-1.5 flex-wrap'>
          <button
            type='button'
            className={`dx-chip cursor-pointer transition-colors duration-200 ${!value ? 'on' : ''}`}
            aria-pressed={!value}
            onClick={() => onPick(null)}
          >
            Tất cả
          </button>
          {facets.map(f => (
            <button
              key={f.slug}
              type='button'
              className={`dx-chip cursor-pointer transition-colors duration-200 ${value === f.slug ? 'on' : ''}`}
              aria-pressed={value === f.slug}
              onClick={() => onPick(value === f.slug ? null : f.slug)}
            >
              {f.name} <span className='font-mono text-[11px] opacity-60'>{f.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className='text-xs text-[var(--c-faint)]'>
          Chưa có dữ liệu — phim đánh dấu từ trang chi tiết sẽ có {title.toLowerCase()}.
        </p>
      )}
    </section>
  )
}
