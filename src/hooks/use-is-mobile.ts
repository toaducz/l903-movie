'use client'

import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 639px)'

// Đọc ngay lúc khởi tạo (component chỉ render sau thao tác của người dùng nên luôn có window)
// → popup không bị đổi modal ↔ bottom sheet sau lần render đầu.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
