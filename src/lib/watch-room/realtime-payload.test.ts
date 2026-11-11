import { describe, expect, it } from 'vitest'
import { parseControlMessage, parsePresence, parseReaction } from './realtime-payload'

const VALID = {
  type: 'seek',
  positionSec: 12.5,
  isPlaying: true,
  episode: { serverName: 'Vietsub', episodeKey: 'tap-1', episodeName: 'Tập 1' },
  movie: null,
  sentAt: 1_700_000_000_000,
  by: 'u1'
}

describe('parseControlMessage', () => {
  it('nhận payload hợp lệ', () => {
    expect(parseControlMessage(VALID)).toEqual(VALID)
  })
  it('từ chối type lạ, số không hữu hạn, thiếu by', () => {
    expect(parseControlMessage({ ...VALID, type: 'hack' })).toBeNull()
    expect(parseControlMessage({ ...VALID, positionSec: Infinity })).toBeNull()
    expect(parseControlMessage({ ...VALID, positionSec: -1 })).toBeNull()
    expect(parseControlMessage({ ...VALID, sentAt: 'x' })).toBeNull()
    expect(parseControlMessage({ ...VALID, by: '' })).toBeNull()
    expect(parseControlMessage(null)).toBeNull()
  })
  it('episode / movie sai định dạng → null cả lệnh', () => {
    expect(parseControlMessage({ ...VALID, episode: { serverName: 1 } })).toBeNull()
    expect(parseControlMessage({ ...VALID, movie: { source: 'x' } })).toBeNull()
  })
})

describe('parseReaction', () => {
  it('chỉ nhận 6 emoji cho phép, cắt tên', () => {
    expect(parseReaction({ emoji: '🔥', by: 'u1', displayName: 'a'.repeat(50) })).toEqual({
      emoji: '🔥',
      by: 'u1',
      displayName: 'a'.repeat(40)
    })
    expect(parseReaction({ emoji: '<img>', by: 'u1', displayName: 'x' })).toBeNull()
  })
})

describe('parsePresence', () => {
  it('lấy bản mới nhất mỗi người, bỏ bản hỏng', () => {
    const list = parsePresence({
      u1: [
        { userId: 'u1', displayName: 'a', positionSec: 1, isPlaying: false, episodeKey: null, onlineAt: 1 },
        { userId: 'u1', displayName: 'a', positionSec: 5, isPlaying: true, episodeKey: 'tap-1', onlineAt: 2 }
      ],
      u2: [{ userId: 'u2' }]
    })
    expect(list).toEqual([
      { userId: 'u1', displayName: 'a', positionSec: 5, isPlaying: true, episodeKey: 'tap-1', onlineAt: 2 }
    ])
  })
})
