'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/auth-provider'

type FavoriteButtonProps = {
  slug: string
  name: string
  image: string
  source?: string
}

export default function FavoriteButton({ slug, name, image, source }: FavoriteButtonProps) {
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  // Check trạng thái favorite khi user có và slug có
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user?.id || !slug) return
      setLoading(true)
      try {
        const res = await fetch('/api/favorite/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug })
        })
        const result = await res.json()
        setIsFavorite(result.exists)
      } catch (err) {
        console.error('Check favorite error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkFavorite()
  }, [slug])

  const toggleFavorite = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      if (isFavorite) {
        const res = await fetch('/api/favorite', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug })
        })
        const result = await res.json()
        if (!result.error) {
          setIsFavorite(false)
        }
      } else {
        const res = await fetch('/api/favorite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, name, image, source })
        })
        const result = await res.json()
        if (!result.error) {
          setIsFavorite(true)
        }
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user?.id) {
    return (
      <button
        disabled
        className='mt-6 px-6 py-3 bg-gray-400 rounded-lg text-white font-semibold w-full flex justify-center items-center gap-2 cursor-not-allowed'
      >
        Đăng nhập để yêu thích
      </button>
    )
  }

  if (isFavorite === null) {
    return (
      <button
        disabled
        className='mt-6 px-6 py-3 bg-gray-300 rounded-lg text-white font-semibold w-full flex justify-center items-center gap-2 cursor-not-allowed'
      >
        Đang tải...
      </button>
    )
  }

  const baseStyle =
    'px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 transform shadow-lg w-full flex justify-center items-center gap-2 cursor-pointer'

  const activeStyle = isFavorite
    ? 'bg-red-500 hover:bg-red-600 hover:-translate-y-1 hover:shadow-red-500/50'
    : 'bg-green-600 hover:bg-green-700 hover:-translate-y-1 hover:shadow-green-500/50'

  return (
    <button onClick={toggleFavorite} disabled={loading} className={`${baseStyle} ${activeStyle}`}>
      {loading ? 'Đợi chút...' : isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
    </button>
  )
}
