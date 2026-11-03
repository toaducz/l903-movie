'use client'

import { useEffect, useRef } from 'react'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { usePathname, useSearchParams } from 'next/navigation'

// Cấu hình NProgress mượt mà, trickle từ tốn tránh vọt lên 99% quá sớm
NProgress.configure({
  showSpinner: false,
  minimum: 0.15,
  easing: 'ease',
  speed: 300,
  trickleSpeed: 350
})

let isNProgressInitialized = false

declare global {
  interface Window {
    NProgress: typeof NProgress
  }
}

export function initializeNProgress() {
  if (typeof window === 'undefined' || isNProgressInitialized) return

  // Thêm custom styles cho NProgress đồng bộ màu thương hiệu
  const style = document.createElement('style')
  style.id = 'nprogress-custom-style'
  style.textContent = `
    #nprogress {
      pointer-events: none;
    }
    #nprogress .bar {
      background: #ec4899 !important;
      height: 3px !important;
      z-index: 99999 !important;
    }
    #nprogress .peg {
      box-shadow: 0 0 10px #ec4899, 0 0 5px #ec4899 !important;
    }
  `
  document.head.appendChild(style)

  // Bắt sự kiện click cho thẻ <a> để kích hoạt thanh tải
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target) return

    const linkElement = target.closest('a')
    if (!linkElement) return

    const href = linkElement.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return
    }

    if (linkElement.target === '_blank' || linkElement.hasAttribute('download')) {
      return
    }

    try {
      const targetUrl = new URL(linkElement.href, window.location.href)
      const currentUrl = new URL(window.location.href)

      // Bỏ qua nếu click vào chính URL hiện tại (tránh chạy thanh vô nghĩa)
      if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
        return
      }

      // Chỉ kích hoạt khi điều hướng nội bộ sang trang khác
      if (targetUrl.origin === currentUrl.origin) {
        NProgress.start()
      }
    } catch {
      // Bỏ qua nếu URL không hợp lệ
    }
  })

  isNProgressInitialized = true
}

export default function NProgressInit() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    initializeNProgress()
    window.NProgress = NProgress
  }, [])

  // Khi URL thay đổi = ĐÃ SANG TRANG MỚI -> Kết thúc (done) thanh tiến trình
  useEffect(() => {
    const currentPath = `${pathname}${searchParams.toString() ? '?' + searchParams : ''}`

    // Lần đầu mount: chỉ lưu URL hiện tại, không kích hoạt
    if (prevPathRef.current === null) {
      prevPathRef.current = currentPath
      return
    }

    // Nếu URL thực sự thay đổi so với trang trước -> kết thúc thanh tiến trình ngay
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath
      NProgress.done()
    }
  }, [pathname, searchParams])

  return null
}

export { NProgress }
