import Image from 'next/image'
import type { CSSProperties } from 'react'

// Poster 2:3 nhỏ; không có ảnh (hoặc không phải http/https) thì hiện nền sọc

type Props = { src?: string | null; width: number; radius?: number; className?: string; style?: CSSProperties }

export default function Poster({ src, width, radius = 6, className = '', style }: Props) {
  const ok = !!src && /^https?:\/\//.test(src)
  return (
    <span
      className={`relative block shrink-0 aspect-[2/3] overflow-hidden border border-[var(--c-line)] xc-stripe ${className}`}
      style={{ width, borderRadius: radius, ...style }}
    >
      {ok && <Image src={src} alt='' fill sizes={`${width}px`} className='object-cover' unoptimized />}
    </span>
  )
}
