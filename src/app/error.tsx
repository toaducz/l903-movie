'use client'

import Image from 'next/image'
import Link from 'next/link'
import bocchiError from '@/assets/image/bocchi-error.jpg'

export default function ErrorPage() {
  return (
    <div className='w-full h-full min-h-[60vh] flex-1 flex flex-col items-center justify-center bg-transparent text-slate-100 px-6 py-12'>
      <div className='flex flex-col items-center text-center space-y-6'>
        <Image
          unoptimized
          src={bocchiError}
          alt='error'
          width={220}
          height={220}
          className='rounded-2xl mb-4 object-contain border border-white/10 shadow-lg'
        />

        <h1 className='text-2xl md:text-3xl font-black text-white mb-2'>Có gì đó sai sai đã xảy ra</h1>
        <p className='text-white/60 text-sm max-w-md'>Trang này hiện đang gặp lỗi hoặc gián đoạn kết nối, vui lòng thử lại sau!</p>
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
