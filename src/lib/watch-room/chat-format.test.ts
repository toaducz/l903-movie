import { describe, expect, it } from 'vitest'
import type { RoomMessage } from '@/types/watch-room'
import {
  avatarTone,
  buildChatItems,
  displayNameFromEmail,
  formatPosition,
  linkify,
  oldestCreatedAt
} from './chat-format'

describe('displayNameFromEmail', () => {
  it('lấy phần trước @, cắt 16 ký tự', () => {
    expect(displayNameFromEmail('minhanh@gmail.com')).toBe('minhanh')
    expect(displayNameFromEmail('abcdefghijklmnopqrst@gmail.com')).toBe('abcdefghijklmnop…')
    expect(displayNameFromEmail('MinhAnh@x.vn')).toBe('minhanh')
  })
  it('rỗng → ẩn danh', () => {
    expect(displayNameFromEmail(null)).toBe('ẩn danh')
    expect(displayNameFromEmail('@x.vn')).toBe('ẩn danh')
  })
})

describe('avatarTone', () => {
  it('ổn định theo userId', () => {
    const id = '3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
    expect(avatarTone(id)).toBe(avatarTone(id))
    expect(['pink', 'yel', 'cyan', 'orange']).toContain(avatarTone(id))
  })
})

describe('formatPosition', () => {
  it('mm:ss và h:mm:ss', () => {
    expect(formatPosition(2120)).toBe('35:20')
    expect(formatPosition(3725)).toBe('1:02:05')
    expect(formatPosition(5)).toBe('0:05')
    expect(formatPosition(-3)).toBe('0:00')
  })
})

describe('linkify (Review Focus 5)', () => {
  it('tách link http(s)', () => {
    const parts = linkify('xem https://a.b/c nha')
    expect(parts).toHaveLength(3)
    expect(parts[1]).toEqual({ kind: 'link', href: 'https://a.b/c', value: 'https://a.b/c' })
  })
  it('HTML giữ nguyên là text', () => {
    expect(linkify('<script>')).toEqual([{ kind: 'text', value: '<script>' }])
  })
  it('javascript: không thành link', () => {
    expect(linkify('javascript:alert(1)').every(p => p.kind === 'text')).toBe(true)
  })
  it('bỏ dấu câu cuối link', () => {
    const parts = linkify('vào https://a.b/c.')
    expect(parts[1]).toMatchObject({ kind: 'link', href: 'https://a.b/c' })
    expect(parts[2]).toEqual({ kind: 'text', value: '.' })
  })
})

const NOW = new Date('2026-11-11T12:00:00')
const at = (iso: string) => new Date(iso).toISOString()
let seq = 0
const text = (userId: string, createdAt: string): RoomMessage => ({
  id: `m${++seq}`,
  roomId: 'r',
  userId,
  kind: 'text',
  text: 'hi',
  event: null,
  createdAt: at(createdAt)
})
const ev = (type: 'play' | 'pause', createdAt: string): RoomMessage => ({
  id: `e${++seq}`,
  roomId: 'r',
  userId: 'u1',
  kind: 'event',
  text: null,
  event: { type },
  createdAt: at(createdAt)
})

describe('buildChatItems', () => {
  it('gộp tin cùng người trong 2 phút', () => {
    const items = buildChatItems([text('u1', '2026-11-11T11:00:00'), text('u1', '2026-11-11T11:01:00')], 'u1', NOW)
    const groups = items.filter(i => i.kind === 'group')
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ mine: true })
  })
  it('cách 3 phút → 2 group', () => {
    const items = buildChatItems([text('u1', '2026-11-11T11:00:00'), text('u1', '2026-11-11T11:03:00')], 'u2', NOW)
    expect(items.filter(i => i.kind === 'group')).toHaveLength(2)
  })
  it('pause→play→pause trong 3s → 1 event count 3, giữ cái cuối', () => {
    const items = buildChatItems(
      [ev('pause', '2026-11-11T11:00:00'), ev('play', '2026-11-11T11:00:01'), ev('pause', '2026-11-11T11:00:03')],
      'u1',
      NOW
    )
    const events = items.filter(i => i.kind === 'event')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ count: 3, message: { event: { type: 'pause' } } })
  })
  it('sắp tăng dần và chèn phân cách ngày', () => {
    const items = buildChatItems([text('u1', '2026-11-11T09:00:00'), text('u1', '2026-11-10T09:00:00')], 'u1', NOW)
    const days = items.filter(i => i.kind === 'day')
    expect(days.map(d => d.kind === 'day' && d.label)).toEqual(['HÔM QUA', 'HÔM NAY'])
    expect(items[0]).toEqual({ kind: 'day', label: 'HÔM QUA' })
  })
  it('ngày cũ hơn → dd/MM', () => {
    const items = buildChatItems([text('u1', '2026-11-01T09:00:00')], 'u1', NOW)
    expect(items[0]).toEqual({ kind: 'day', label: '01/11' })
  })
})

describe('oldestCreatedAt', () => {
  it('so theo thời gian thật, không theo chuỗi (Z vs +00:00), trả nguyên chuỗi gốc', () => {
    const a = { ...text('u1', '2026-11-11T11:00:00'), createdAt: '2026-11-11T10:00:00.5Z' }
    const b = { ...text('u1', '2026-11-11T11:00:00'), createdAt: '2026-11-11T10:00:00.123456+00:00' }
    expect(oldestCreatedAt([a, b])).toBe('2026-11-11T10:00:00.123456+00:00')
    expect(oldestCreatedAt([])).toBeNull()
  })
})
