export type WatchedSource = 'vsmov' | 'kkphim' | 'nguonc'

export interface WatchedTaxonomy {
  slug: string
  name: string
}

export interface WatchedMovie {
  id: string
  slug: string
  source: WatchedSource
  name: string
  origin_name: string | null
  image: string | null
  year: number | null
  categories: WatchedTaxonomy[]
  countries: WatchedTaxonomy[]
  score: number | null // null = đã xem nhưng chưa chấm
  note: string | null
  watched_at: string
  updated_at: string
}

// Body của POST /api/watched — đánh dấu đã xem hoặc sửa điểm/ghi chú.
// Trường nào không gửi lên thì giữ nguyên giá trị cũ (gửi `score: null` để xoá điểm).
export interface WatchedUpsertInput {
  slug: string
  source: WatchedSource
  name: string
  origin_name?: string | null
  image?: string | null
  year?: number | null
  categories?: WatchedTaxonomy[]
  countries?: WatchedTaxonomy[]
  score?: number | null
  note?: string | null
}

export type WatchedSort = 'score' | 'recent' | 'name'

export interface WatchedListQuery {
  page: number
  limit: number
  sort: WatchedSort
  minScore?: number
  unrated?: boolean // chỉ phim chưa chấm (bỏ qua minScore)
  category?: string
  country?: string
}

export interface WatchedListResponse {
  data: WatchedMovie[]
  count: number
  page: number
  totalPages: number
}

export interface WatchedFacet extends WatchedTaxonomy {
  count: number
}

// GET /api/watched?summary=1 — số liệu toàn bộ danh sách (tab, tiêu đề, bộ lọc)
export interface WatchedSummary {
  total: number
  unratedCount: number
  averageScore: number | null // tính trên phim đã chấm, làm tròn 1 chữ số
  categories: WatchedFacet[]
  countries: WatchedFacet[]
}
