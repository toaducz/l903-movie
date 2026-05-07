'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  if (pathname === '/login' || pathname === '/home') return null

  return (
    <footer className='mt-16 px-5 sm:px-10 py-8 border-t' style={{ borderColor: 'var(--c-line)' }}>
      <div className='max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4'>
        {/* Logo */}
        <Link href='/' className='text-xl font-black tracking-tight text-white cursor-pointer'>
          L903<span className='text-[var(--c-yel)] mx-0.5 text-sm align-[2px]'></span>Movie
        </Link>

        {/* Links */}
        <nav className='flex gap-5 text-sm text-white/40'>
          <Link href='/about' className='hover:text-white transition-colors'>
            Giới thiệu
          </Link>
          <Link href='/policy' className='hover:text-white transition-colors'>
            Chính sách
          </Link>
          <Link href='/contact' className='hover:text-white transition-colors'>
            Liên hệ
          </Link>
        </nav>

        {/* Tagline */}
        <p className='text-xs text-white/30'>
          Trang xem phim trực tuyến · không quảng cáo · made by L903 team · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
