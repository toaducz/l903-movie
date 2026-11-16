import { describe, expect, it } from 'vitest'
import { escapeAction } from './fs-chat-keys'

describe('escapeAction', () => {
  it('closes the input when it is open, locked or not', () => {
    expect(escapeAction({ typing: true, escLocked: true })).toBe('close-input')
    expect(escapeAction({ typing: true, escLocked: false })).toBe('close-input')
  })

  it('exits fullscreen itself when Esc is locked and the input is closed', () => {
    expect(escapeAction({ typing: false, escLocked: true })).toBe('exit-fullscreen')
  })

  it('leaves Esc to the browser when not locked and the input is closed', () => {
    expect(escapeAction({ typing: false, escLocked: false })).toBe('none')
  })
})
