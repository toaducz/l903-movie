'use client'

import Link from 'next/link'
import Image from 'next/image'

type HistoryItemProps = {
  slug: string
  name: string
  image: string
  episodeName?: string
  hideEpisode?: boolean
  source?: string
}

export default function HistoryItem({ slug, name, image, episodeName, hideEpisode, source }: HistoryItemProps) {
  const href = episodeName
    ? `/detail-movie/${slug}?watch=1&ep=${encodeURIComponent(episodeName)}${source ? `&source=${source}` : ''}`
    : `/detail-movie/${slug}${source ? `?source=${source}` : ''}`

  return (
    <Link
      href={href}
      className='block rounded-lg overflow-hidden shadow-md hover:opacity-90  transition-shadow duration-300 '
    >
      <div className='relative w-full h-48 bg-gray-200'>
        <Image src={image} alt={name} unoptimized className='object-cover' fill />
        {source && (
          <span
            className='absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase opacity-80 z-10'
            style={{
              background: source === 'ophim' ? '#ff4d4f' : source === 'nguonc' ? '#52c41a' : '#1890ff',
              color: '#fff'
            }}
          >
            {source === 'nguonc' ? 'Nguồn C' : source}
          </span>
        )}
      </div>
      <div className='p-2'>
        <h3 className='text-sm font-medium line-clamp-1 overflow-hidden'>{name}</h3>
        {!hideEpisode && (
          <p className='text-xs text-blue-400 mt-1 font-medium'>
            {!episodeName || episodeName.toLowerCase() === 'full' ? 'Tập Full' : episodeName}
          </p>
        )}
      </div>
    </Link>
  )
}
