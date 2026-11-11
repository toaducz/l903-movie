import { describe, expect, it } from 'vitest'
import {
  createEchoGuard,
  estimateServerOffset,
  isNewer,
  msUntilTokenRefresh,
  shouldSeek,
  targetPosition,
  type ControlMessage
} from './sync'

const msg = (over: Partial<ControlMessage> = {}): ControlMessage => ({
  type: 'play',
  positionSec: 100,
  isPlaying: true,
  episode: null,
  movie: null,
  sentAt: 1000,
  by: 'a',
  ...over
})

describe('targetPosition', () => {
  it('đang phát → bù trễ theo đồng hồ server', () => {
    expect(targetPosition(msg(), 3000, null)).toBe(102)
  })
  it('đang dừng → giữ nguyên vị trí', () => {
    expect(targetPosition(msg({ isPlaying: false }), 3000, null)).toBe(100)
  })
  it('vượt độ dài video → clamp về duration (Review Focus 2)', () => {
    expect(targetPosition(msg(), 3000, 101)).toBe(101)
  })
  it('không âm khi đồng hồ lệch ngược', () => {
    expect(targetPosition(msg({ positionSec: 0 }), 0, 50)).toBe(0)
  })
})

describe('shouldSeek', () => {
  it('bỏ qua lệch < 0.5s', () => {
    expect(shouldSeek(10, 10.4)).toBe(false)
    expect(shouldSeek(10, 10.6)).toBe(true)
    expect(shouldSeek(10.6, 10)).toBe(true)
  })
})

describe('isNewer (Review Focus 1)', () => {
  it('chưa có lệnh nào → mới hơn', () => {
    expect(isNewer(msg(), null)).toBe(true)
  })
  it('sentAt lớn hơn thắng', () => {
    expect(isNewer(msg({ sentAt: 1001 }), { sentAt: 1000, by: 'z' })).toBe(true)
    expect(isNewer(msg({ sentAt: 999 }), { sentAt: 1000, by: 'a' })).toBe(false)
  })
  it('cùng sentAt → tie-break theo by, hai máy hội tụ cùng một lệnh', () => {
    expect(isNewer(msg({ by: 'b' }), { sentAt: 1000, by: 'a' })).toBe(true)
    expect(isNewer(msg({ by: 'a' }), { sentAt: 1000, by: 'b' })).toBe(false)
    expect(isNewer(msg({ by: 'a' }), { sentAt: 1000, by: 'a' })).toBe(false)
  })
})

describe('estimateServerOffset', () => {
  it('chọn mẫu RTT nhỏ nhất', () => {
    const samples = [
      { sentAt: 0, receivedAt: 400, serverTime: 10_000 },
      { sentAt: 1000, receivedAt: 1100, serverTime: 11_050 }, // rtt 100 → offset = 11050 + 50 - 1100 = 10000
      { sentAt: 2000, receivedAt: 2300, serverTime: 12_000 }
    ]
    expect(estimateServerOffset(samples)).toBe(10_000)
  })
  it('không có mẫu → 0', () => {
    expect(estimateServerOffset([])).toBe(0)
  })
})

describe('msUntilTokenRefresh (Review Focus 3)', () => {
  it('làm mới trước hạn 60s', () => {
    expect(msUntilTokenRefresh(1000, 900_000)).toBe(40_000)
  })
  it('đã quá hạn → 0', () => {
    expect(msUntilTokenRefresh(1000, 2_000_000)).toBe(0)
  })
})

describe('createEchoGuard', () => {
  it('chặn đúng loại trong 800ms mặc định', () => {
    const guard = createEchoGuard()
    const now = Date.now()
    guard.suppress('seek')
    expect(guard.isSuppressed('seek', now + 500)).toBe(true)
    expect(guard.isSuppressed('seek', now + 900)).toBe(false)
    expect(guard.isSuppressed('play', now)).toBe(false)
  })
  it('nhận thời lượng tuỳ chỉnh', () => {
    const guard = createEchoGuard()
    const now = Date.now()
    guard.suppress('pause', 2000)
    expect(guard.isSuppressed('pause', now + 1500)).toBe(true)
  })
})
