import type { WatchedFacet, WatchedSummary, WatchedTaxonomy } from '@/types/watched'

export type WatchedSummaryRow = {
  score: number | null
  categories: WatchedTaxonomy[] | null
  countries: WatchedTaxonomy[] | null
}

// Đếm số phim theo từng thể loại / quốc gia — nhiều phim nhất lên đầu, bằng nhau thì theo tên
function toFacets(lists: (WatchedTaxonomy[] | null)[]): WatchedFacet[] {
  const bySlug = new Map<string, WatchedFacet>()
  for (const list of lists) {
    for (const { slug, name } of list ?? []) {
      const prev = bySlug.get(slug)
      bySlug.set(slug, { slug, name: prev?.name ?? name, count: (prev?.count ?? 0) + 1 })
    }
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
}

/** Gom số liệu toàn bộ danh sách "Đã xem": tổng, số chưa chấm, điểm trung bình, facet lọc */
export function summarizeWatched(rows: WatchedSummaryRow[]): WatchedSummary {
  const scores = rows.map(r => r.score).filter((s): s is number => typeof s === 'number')
  const averageScore = scores.length
    ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
    : null

  return {
    total: rows.length,
    unratedCount: rows.length - scores.length,
    averageScore,
    categories: toFacets(rows.map(r => r.categories)),
    countries: toFacets(rows.map(r => r.countries))
  }
}
