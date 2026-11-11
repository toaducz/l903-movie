import { describe, expect, it } from 'vitest'
import {
  episodeKeyOf,
  isIsoTimestamp,
  isLoggableEvent,
  isUuid,
  isValidInviteToken,
  parseMessageText,
  parseRoomEpisode,
  parseRoomMovie,
  parseRoomName
} from './validation'

describe('parseRoomName', () => {
  it('trim và nhận tên hợp lệ', () => {
    expect(parseRoomName('  Tui với Hùng ')).toEqual({ ok: true, value: 'Tui với Hùng' })
    expect(parseRoomName('a'.repeat(40)).ok).toBe(true)
  })
  it('từ chối rỗng, toàn khoảng trắng, quá 40 ký tự, không phải chuỗi', () => {
    for (const input of ['', '   ', 'a'.repeat(41), 123, null, undefined]) {
      expect(parseRoomName(input).ok).toBe(false)
    }
  })
})

describe('parseMessageText', () => {
  it('nhận đúng 500 ký tự, từ chối 501', () => {
    expect(parseMessageText('a'.repeat(500)).ok).toBe(true)
    expect(parseMessageText('a'.repeat(501)).ok).toBe(false)
  })
  it('từ chối chuỗi thô > 500 ký tự dù sau trim còn ngắn', () => {
    expect(parseMessageText(' '.repeat(600) + 'hi').ok).toBe(false)
  })
  it('từ chối chỉ khoảng trắng / không phải chuỗi', () => {
    expect(parseMessageText('  \n ').ok).toBe(false)
    expect(parseMessageText(42).ok).toBe(false)
  })
  it('giữ nguyên chuỗi HTML (không escape ở đây)', () => {
    expect(parseMessageText('<b>x</b>')).toEqual({ ok: true, value: '<b>x</b>' })
  })
})

describe('isValidInviteToken', () => {
  it('kiểm định dạng url-safe 16–64 ký tự', () => {
    expect(isValidInviteToken('abc')).toBe(false)
    expect(isValidInviteToken('a'.repeat(16))).toBe(true)
    expect(isValidInviteToken('Ab-_'.repeat(4))).toBe(true)
    expect(isValidInviteToken('../../etc/passwd0000')).toBe(false)
    expect(isValidInviteToken('a'.repeat(65))).toBe(false)
  })
})

describe('isIsoTimestamp', () => {
  it('nhận timestamp ISO (tới micro-giây), từ chối chuỗi khác', () => {
    expect(isIsoTimestamp('2026-11-11T10:00:00.123456+00:00')).toBe(true)
    expect(isIsoTimestamp('2026-11-11T10:00:00Z')).toBe(true)
    expect(isIsoTimestamp('2026-11-11')).toBe(false)
    expect(isIsoTimestamp("2026-11-11T10:00:00Z' or 1=1")).toBe(false)
  })
})

describe('isUuid', () => {
  it('nhận uuid, từ chối chuỗi khác', () => {
    expect(isUuid('3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid("3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f' or 1=1")).toBe(false)
  })
})

describe('episodeKeyOf', () => {
  it('slug || name', () => {
    expect(episodeKeyOf({ slug: '', name: 'Tập 5' })).toBe('Tập 5')
    expect(episodeKeyOf({ slug: 'tap-5', name: 'Tập 5' })).toBe('tap-5')
  })
})

describe('parseRoomMovie / parseRoomEpisode', () => {
  it('nhận movie hợp lệ, đổi ophim → vsmov, bỏ poster không phải http(s)', () => {
    expect(parseRoomMovie({ source: 'ophim', slug: 'abc', title: ' Phim ', poster: 'javascript:x' })).toEqual({
      source: 'vsmov',
      slug: 'abc',
      title: 'Phim',
      poster: ''
    })
    expect(parseRoomMovie(null)).toBeNull()
    expect(parseRoomMovie({ source: 'x', slug: 'abc', title: 'a' })).toBeUndefined()
    expect(parseRoomMovie({ source: 'kkphim', slug: '../a', title: 'a' })).toBeUndefined()
  })
  it('nhận episode hợp lệ, từ chối thiếu khoá', () => {
    expect(parseRoomEpisode({ serverName: 'Vietsub', episodeKey: 'tap-1', episodeName: 'Tập 1' })).toEqual({
      serverName: 'Vietsub',
      episodeKey: 'tap-1',
      episodeName: 'Tập 1'
    })
    expect(parseRoomEpisode({ serverName: 'Vietsub', episodeKey: '' })).toBeUndefined()
    expect(parseRoomEpisode(null)).toBeNull()
  })
  it('isLoggableEvent chỉ nhận 5 loại', () => {
    expect(isLoggableEvent('seek')).toBe(true)
    expect(isLoggableEvent('join')).toBe(false)
  })
})
