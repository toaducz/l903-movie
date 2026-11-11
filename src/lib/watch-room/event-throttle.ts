// Ghi sự kiện điều khiển vào chat tối đa 1 lần / khoảng (vd 2s); dồn dập thì chỉ giữ cái cuối (tua liên tiếp → 1 dòng)

export type EventThrottle<T> = { push(value: T): void; flush(): void; cancel(): void }

export function createEventThrottle<T>(send: (value: T) => void, intervalMs: number): EventThrottle<T> {
  let pending: { value: T } | null = null
  let lastSentAt = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (!pending) return
    const { value } = pending
    pending = null
    lastSentAt = Date.now()
    send(value)
  }

  return {
    push(value) {
      pending = { value }
      if (timer !== undefined) return
      timer = setTimeout(flush, Math.max(0, lastSentAt + intervalMs - Date.now()))
    },
    flush,
    cancel() {
      clearTimeout(timer)
      timer = undefined
      pending = null
    }
  }
}
