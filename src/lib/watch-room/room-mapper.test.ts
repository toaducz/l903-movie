import { describe, expect, it } from 'vitest'
import { mapMessageRow, mapRoomRow } from './room-mapper'

const ROW = {
  id: 'room-1',
  name: 'Tui với Hùng',
  owner_id: 'u-owner',
  movie: { source: 'kkphim', slug: 'phim-a', title: 'Phim A', poster: 'https://img/a.jpg' },
  server_name: 'Vietsub #1',
  episode_slug: 'tap-3',
  episode_name: 'Tập 3',
  position_sec: '35.5',
  is_playing: false,
  state_updated_at: '2026-11-11T10:00:00Z',
  state_updated_by: 'u-owner',
  last_activity_at: '2026-11-11T10:05:00Z'
}
const MEMBERS = [
  { user_id: 'u-owner', display_name: 'hung', joined_at: '2026-11-10T10:00:00Z' },
  { user_id: 'u-me', display_name: 'minhanh', joined_at: '2026-11-10T11:00:00Z' }
]

describe('mapRoomRow', () => {
  it('snake_case → camelCase, position_sec chuỗi → số', () => {
    const room = mapRoomRow(ROW, MEMBERS, 'u-me')
    expect(room).toMatchObject({
      id: 'room-1',
      name: 'Tui với Hùng',
      lastActivityAt: '2026-11-11T10:05:00Z',
      state: {
        movie: { source: 'kkphim', slug: 'phim-a', title: 'Phim A', poster: 'https://img/a.jpg' },
        episode: { serverName: 'Vietsub #1', episodeKey: 'tap-3', episodeName: 'Tập 3' },
        positionSec: 35.5,
        isPlaying: false,
        updatedAt: '2026-11-11T10:00:00Z',
        updatedBy: 'u-owner'
      }
    })
  })
  it('isOwner đúng theo owner_id', () => {
    const room = mapRoomRow(ROW, MEMBERS, 'u-me')
    expect(room.members.find(m => m.userId === 'u-owner')?.isOwner).toBe(true)
    expect(room.members.find(m => m.userId === 'u-me')?.isOwner).toBe(false)
  })
  it('episode null khi episode_slug null; movie hỏng → null', () => {
    const room = mapRoomRow({ ...ROW, episode_slug: null, movie: 'x', position_sec: null }, [], 'u-me')
    expect(room.state.episode).toBeNull()
    expect(room.state.movie).toBeNull()
    expect(room.state.positionSec).toBe(0)
  })
})

describe('mapMessageRow', () => {
  it('map tin text và event', () => {
    expect(
      mapMessageRow({
        id: 'm1',
        room_id: 'r',
        user_id: 'u',
        kind: 'text',
        text: 'hi',
        event: null,
        created_at: '2026-11-11T10:00:00Z'
      })
    ).toEqual({
      id: 'm1',
      roomId: 'r',
      userId: 'u',
      kind: 'text',
      text: 'hi',
      event: null,
      createdAt: '2026-11-11T10:00:00Z'
    })
    expect(
      mapMessageRow({ id: 'm2', room_id: 'r', user_id: 'u', kind: 'event', event: { type: 'seek', value: '1:00' } })
        ?.event
    ).toEqual({ type: 'seek', value: '1:00' })
  })
  it('row hỏng → null', () => {
    expect(mapMessageRow(null)).toBeNull()
    expect(mapMessageRow({ id: 1 })).toBeNull()
  })
})
