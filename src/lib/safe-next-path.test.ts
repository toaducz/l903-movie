import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next-path'

describe('safeNextPath', () => {
  it('giữ path nội bộ', () => {
    expect(safeNextPath('/moi/abc')).toBe('/moi/abc')
    expect(safeNextPath('/phong/1?x=1')).toBe('/phong/1?x=1')
  })
  it('từ chối link ngoài / mơ hồ', () => {
    for (const raw of ['//evil.com', 'https://evil.com', '/\\evil.com', '/\tevil', '/a\\b', null, '', 'moi/abc']) {
      expect(safeNextPath(raw)).toBeNull()
    }
  })
  it('từ chối quá 512 ký tự', () => {
    expect(safeNextPath('/' + 'a'.repeat(512))).toBeNull()
  })
})
