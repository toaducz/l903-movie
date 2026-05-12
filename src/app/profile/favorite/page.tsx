'use client'

import HistoryItem from '@/component/item/profile-movie-items'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/component/status/loading'

type FavoriteMovie = {
  name: string
  slug: string
  image: string
  source?: string
}

export default function FavoritePage() {
  const { data: favorites = [], isLoading: loading, error, refetch } = useQuery<FavoriteMovie[]>({
    queryKey: ['favorites_full'],
    queryFn: async () => {
      const res = await fetch('/api/favorite?page=1&limit=20')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      return json.data.map((item: FavoriteMovie) => ({
        name: item.name,
        slug: item.slug,
        image: item.image,
        source: item.source
      }))
    }
  })

  const handleDelete = async (slug: string) => {
    try {
      const res = await fetch('/api/favorite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      })
      const result = await res.json()
      if (!result.error) {
        refetch()
      } else {
        alert(result.error)
      }
    } catch (err) {
      console.error('Xóa thất bại:', err)
    }
  }

  if (loading) return <Loading />

  return (
    <div className='pt-16 px-4 max-w-5xl mx-auto min-h-screen'>
      <h1 className='text-2xl font-bold mb-6'>Phim yêu thích</h1>

      {error && <p className='text-red-500'>{error.message}</p>}

      {!error && favorites.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 content-start'>
          {favorites.map(movie => (
            <div key={`${movie.slug}_${movie.source}`} className='relative'>
              <HistoryItem
                slug={movie.slug}
                name={movie.name}
                image={movie.image}
                hideEpisode={true}
                source={movie.source}
              />
              <button
                onClick={() => handleDelete(movie.slug)}
                className='absolute top-2 right-2 w-6 h-6 flex items-center justify-center 
                           bg-red-600 text-white text-sm rounded hover:bg-red-700 transition cursor-pointer'
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && favorites.length === 0 && <p className='text-gray-500'>Bạn chưa có phim yêu thích nào.</p>}
    </div>
  )
}
