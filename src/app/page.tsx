'use client'

import { useState } from 'react'
import MovieItem from '@/component/item/movie-item'
import { useQuery } from '@tanstack/react-query'
import { getLatestMovies, getListMovies } from '@/services/movie-service'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import Link from 'next/link'
import ContinueWatchingSection from '@/component/sections/continue-watching-section'
import HeroSection from '@/component/sections/hero-section'
import SeriesRowSection from '@/component/sections/series-row-section'
import MoviesRowSection from '@/component/sections/movies-row-section'
import AnimeRowSection from '@/component/sections/anime-row-section'
import MoodSection from '@/component/sections/mood-section'
import LateNightNotice from '@/component/notice/late-night-notice'
import type { MovieItem as MovieItemType } from '@/types/movie'


export default function Home() {
  const [tab, setTab] = useState<'all' | 'phim-bo' | 'phim-le' | 'hoat-hinh'>('all')

  const { data: updateMovie, isLoading, isError } = useQuery(getLatestMovies({ page: 1 }))
  const { data: phimbo } = useQuery(getListMovies({ typelist: 'phim-bo', page: 1, limit: 5 }))
  const { data: phimle } = useQuery(getListMovies({ typelist: 'phim-le', page: 1, limit: 4 }))
  const { data: hoathinh } = useQuery(getListMovies({ typelist: 'hoat-hinh', country: 'nhat-ban', page: 1, limit: 6 }))

  if (isLoading) return <Loading />
  if (isError) return <Error />

  const allMovies = updateMovie?.items ?? []
  const featuredMovie = allMovies[0]

  // Tab-filtered grid (excludes the hero item)
  const gridMovies = (() => {
    const pool = allMovies.slice(1)
    if (tab === 'phim-bo') return pool.filter((m: MovieItemType) => m.type === 'series')
    if (tab === 'phim-le') return pool.filter((m: MovieItemType) => m.type === 'single')
    if (tab === 'hoat-hinh') return pool.filter((m: MovieItemType) => m.type === 'hoathinh')
    return pool
  })()

  const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'phim-bo', label: 'Phim bộ' },
    { key: 'phim-le', label: 'Phim lẻ' },
    { key: 'hoat-hinh', label: 'Anime' }
  ] as const

  return (
    <main className='min-h-screen pb-16' style={{ paddingTop: '72px' }}>
      {/* ── Hero ─────────────────────────────────────── */}
      {featuredMovie && <HeroSection movie={featuredMovie} />}

      {/* ── Continue Watching ────────────────────────── */}
      <ContinueWatchingSection />

      {/* ── New Releases grid ────────────────────────── */}
      <section className='px-5 sm:px-10 py-8'>
        <div className='max-w-[1400px] mx-auto'>
          {/* Header + tabs */}
          <div className='flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4'>
            <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3'>
              <span className='c-marker yel' />
              Mới ra lò
            </h2>

            {/* Tab pills */}
            <div className='flex gap-2 flex-wrap'>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className='px-3.5 py-1.5 text-[13px] rounded-full border transition-all duration-150 cursor-pointer font-semibold'
                  style={
                    tab === t.key
                      ? {
                          background: 'var(--c-yel)',
                          color: 'var(--c-bg)',
                          borderColor: 'var(--c-yel)'
                        }
                      : {
                          background: 'transparent',
                          color: 'rgba(255,255,255,.55)',
                          borderColor: 'rgba(255,255,255,.10)'
                        }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Movie grid */}
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 sm:gap-6'>
            {gridMovies.map((movie: MovieItemType, index: number) => (
              <MovieItem key={movie._id ?? movie.slug} movie={movie} index={index} cdnDomain={updateMovie?.APP_DOMAIN_CDN_IMAGE} source={movie.source} />
            ))}
          </div>

          {/* See more */}
          <div className='mt-10 flex justify-center'>
            <Link
              href='/all-movie'
              className='text-sm text-white/40 hover:text-[var(--c-cyan)] transition-colors underline cursor-pointer'
            >
              Xem thêm tất cả phim mới
            </Link>
          </div>
        </div>
      </section>

      {/* ── Phim bộ row ──────────────────────────────── */}
      {(phimbo?.items?.length ?? 0) > 0 && <SeriesRowSection movies={phimbo!.items} />}

      {/* ── Phim lẻ row ──────────────────────────────── */}
      {(phimle?.items?.length ?? 0) > 0 && <MoviesRowSection movies={phimle!.items} />}

      {/* ── Anime row ────────────────────────────────── */}
      {(hoathinh?.items?.length ?? 0) > 0 && <AnimeRowSection movies={hoathinh!.items} />}

      {/* ── Mood / AI Agent placeholder ──────────────── */}
      <MoodSection />

      {/* ── Late-night server lag notice ─────────────────── */}
      <LateNightNotice />
    </main>
  )
}

