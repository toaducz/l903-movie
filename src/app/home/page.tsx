'use client'

import Image from 'next/image'
import bocchiError from '@/assets/image/bocchi-error.jpg'

export default function HomePage() {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-black text-slate-100 px-6 py-12'>
      <div className='flex flex-col items-center text-center space-y-6'>
        <Image
          unoptimized
          src={bocchiError}
          alt='Service Unavailable'
          width={220}
          height={220}
          className='rounded-lg mb-6 object-contain'
        />

        <h1 className='text-2xl md:text-3xl font-bold mb-3'>Dịch vụ tạm thời không khả dụng</h1>
        <p>Vui lòng quay lại sau!</p>
      </div>
    </div>
  )
}
