type Movie = {
  name: string
  image: string
  slug: string
  episodeName?: string
  source?: string
}

export type WatchingItem = Movie & {
  progress: number
  duration: number
  percent: number
}

const STORAGE_KEY = 'viewHistory'
const EXPIRE_DAYS = 30

export function saveViewHistory(movie: Movie) {
  if (typeof window === 'undefined') return

  const now = Date.now()
  const expireAt = now + EXPIRE_DAYS * 24 * 60 * 60 * 1000

  let history: { data: Movie; expireAt: number }[] = []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      history = JSON.parse(stored)

      // lọc bỏ item hết hạn hoặc có dữ liệu rỗng
      history = history.filter(
        item =>
          item.expireAt > now &&
          item.data &&
          item.data.name.trim() !== '' &&
          item.data.image.trim() !== '' &&
          item.data.slug.trim() !== ''
      )
    }
  } catch (e) {
    console.error('Parse history failed', e)
  }

  // xóa trùng
  history = history.filter(item => item.data.slug !== movie.slug)

  // thêm lại
  history.unshift({ data: movie, expireAt })

  // 50 cái
  if (history.length > 50) {
    history = history.slice(0, 50)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function saveWatchProgress(key: string, time: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`watchProgress_${key}`, String(time))
  } catch {}
}

export function getWatchProgress(key: string): number {
  if (typeof window === 'undefined') return 0
  try {
    return Number(localStorage.getItem(`watchProgress_${key}`)) || 0
  } catch {
    return 0
  }
}

export function clearWatchProgress(key: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`watchProgress_${key}`)
    localStorage.removeItem(`watchDuration_${key}`)
  } catch {}
}

export function saveWatchDuration(key: string, duration: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`watchDuration_${key}`, String(duration))
  } catch {}
}

export function getWatchDuration(key: string): number {
  if (typeof window === 'undefined') return 0
  try {
    return Number(localStorage.getItem(`watchDuration_${key}`)) || 0
  } catch {
    return 0
  }
}

export function getWatchingInProgress(): WatchingItem[] {
  const history = getViewHistory()
  const result: WatchingItem[] = []

  for (const movie of history) {
    if (!movie.episodeName) continue
    const key = `${movie.slug}_${movie.episodeName}`
    const progress = getWatchProgress(key)
    const duration = getWatchDuration(key)
    
    // Nếu là tập 2 trở đi của phim bộ thì luôn hiện dù xem < 30s
    const isMovie = movie.episodeName.toLowerCase() === 'full' || /^tập\s*0?1$/i.test(movie.episodeName)
    
    if ((progress > 30 || !isMovie) && duration > 0) {
      const percent = Math.min(Math.round((progress / duration) * 100), 99)
      if (percent < 95) {
        result.push({ ...movie, progress, duration, percent })
      }
    }
  }

  return result
}

export function getViewHistory(): Movie[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const now = Date.now()
    let history: { data: Movie; expireAt: number }[] = JSON.parse(stored)

    // lọc bỏ item hết hạn hoặc có dữ liệu rỗng
    history = history.filter(
      item =>
        item.expireAt > now &&
        item.data &&
        item.data.name.trim() !== '' &&
        item.data.image.trim() !== '' &&
        item.data.slug.trim() !== ''
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))

    return history.map(item => item.data)
  } catch {
    return []
  }
}
