'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/auth-provider'
import WatchedIcon from '@/component/watched/watched-icon'

type FavoriteButtonProps = {
  slug: string
  name: string
  image: string
  source?: string
  className?: string
}

export default function FavoriteButton({ slug, name, image, source, className = '' }: FavoriteButtonProps) {
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

  // Giao diện theo design handoff "Đã xem": nút ghost cao 48px cùng hàng với XEM PHIM / Đã xem
  const base = `dx-b ${className}`
  const disabled = !user?.id || isFavorite === null || loading

  return (
    <button
      type='button'
      onClick={toggleFavorite}
      disabled={disabled}
      title={!user?.id ? 'Đăng nhập để yêu thích' : undefined}
      aria-pressed={Boolean(isFavorite)}
      className={`${base} ${isFavorite ? 'dx-b-fav-on' : 'dx-b-gh'}`}
      style={disabled ? { opacity: 0.7 } : undefined}
    >
      {loading ? (
        <span className='dx-spin' />
      ) : (
        <WatchedIcon name='heart' size={18} strokeWidth={2.2} filled={Boolean(isFavorite)} />
      )}
      {isFavorite ? 'Đã thích' : 'Yêu thích'}
    </button>
  )
}
