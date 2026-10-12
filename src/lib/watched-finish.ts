import type { MovieDetail } from '@/types/movie'

// Điều kiện banner "Xem xong rồi?" cuối phim (design_handoff_da_xem mục 6)

export const FINISH_THRESHOLD = 0.9

/** Tập đang xem có phải tập cuối của phim đã hoàn tất không (phim đang chiếu thì tập mới nhất chưa phải tập cuối) */
export function isFinalEpisode(detail: MovieDetail, episodeLink: string | null): boolean {
  if (!episodeLink) return false
  const server = detail.episodes.find(s => s.server_data.some(ep => ep.link_embed === episodeLink))
  if (!server || server.server_data[server.server_data.length - 1]?.link_embed !== episodeLink) return false
  const { status, episode_total } = detail.movie
  if (/ongoing|đang chiếu|trailer|sắp chiếu/i.test(status ?? '')) return false
  const total = parseInt(episode_total ?? '', 10)
  return !(Number.isFinite(total) && server.server_data.length < total)
}
