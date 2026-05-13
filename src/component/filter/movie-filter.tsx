'use client'

import { useQuery } from '@tanstack/react-query'
import { getCategorySlug } from '@/api/ophim/filter/get-category-slug'
import { getCountrySlug } from '@/api/ophim/filter/get-country-slug'

type FilterProps = {
  country: string
  year: string
  category: string
  sortField: string
  sortType: string
  type?: 'category' | 'year' | 'country'
  onChange: (filters: { country: string; year: string; category: string; sortField: string; sortType: string }) => void
  onSubmit: () => void
  onReset: () => void
}

export default function MovieFilter({
  country,
  year,
  category,
  sortField,
  sortType,
  type,
  onChange,
  onSubmit,
  onReset
}: FilterProps) {
  const { data: categoryData } = useQuery(getCategorySlug())
  const { data: countryData } = useQuery(getCountrySlug())

  const years = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, index) => ({
    slug: String(1970 + index),
    name: String(1970 + index)
  })).reverse()

  return (
    <div className='p-4 bg-slate-800  flex flex-wrap gap-4 items-end pt-8 px-10'>
      {/* Country */}
      {type !== 'country' && (
        <div>
          <label className='block text-sm text-gray-300 mb-1'>Quốc gia</label>
          <select
            value={country}
            onChange={e => onChange({ country: e.target.value, year, category, sortField, sortType })}
            className='px-2 py-1 rounded text-white bg-slate-700'
          >
            <option value=''>Tất cả</option>
            {countryData?.map(item => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      {type !== 'category' && (
        <div>
          <label className='block text-sm text-gray-300 mb-1'>Thể loại</label>
          <select
            value={category}
            onChange={e => onChange({ country, year, category: e.target.value, sortField, sortType })}
            className='px-2 py-1 rounded text-white bg-slate-700'
          >
            <option value=''>Tất cả</option>
            {categoryData?.map(item => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Year */}
      {type !== 'year' && (
        <div>
          <label className='block text-sm text-gray-300 mb-1'>Năm</label>
          <select
            value={year}
            onChange={e => onChange({ country, year: e.target.value, category, sortField, sortType })}
            className='px-2 py-1 rounded text-white bg-slate-700'
          >
            <option value=''>Tất cả</option>
            {years.map(item => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sort field */}
      <div>
        <label className='block text-sm text-gray-300 mb-1'>Sắp xếp theo</label>
        <select
          value={sortField}
          onChange={e => onChange({ country, year, category, sortField: e.target.value, sortType })}
          className='px-2 py-1 rounded text-white bg-slate-700'
        >
          <option value=''>Mặc định</option>
          <option value='year'>Năm phát hành</option>
          <option value='_id'>Lượt xem</option>
          <option value='modified.time'>Thời gian cập nhật</option>
        </select>
      </div>

      {/* Sort type */}
      <div>
        <label className='block text-sm text-gray-300 mb-1'>Thứ tự</label>
        <select
          value={sortType}
          onChange={e => onChange({ country, year, category, sortField, sortType: e.target.value })}
          className='px-2 py-1 rounded text-white bg-slate-700'
        >
          <option value=''>Mặc định</option>
          <option value='asc'>Tăng dần</option>
          <option value='desc'>Giảm dần</option>
        </select>
      </div>

      <button
        onClick={onReset}
        className='ml-auto px-4 py-2 bg-red-600 hover:bg-blue-700 text-white rounded cursor-pointer'
      >
        Reset
      </button>
      <button
        onClick={onSubmit}
        className='ml-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer'
      >
        Lọc phim
      </button>
    </div>
  )
}
