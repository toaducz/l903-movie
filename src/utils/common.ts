export const getOphimImageMovie = (appDomain: string, thumb_url: string) => {
  if (!appDomain || !thumb_url) return null
  return `${appDomain}/uploads/movies/${thumb_url}`
}

export const getOptimizedImage = (
  thumbUrl: string | undefined,
  posterUrl: string | undefined,
  priority: 'thumb' | 'poster' = 'poster',
  width: number = 250,
  height: number = 375,
  quality: number = 60
) => {
  const images = priority === 'thumb' ? [thumbUrl, posterUrl] : [posterUrl, thumbUrl]

  const poster =
    images
      .map(u => {
        if (!u || typeof u === 'object') return null
        const s = String(u).trim()
        if (s === '{}' || s === '') return null
        return s.startsWith('http') ? s : `https://phimimg.com/${s.replace(/^\/+/, '')}`
      })
      .find(Boolean) ?? null

  return poster
    ? `https://wsrv.nl/?url=${encodeURIComponent(poster)}&w=${width}&h=${height}&fit=cover&output=webp&q=${quality}`
    : null
}
