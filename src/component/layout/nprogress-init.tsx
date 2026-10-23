'use client'

import { useEffect, useRef } from 'react'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { usePathname, useSearchParams } from 'next/navigation'

// Cấu hình NProgress
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  easing: 'ease',
  speed: 500,
  trickleSpeed: 200
})

// Biến global để theo dõi trạng thái
let isNProgressInitialized = false

// Khai báo interface cho window object để thêm NProgress
declare global {
  interface Window {
    NProgress: typeof NProgress
  }
}

export function initializeNProgress() {
  if (typeof window === 'undefined' || isNProgressInitialized) return

  // Thêm custom styles cho NProgress
  const style = document.createElement('style')
  style.textContent = `
    #nprogress .bar {
      background: #0070f3 !important;
      height: 3px !important;
      z-index: 9999 !important;
    }
  `
  document.head.appendChild(style)

  // Bắt sự kiện click cho thẻ <a> để hỗ trợ điều hướng bằng href
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target) return

    const linkElement = target.closest('a')
    if (!linkElement) return

    // Kiểm tra xem link có phải là internal link không
    if (
      linkElement.href &&
      linkElement.href.startsWith(window.location.origin) &&
      linkElement.href !== window.location.href &&
      !linkElement.hasAttribute('download') &&
      (!linkElement.target || linkElement.target === '_self')
    ) {
      NProgress.start()

      // Safety timeout để tránh treo thanh progress
      setTimeout(() => {
        const status = NProgress.status
        if (status !== null && status < 1) {
          NProgress.done()
        }
      }, 3000)
    }
  })

  isNProgressInitialized = true
}

// Component để khởi tạo NProgress
export default function NProgressInit() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    initializeNProgress()

    // Cho phép gọi NProgress từ bất kỳ component nào
    window.NProgress = NProgress
  }, [])

  // Phát hiện thay đổi URL (bao gồm router.push và href)
  useEffect(() => {
    const currentPath = `${pathname}${searchParams.toString() ? '?' + searchParams : ''}`

    // Nếu URL thay đổi, kích hoạt NProgress
    if (prevPathRef.current !== null && prevPathRef.current !== currentPath) {
      NProgress.start()
    }

    // Hoàn thành NProgress sau khi trang tải xong
    const timer = setTimeout(() => {
      NProgress.done()
    }, 300) // Delay nhỏ để đảm bảo thanh progress hiển thị mượt

    // Cập nhật prevPath
    prevPathRef.current = currentPath

    // Cleanup timer
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  return null
}

// Export để sử dụng từ bất kỳ component nào
export { NProgress }
