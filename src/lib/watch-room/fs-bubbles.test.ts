import { describe, expect, it } from 'vitest'
import { BUBBLE_MAX, BUBBLE_TTL_MS, pruneBubbles, pushBubbles, type Bubble } from './fs-bubbles'
import type { RoomMessage } from '@/types/watch-room'

const msg = (id: string, over: Partial<RoomMessage> = {}): RoomMessage => ({
  id,
  roomId: 'r',
  userId: 'u1',
  kind: 'text',
  text: `hi ${id}`,
  event: null,
  createdAt: '2026-11-12T00:00:00Z',
  ...over
})

describe('pushBubbles', () => {
  it('adds text messages with an expiry', () => {
    const out = pushBubbles([], [msg('a')], 1000)
    expect(out).toEqual([{ id: 'a', userId: 'u1', text: 'hi a', expiresAt: 1000 + BUBBLE_TTL_MS }])
  })

  it('skips event messages and empty text', () => {
    const out = pushBubbles([], [msg('a', { kind: 'event', text: null }), msg('b', { text: '' })], 0)
    expect(out).toEqual([])
  })

  it('keeps only the newest BUBBLE_MAX bubbles', () => {
    const out = pushBubbles([], ['a', 'b', 'c', 'd', 'e', 'f'].map(id => msg(id)), 0)
    expect(out).toHaveLength(BUBBLE_MAX)
    expect(out.map(b => b.id)).toEqual(['c', 'd', 'e', 'f'])
  })

  it('drops expired bubbles and ignores duplicates', () => {
    const old: Bubble[] = [
      { id: 'x', userId: 'u', text: 't', expiresAt: 500 },
      { id: 'y', userId: 'u', text: 't', expiresAt: 5000 }
    ]
    const out = pushBubbles(old, [msg('y'), msg('z')], 1000)
    expect(out.map(b => b.id)).toEqual(['y', 'z'])
  })

  it('does not mutate the input list', () => {
    const list: Bubble[] = []
    pushBubbles(list, [msg('a')], 0)
    expect(list).toEqual([])
  })
})

describe('pruneBubbles', () => {
  it('removes bubbles at or past expiry and returns the same list when nothing changes', () => {
    const list: Bubble[] = [
      { id: 'a', userId: 'u', text: 't', expiresAt: 100 },
      { id: 'b', userId: 'u', text: 't', expiresAt: 200 }
    ]
    expect(pruneBubbles(list, 100).map(b => b.id)).toEqual(['b'])
    expect(pruneBubbles(list, 50)).toBe(list)
  })
})
