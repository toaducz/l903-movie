import type { WatchedListQuery, WatchedSort, WatchedSource, WatchedTaxonomy, WatchedUpsertInput } from '@/types/watched'

// Kiểm tra input ở biên API (body / query string) — khớp ràng buộc trong supabase/watched_movies.sql

export const WATCHED_NOTE_MAX = 200
const SOURCES: readonly WatchedSource[] = ['vsmov', 'kkphim', 'nguonc']
const SORTS: readonly WatchedSort[] = ['score', 'recent', 'name']
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,254}$/
const MAX_TAXONOMIES = 30

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = <T>(error: string): ValidationResult<T> => ({ ok: false, error })

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_RE.test(value)
}

// 'ophim' là alias cũ của VSMOV (OPhim đã chuyển thành VSMOV)
function parseSource(value: unknown): WatchedSource | null {
  if (value === 'ophim') return 'vsmov'
  return SOURCES.includes(value as WatchedSource) ? (value as WatchedSource) : null
}

function parseOptionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function parseTaxonomies(value: unknown): WatchedTaxonomy[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (t): t is WatchedTaxonomy =>
        !!t && typeof t === 'object' && typeof t.slug === 'string' && typeof t.name === 'string' && !!t.slug
    )
    .slice(0, MAX_TAXONOMIES)
    .map(t => ({ slug: t.slug.slice(0, 100), name: t.name.slice(0, 100) }))
}

export function parseWatchedUpsert(body: unknown): ValidationResult<WatchedUpsertInput> {
  if (!body || typeof body !== 'object') return fail('Body không hợp lệ')
  const b = body as Record<string, unknown>

  if (!isValidSlug(b.slug)) return fail('slug không hợp lệ')
  const source = parseSource(b.source)
  if (!source) return fail('source phải là vsmov, kkphim hoặc nguonc')
  const name = parseOptionalText(b.name, 500)
  if (!name) return fail('Thiếu tên phim')

  let score: number | null | undefined
  if (b.score === null) score = null
  else if (b.score !== undefined) {
    if (typeof b.score !== 'number' || !Number.isInteger(b.score) || b.score < 1 || b.score > 5) {
      return fail('score phải là số nguyên 1–5 hoặc null')
    }
    score = b.score
  }

  if (typeof b.note === 'string' && b.note.trim().length > WATCHED_NOTE_MAX) {
    return fail(`Ghi chú tối đa ${WATCHED_NOTE_MAX} ký tự`)
  }

  let year: number | null | undefined
  if (b.year === null) year = null
  else if (b.year !== undefined) {
    const n = Number(b.year)
    year = Number.isInteger(n) && n >= 1880 && n <= 2100 ? n : null
  }

  const image = parseOptionalText(b.image, 2000)
  if (image && !/^https?:\/\//.test(image)) return fail('image phải là URL http(s)')

  const value: WatchedUpsertInput = { slug: b.slug, source, name }
  const optional = {
    origin_name: parseOptionalText(b.origin_name, 500),
    image,
    year,
    categories: parseTaxonomies(b.categories),
    countries: parseTaxonomies(b.countries),
    score,
    note: parseOptionalText(b.note, WATCHED_NOTE_MAX)
  }
  // Chỉ giữ các trường client thật sự gửi lên → không ghi đè dữ liệu cũ bằng undefined
  const provided = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined))
  return { ok: true, value: { ...value, ...provided } }
}

export function parseWatchedListQuery(params: URLSearchParams): WatchedListQuery {
  const toInt = (v: string | null, fallback: number, min: number, max: number) => {
    const n = parseInt(v ?? '', 10)
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
  }
  const sortParam = params.get('sort') as WatchedSort | null
  const minScore = params.get('min_score')
  const category = params.get('category')
  const country = params.get('country')

  return {
    page: toInt(params.get('page'), 1, 1, 10_000),
    limit: toInt(params.get('limit'), 24, 1, 100),
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : 'recent',
    ...(params.get('unrated') === '1'
      ? { unrated: true }
      : minScore !== null && { minScore: toInt(minScore, 1, 1, 5) }),
    ...(category && isValidSlug(category) && { category }),
    ...(country && isValidSlug(country) && { country })
  }
}
