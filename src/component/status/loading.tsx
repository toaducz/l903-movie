'use client'

import React, { useMemo } from 'react'
import loading from '@/assets/gif/loading.gif'
import animeLoading from '@/assets/gif/anime-loading.gif'
import Image from 'next/image'

interface LoadingProps {
  image?: string
  className?: string
}

const Loading: React.FC<LoadingProps> = ({ image, className = '' }) => {
  const selectedImage = useMemo(() => {
    return Math.random() < 0.7 ? loading : animeLoading
  }, [])

  const isAnime = selectedImage === animeLoading

  return (
    <div
      className={`flex items-center justify-center w-full min-h-[calc(100dvh-68px)] flex-1 bg-transparent overflow-hidden ${className}`.trim()}
    >
      <div>
        <Image
          unoptimized
          src={image ?? selectedImage}
          alt='Loading...'
          width={isAnime ? 150 : 70}
          height={isAnime ? 150 : 70}
          className='object-contain'
          priority
        />
      </div>
    </div>
  )
}

export default Loading
