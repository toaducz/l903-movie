'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CommunityUser } from '@/types/profile'

type Props = {
  user: CommunityUser
  color?: string
  index?: number
}

export default function UserItem({ user, color, index }: Readonly<Props>) {
  // Đồng bộ hệ màu accent 4 tông neon/anime của hệ thống
  const ACCENTS = ['var(--c-pink)', 'var(--c-yel)', 'var(--c-cyan)', 'var(--c-orange)']
  const accent = color ?? ACCENTS[(index ?? 0) % ACCENTS.length]

  return (
    <Link
      href={`/profile/${user.id}`}
      className='group block cursor-pointer'
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Khung thẻ đồng bộ cấu trúc, viền và hard-offset shadow khi hover như MovieItem */}
      <div
        className='relative rounded-2xl overflow-hidden border border-white/10 bg-[var(--c-card)] p-5 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5'
        style={{ boxShadow: '5px 5px 0 transparent', transition: 'box-shadow .2s, transform .2s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = `7px 7px 0 ${accent}`)}
        onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '5px 5px 0 transparent')}
      >
        <div className='flex items-center gap-4'>
          {/* Avatar anime/neon chuẩn Direction-C của L903 Movie */}
          <div
            className='w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-white uppercase shrink-0 select-none overflow-hidden group-hover:scale-105 transition-transform duration-200'
            style={{
              background: 'linear-gradient(135deg, var(--c-pink), var(--c-orange))',
              border: '3px solid var(--c-bg)',
              boxShadow: '4px 4px 0 var(--c-yel)'
            }}
            aria-hidden='true'
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                width={56}
                height={56}
                className='w-full h-full object-cover rounded-full'
                unoptimized
              />
            ) : (
              user.initial
            )}
          </div>

          {/* Thông tin thành viên */}
          <div className='min-w-0 flex-1'>
            <h3 className='text-[15px] sm:text-[16px] font-bold text-white/90 line-clamp-1 group-hover:text-white transition-colors duration-200 tracking-tight'>
              {user.name}
            </h3>
            <p className='text-[12px] font-mono text-white/40 truncate mt-0.5'>@{user.handle}</p>
            {user.joinedYear && (
              <p className='text-[11px] font-mono text-white/30 mt-1'>
                Tham gia từ {user.joinedYear}
              </p>
            )}
          </div>
        </div>

        {/* Footer: Badge đánh giá tương thích hệ màu accent & Nút xem hồ sơ */}
        <div className='mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono'>
          <span
            className='text-[11px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase'
            style={{
              background: accent,
              color: accent === 'var(--c-yel)' ? 'var(--c-bg)' : '#fff'
            }}
          >
            {user.reviewCount > 0 ? `★ ${user.reviewCount} đánh giá` : 'Thành viên'}
          </span>

          <span className='text-[11px] font-semibold text-white/40 group-hover:text-white transition-colors duration-200 flex items-center gap-1'>
            Hồ sơ <span className='text-[var(--c-yel)] group-hover:translate-x-0.5 transition-transform duration-200'>›</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

