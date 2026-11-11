import { describe, expect, it } from 'vitest'
import type { EpisodeServer } from '@/types/movie'
import { findEpisode, roomEpisodeOf, sameEpisode, sameMovie, toRoomMovie } from './room-media'

const ep = (name: string, slug: string, m3u8 = '') => ({
  name,
  slug,
  filename: '',
  link_embed: `e-${name}`,
  link_m3u8: m3u8
})
const SERVERS: EpisodeServer[] = [
  { server_name: 'Vietsub', server_data: [ep('Tập 1', 'tap-1', 'a.m3u8'), ep('Tập 2', 'tap-2', 'b.m3u8')] },
  { server_name: 'Thuyết minh', server_data: [ep('Tập 1', 'tap-1'), ep('Tập 2', '')] }
]

describe('findEpisode', () => {
  it('khớp đúng server + key', () => {
    expect(
      findEpisode(SERVERS, { serverName: 'Thuyết minh', episodeKey: 'Tập 2', episodeName: 'Tập 2' })?.item.link_embed
    ).toBe('e-Tập 2')
  })
  it('server không còn → lấy cùng key ở server khác; không có → tập đầu', () => {
    expect(findEpisode(SERVERS, { serverName: 'X', episodeKey: 'tap-2', episodeName: 'Tập 2' })?.serverName).toBe(
      'Vietsub'
    )
    expect(findEpisode(SERVERS, null)?.item.name).toBe('Tập 1')
    expect(findEpisode([], null)).toBeNull()
  })
})

describe('roomEpisodeOf / so sánh', () => {
  it('episodeKey = slug || name', () => {
    expect(roomEpisodeOf('Thuyết minh', ep('Tập 2', ''))).toEqual({
      serverName: 'Thuyết minh',
      episodeKey: 'Tập 2',
      episodeName: 'Tập 2'
    })
  })
  it('sameEpisode / sameMovie', () => {
    const a = { serverName: 'V', episodeKey: 'k', episodeName: 'x' }
    expect(sameEpisode(a, { ...a, episodeName: 'khác' })).toBe(true)
    expect(sameEpisode(a, null)).toBe(false)
    expect(sameEpisode(null, null)).toBe(true)
    const m = { source: 'kkphim' as const, slug: 's', title: 't', poster: '' }
    expect(sameMovie(m, { ...m, title: 'khác' })).toBe(true)
    expect(sameMovie(m, { ...m, source: 'vsmov' })).toBe(false)
  })
})

describe('toRoomMovie', () => {
  it('chỉ giữ poster http(s)', () => {
    expect(toRoomMovie({ slug: 'a', name: 'A', poster_url: '/x.jpg', thumb_url: 'https://i/x.jpg' }, 'ophim')).toEqual({
      source: 'vsmov',
      slug: 'a',
      title: 'A',
      poster: 'https://i/x.jpg'
    })
  })
})
