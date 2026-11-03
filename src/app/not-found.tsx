'use client'

import Image from 'next/image'
import Link from 'next/link'
import notFound from '@/assets/image/pekora-not-found.jpg'

export default function NotFoundPage() {
  return (
    <div className='min-h-[calc(100dvh-68px)] w-full flex-1 flex flex-col items-center justify-center bg-transparent text-slate-100 px-6 py-12 pt-20'>
      <div className='flex flex-col items-center text-center space-y-6'>
        <Image
          unoptimized
          src={notFound}
          alt='Not Found'
          width={220}
          height={220}
          className='rounded-2xl mb-4 object-contain border border-white/10 shadow-lg'
        />

        <h1 className='text-2xl md:text-3xl font-black text-white mb-2'>Không tìm thấy trang này</h1>
        <p className='text-white/60 text-sm max-w-md'>Trang này hiện đang không tồn tại hoặc đang phát triển, vui lòng quay lại sau!</p>
        <Link
          href='/'
          className='mt-3 inline-block px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition cursor-pointer text-sm'
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  )
}
