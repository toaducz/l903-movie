const MAX_LENGTH = 512

/** Chỉ nhận path nội bộ (bắt đầu `/`, không `//`, không dấu `\`, không ký tự điều khiển) — chống open redirect sau đăng nhập */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  // Trình duyệt coi `\` như `/` → '/\evil.com' thành '//evil.com'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null
  return raw
}
