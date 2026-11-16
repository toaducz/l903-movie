import type { EpisodeItem, EpisodeServer, MovieSource } from '@/types/movie'
import type { RoomEpisode, RoomMovie } from '@/types/watch-room'
import { episodeKeyOf } from './validation'

// Ghép trạng thái phòng (phim / tập) với dữ liệu phim thật từ API nguồn

export type ResolvedEpisode = { serverName: string; item: EpisodeItem }

export const roomEpisodeOf = (serverName: string, item: EpisodeItem): RoomEpisode => ({
  serverName,
  episodeKey: episodeKeyOf(item),
  episodeName: item.name || episodeKeyOf(item)
})

/** Tìm tập theo (server, key); server đổi tên thì tìm key ở server khác; không thấy → tập đầu */
export function findEpisode(servers: EpisodeServer[], episode: RoomEpisode | null): ResolvedEpisode | null {
  const all = servers.flatMap(s => s.server_data.map(item => ({ serverName: s.server_name, item })))
  if (!all.length) return null
  if (!episode) return all[0]
  const byKey = (e: ResolvedEpisode) => episodeKeyOf(e.item) === episode.episodeKey
  return all.find(e => e.serverName === episode.serverName && byKey(e)) ?? all.find(byKey) ?? all[0]
}

/** Tìm tập theo link_embed (tập đang chọn ở trang chi tiết) */
export function findEpisodeByLink(servers: EpisodeServer[], link: string | null | undefined): ResolvedEpisode | null {
  if (!link) return null
  for (const s of servers) {
    const item = s.server_data.find(e => e.link_embed === link)
    if (item) return { serverName: s.server_name, item }
  }
  return null
}

export const sameEpisode = (a: RoomEpisode | null, b: RoomEpisode | null): boolean =>
  a === b || (!!a && !!b && a.serverName === b.serverName && a.episodeKey === b.episodeKey)

export const sameMovie = (a: RoomMovie | null, b: RoomMovie | null): boolean =>
  a === b || (!!a && !!b && a.source === b.source && a.slug === b.slug)

const httpUrl = (url: string | undefined) => (url && /^https?:\/\//.test(url) ? url : '')

/** Phim (từ trang chi tiết / kết quả tìm) → RoomMovie; 'ophim' cũ = 'vsmov' */
export function toRoomMovie(
  movie: { slug: string; name: string; poster_url?: string; thumb_url?: string },
  source: MovieSource
): RoomMovie {
  return {
    source: source === 'ophim' ? 'vsmov' : source,
    slug: movie.slug,
    title: movie.name,
    poster: httpUrl(movie.poster_url) || httpUrl(movie.thumb_url)
  }
}

export const SOURCE_COLORS: Record<string, string> = { kkphim: '#1890ff', vsmov: '#7c3aed', nguonc: '#52c41a' }
export const SOURCE_LABELS: Record<string, string> = { kkphim: 'KKPHIM', vsmov: 'VSMOV', nguonc: 'NGUỒN C' }
