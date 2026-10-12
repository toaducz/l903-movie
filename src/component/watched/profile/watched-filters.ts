import type { WatchedListQuery, WatchedSort } from '@/types/watched'

// Trạng thái lọc của tab "Đã xem" — lưu trên URL (?sort=&stars=&category=&country=&page=) để Back / chia sẻ link giữ nguyên

export type StarFilter = 'all' | '5' | '4' | '3' | 'unrated'

export interface WatchedFilters {
  sort: WatchedSort
  stars: StarFilter
  category: string | null
  country: string | null
  page: number
}

export const WATCHED_PAGE_SIZE = 24
export const DEFAULT_SORT: WatchedSort = 'score'

export const SORT_OPTIONS: { value: WatchedSort; label: string }[] = [
  { value: 'score', label: 'Điểm cao nhất' },
  { value: 'recent', label: 'Mới xem gần đây' },
  { value: 'name', label: 'Tên A–Z' }
]

export const STAR_OPTIONS: { value: StarFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: '5', label: '5★' },
  { value: '4', label: '≥ 4★' },
  { value: '3', label: '≥ 3★' },
  { value: 'unrated', label: 'Chưa chấm' }
]

const SORTS = SORT_OPTIONS.map(o => o.value)
const STARS = STAR_OPTIONS.map(o => o.value)

export function parseFilters(params: URLSearchParams): WatchedFilters {
  const sort = params.get('sort') as WatchedSort | null
  const stars = params.get('stars') as StarFilter | null
  const page = parseInt(params.get('page') ?? '', 10)
  return {
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_SORT,
    stars: stars && STARS.includes(stars) ? stars : 'all',
    category: params.get('category') || null,
    country: params.get('country') || null,
    page: Number.isFinite(page) && page > 0 ? page : 1
  }
}

/** Chỉ ghi các giá trị khác mặc định để URL gọn */
export function filtersToSearch(f: WatchedFilters): string {
  const params = new URLSearchParams()
  if (f.sort !== DEFAULT_SORT) params.set('sort', f.sort)
  if (f.stars !== 'all') params.set('stars', f.stars)
  if (f.category) params.set('category', f.category)
  if (f.country) params.set('country', f.country)
  if (f.page > 1) params.set('page', String(f.page))
  return params.toString()
}

export function toListQuery(f: WatchedFilters): Partial<WatchedListQuery> {
  return {
    page: f.page,
    limit: WATCHED_PAGE_SIZE,
    sort: f.sort,
    ...(f.stars === 'unrated' ? { unrated: true } : f.stars !== 'all' && { minScore: Number(f.stars) }),
    ...(f.category && { category: f.category }),
    ...(f.country && { country: f.country })
  }
}

/** Số bộ lọc đang bật (cho nút "Lọc · N" trên mobile — chỉ thể loại / quốc gia) */
export const taxonomyFilterCount = (f: WatchedFilters): number => Number(!!f.category) + Number(!!f.country)

export const hasAnyFilter = (f: WatchedFilters): boolean => f.stars !== 'all' || taxonomyFilterCount(f) > 0

/** Câu mô tả cho trạng thái "Lọc không ra kết quả", vd "Chưa có phim Thái Lan nào được 5★." */
export function describeNoResult(f: WatchedFilters, categoryName?: string, countryName?: string): string {
  const what = ['phim', categoryName, countryName].filter(Boolean).join(' ')
  const stars =
    f.stars === 'unrated'
      ? 'còn chưa chấm'
      : f.stars === '5'
        ? 'được 5★'
        : f.stars !== 'all'
          ? `được từ ${f.stars}★ trở lên`
          : 'trong Đã xem'
  return `Chưa có ${what} nào ${stars}. Thử nới bộ lọc xem sao.`
}
