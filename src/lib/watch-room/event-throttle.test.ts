import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEventThrottle } from './event-throttle'

describe('createEventThrottle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('gửi ngay sự kiện đầu, gộp các sự kiện trong 2s thành cái cuối', () => {
    const sent: string[] = []
    const log = createEventThrottle<string>(v => sent.push(v), 2000)
    log.push('pause')
    vi.advanceTimersByTime(0)
    expect(sent).toEqual(['pause'])
    log.push('play')
    log.push('seek 1')
    log.push('seek 2')
    vi.advanceTimersByTime(1999)
    expect(sent).toEqual(['pause'])
    vi.advanceTimersByTime(1)
    expect(sent).toEqual(['pause', 'seek 2'])
  })

  it('flush gửi ngay phần còn đợi, cancel bỏ đi', () => {
    const sent: string[] = []
    const log = createEventThrottle<string>(v => sent.push(v), 2000)
    log.push('a')
    vi.advanceTimersByTime(0)
    log.push('b')
    log.flush()
    expect(sent).toEqual(['a', 'b'])
    log.push('c')
    log.cancel()
    vi.advanceTimersByTime(5000)
    expect(sent).toEqual(['a', 'b'])
  })
})
