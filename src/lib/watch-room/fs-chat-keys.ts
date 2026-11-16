// Quyết định phím Esc khi khung phòng fullscreen. escLocked = đã navigator.keyboard.lock(['Escape']) thành công
// (Chrome/Edge): Esc tới được trang nên trang phải tự thoát fullscreen; không lock thì trình duyệt tự xử lý.
export type EscapeAction = 'close-input' | 'exit-fullscreen' | 'none'

export const FS_CHAT_IDLE_CLOSE_MS = 5000

export function escapeAction({ typing, escLocked }: { typing: boolean; escLocked: boolean }): EscapeAction {
  if (typing) return 'close-input'
  return escLocked ? 'exit-fullscreen' : 'none'
}
