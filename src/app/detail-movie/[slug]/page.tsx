'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getDetailMovie } from '@/api/kkphim/get-detail-movie'
import { getSubtitles } from '@/api/proxy/get-subtitles'
import EpisodeList from '@/component/interactive/episode-list'
import SubtitleBadges from '@/component/interactive/subtitle-badges'
import ReactPlayer from 'react-player'
import Loading from '@/component/status/loading'
import Error from '@/component/status/error'
import Image from 'next/image'
import thumbnail from '@/assets/gumaKe.png'
import FavoriteButton from '@/component/interactive/favorite-button'
import { saveViewHistory } from '@/utils/local-storage'
import VideoPlayer from '@/component/player/custom-player'
import { useAuth } from '@/app/auth-provider'
import MovieReview from '@/component/interactive/movie-review'
import type { SubtitleParams, SubtitleCue } from '@/types/subtitle'

const AUTOPLAY_COUNTDOWN = 5

export default function WatchPage() {
  const { slug } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { data, isLoading, isError } = useQuery(getDetailMovie({ slug: String(slug) }))
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null)
  const [useBackup, setUseBackup] = useState<string | null>(null)
  const [useBackupPlayer, setUseBackupPlayer] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null)

  const isWatching = searchParams.get('watch') === '1'
  const epParam = searchParams.get('ep')
  const tParam = Number(searchParams.get('t') ?? 0) || 0
  const isAvailable = data?.movie?.episode_current === 'Trailer'

  const { season: detectedSeason, isSeasonFallback } = useMemo(() => {
    const originName = data?.movie?.origin_name ?? ''
    // Ưu tiên lấy bằng regex từ origin_name (bắt "season N")
    const match = originName.match(/Season\s*(\d+)/i)
    if (match) return { season: parseInt(match[1], 10), isSeasonFallback: false }

    return { season: 1, isSeasonFallback: true }
  }, [data?.movie?.origin_name])

  // ─── Detect số tập từ ep trên URL (e.g. "Tập 5" → 5) ───────────────────────
  // Dùng epParam thay vì episodeToPlay?.name vì episodeToPlay chưa được define
  // ở thời điểm này (nó nằm sau early returns loading/error).
  // epParam và episodeToPlay.name là cùng giá trị vì handleSelectEpisode
  // luôn set params.set('ep', ep.name).
  const currentEpisodeNumber = useMemo(() => {
    const name = epParam ?? ''
    const match = name.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 1
  }, [epParam])

  const subtitleParams = useMemo((): SubtitleParams | null => {
    const tmdbId = data?.movie?.tmdb?.id
    if (!tmdbId || !isWatching) return null
    const isSeries = data.movie.type === 'series'
    if (isSeries) {
      return { tmdbId, type: 'series', season: detectedSeason, episode: currentEpisodeNumber }
    }
    return { tmdbId, type: 'movie' }
  }, [data?.movie?.tmdb?.id, data?.movie?.type, isWatching, detectedSeason, currentEpisodeNumber])

  const { data: subtitleData, isLoading: isSubLoading, error } = useQuery(getSubtitles(subtitleParams))
  const errorMessage =
    error != null
      ? typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi không xác định'
      : undefined

  const [subtitles1, setSubtitles1] = useState<SubtitleCue[]>([])
  const [subtitles2, setSubtitles2] = useState<SubtitleCue[]>([])

  const goBack = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('watch')
    params.delete('ep')
    params.delete('t')
    router.replace(`?${params.toString()}`)
  }

  // Đặt lại selectedEpisode khi slug thay đổi
  useEffect(() => {
    setSelectedEpisode(null)
  }, [slug])

  // Khôi phục tập đang xem từ URL khi data đã tải
  useEffect(() => {
    if (!data) return
    const allEps = data.episodes.flatMap(s => s.server_data)
    if (isWatching && epParam) {
      const ep = allEps.find(e => e.name === epParam)
      if (ep) {
        setSelectedEpisode(ep.link_embed)
        setUseBackup(ep.link_m3u8)
        return
      }
    }
    if (isWatching && !selectedEpisode && allEps[0]) {
      setSelectedEpisode(allEps[0].link_embed)
      setUseBackup(allEps[0].link_m3u8)
    }
  }, [data, isWatching, epParam])

  // Tự động chọn tập 1 khi data được tải và đang ở chế độ xem phim
  useEffect(() => {
    saveViewHistory({
      name: data?.movie?.name ?? '',
      image: data?.movie?.poster_url ?? '',
      slug: data?.movie?.slug ?? ''
    })
  }, [data])

  // Countdown auto-play tập tiếp theo
  useEffect(() => {
    if (autoplayCountdown === null) return
    if (autoplayCountdown === 0) {
      // Chuyển tập khi đếm về 0
      const eps = data?.episodes?.flatMap(s => s.server_data) ?? []
      const idx = eps.findIndex(ep => ep.link_embed === selectedEpisode)
      if (idx >= 0 && idx < eps.length - 1) {
        const nextEp = eps[idx + 1]
        setSelectedEpisode(nextEp.link_embed)
        setUseBackup(nextEp.link_m3u8)
        setIframeLoading(true)
        const params = new URLSearchParams(searchParams.toString())
        params.set('watch', '1')
        params.set('ep', nextEp.name)
        params.delete('t')
        router.replace(`?${params.toString()}`)
        saveViewHistory({
          name: data?.movie?.name ?? '',
          image: data?.movie?.poster_url ?? '',
          slug: data?.movie?.slug ?? '',
          episodeName: nextEp.name
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      setAutoplayCountdown(null)
      return
    }
    const timer = setTimeout(() => setAutoplayCountdown(prev => (prev !== null ? prev - 1 : null)), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayCountdown])

  if (isLoading) return <Loading />
  if (isError || !data || data.status === false) return <Error message={data?.msg} />

  const flatEpisodes = data.episodes.flatMap(server => server.server_data)
  const currentIndex = flatEpisodes.findIndex(ep => ep.link_embed === selectedEpisode)
  // const backupIndex = flatEpisodes.findIndex(ep => ep.link_m3u8 === selectedEpisode)
  const episodeToPlay = flatEpisodes[currentIndex]
  const movie = data.movie

  const handleSelectEpisode = (ep: string, backup: string, epName?: string) => {
    setSelectedEpisode(ep)
    setUseBackup(backup)
    setIframeLoading(true)
    setAutoplayCountdown(null)
    if (epName) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('watch', '1')
      params.set('ep', epName)
      params.delete('t')
      router.replace(`?${params.toString()}`)
      const historyPayload = {
        name: data?.movie?.name ?? '',
        image: data?.movie?.poster_url ?? '',
        slug: data?.movie?.slug ?? '',
        episodeName: epName
      }
      saveViewHistory(historyPayload)
      if (user) {
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: historyPayload.slug,
            name: historyPayload.name,
            image: historyPayload.image,
            episode_name: epName
          })
        })
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEpisodeEnded = () => {
    if (currentIndex < flatEpisodes.length - 1) {
      setAutoplayCountdown(AUTOPLAY_COUNTDOWN)
    }
  }

  // Giao diện thông tin phim
  if (!isWatching) {
    return (
      <div className='min-h-screen bg-[var(--c-bg)] text-white pb-16'>
        <div className='max-w-6xl mx-auto px-5 sm:px-10 py-8'>
          {/* Header Banner with tilted hard shadow */}
          <div
            className='relative w-full h-[280px] sm:h-[360px] rounded-3xl mb-10 overflow-hidden bg-cover bg-center border border-[var(--c-line)]'
            style={{
              backgroundImage: `url(${movie.poster_url})`,
              boxShadow: '12px 12px 0 var(--c-pink)'
            }}
          >
            <div className='absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[var(--c-bg)]/60 to-transparent' />
            <div className='absolute bottom-0 left-0 w-full p-6 sm:p-10'>
              <div className='flex flex-wrap items-center gap-2 mb-3'>
                <span className='c-sticker m-0 inline-block'>
                  ★ {movie.quality} · {movie.lang}
                </span>
                {movie.status === 'completed' && (
                  <span className='c-sticker m-0 inline-block !bg-[#00ff88] !text-black !border-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)]'>
                    Hoàn Tất
                  </span>
                )}
                {movie.status === 'ongoing' && (
                  <span className='c-sticker m-0 inline-block !bg-[var(--c-cyan)] !text-black !border-[var(--c-cyan)] shadow-[0_0_10px_var(--c-cyan)]'>
                    Đang chiếu
                  </span>
                )}
              </div>
              <h1 className='text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 drop-shadow-lg'>
                {movie.name}
              </h1>
              <p className='text-lg sm:text-xl text-[var(--c-cyan)] font-bold drop-shadow-md'>{movie.origin_name}</p>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10 items-start'>
            {/* Left Column: Poster + CTA */}
            <div className='flex flex-col gap-6'>
              <div
                className='rounded-2xl overflow-hidden border-2 border-[var(--c-line)] bg-black'
                style={{
                  boxShadow: '10px 10px 0 var(--c-yel)',
                  transform: 'rotate(-1.5deg)'
                }}
              >
                <Image
                  unoptimized
                  loading='lazy'
                  width={400}
                  height={600}
                  src={movie.poster_url}
                  alt={movie.name}
                  className='w-full h-auto object-cover'
                />
              </div>

              <button
                className='w-full py-3.5 rounded-xl font-black text-sm tracking-wider text-[var(--c-bg)] bg-[var(--c-pink)] hover:opacity-90 transition-all duration-150 cursor-pointer flex justify-center items-center gap-2 shadow-lg'
                style={{ boxShadow: '5px 5px 0 var(--c-yel)' }}
                onClick={() => {
                  const firstEp = data?.episodes?.[0]?.server_data?.[0]
                  if (firstEp) handleSelectEpisode(firstEp.link_embed, firstEp.link_m3u8, firstEp.name)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                ▶ XEM PHIM
              </button>

              <div>
                <FavoriteButton slug={movie?.slug} image={movie?.poster_url} name={movie.name} />
              </div>

              {/* Fast Info */}
              <div className='rounded-2xl p-5 border border-[var(--c-line)]' style={{ background: 'var(--c-card)' }}>
                {movie.tmdb?.vote_average > 0 && (
                  <div className='flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl border border-white/10'>
                    <div className='bg-[var(--c-yel)] text-[var(--c-bg)] font-black rounded-xl w-12 h-12 flex items-center justify-center text-lg shadow-md shrink-0'>
                      {movie.tmdb.vote_average.toFixed(1)}
                    </div>
                    <div>
                      <p className='text-[10px] text-[var(--c-pink)] font-black uppercase tracking-wider'>
                        TMDB RATING
                      </p>
                      <p className='text-xs text-white/60'>{movie.tmdb.vote_count.toLocaleString()} votes</p>
                    </div>
                  </div>
                )}

                <div className='grid grid-cols-1 gap-y-2 text-sm text-white/80 font-medium'>
                  <div>
                    <span className='text-white/40'>Năm:</span> {movie.year}
                  </div>
                  <div>
                    <span className='text-white/40'>Thời lượng:</span> {movie.time}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className='flex flex-col gap-8'>
              <div className='rounded-2xl p-6 border border-[var(--c-line)]' style={{ background: 'var(--c-card)' }}>
                <h2 className='text-xl font-black tracking-tight text-white flex items-center gap-2 mb-5'>
                  <span className='c-marker cyan' />
                  Chi Tiết
                </h2>

                <div className='space-y-3 text-sm text-white/80'>
                  <p>
                    <span className='font-semibold text-[var(--c-cyan)] inline-block w-28'>Quốc gia:</span>{' '}
                    {movie.country.map(c => c.name).join(', ')}
                  </p>
                  <p>
                    <span className='font-semibold text-[var(--c-cyan)] inline-block w-28'>Thể loại:</span>{' '}
                    {movie.category.map(c => c.name).join(', ')}
                  </p>
                  <p>
                    <span className='font-semibold text-[var(--c-cyan)] inline-block w-28'>Diễn viên:</span>{' '}
                    {movie.actor.join(', ')}
                  </p>
                  <p>
                    <span className='font-semibold text-[var(--c-cyan)] inline-block w-28'>Đạo diễn:</span>{' '}
                    {movie.director.join(', ')}
                  </p>
                  <p>
                    <span className='font-semibold text-[var(--c-cyan)] inline-block w-28'>Tập hiện tại:</span>{' '}
                    {movie.episode_current === 'Full' ? 'Full' : `${movie.episode_current} / ${movie.episode_total}`}
                  </p>
                </div>
              </div>

              <div className='rounded-2xl p-6 border border-[var(--c-line)]' style={{ background: 'var(--c-card)' }}>
                <h2 className='text-xl font-black tracking-tight text-white flex items-center gap-2 mb-4'>
                  <span className='c-marker pink' />
                  Nội Dung
                </h2>
                <p className='text-white/70 leading-relaxed text-sm'>{movie.content}</p>
              </div>

              {movie.trailer_url && (
                <div>
                  <h2 className='text-xl font-black tracking-tight text-white flex items-center gap-2 mb-4'>
                    <span className='c-marker yel' />
                    Trailer
                  </h2>
                  <div className='rounded-2xl overflow-hidden border border-[var(--c-line)] shadow-2xl'>
                    <ReactPlayer url={movie.trailer_url} controls width='100%' height='400px' />
                  </div>
                </div>
              )}

              <MovieReview slug={movie.slug} name={movie.name} image={movie.poster_url} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Giao diện phát video
  return (
    <div className='min-h-screen bg-[var(--c-bg)] text-white pb-16 '>
      <div className='max-w-6xl mx-auto px-5 sm:px-10 py-8'>
        <button
          className='mb-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--c-line)] rounded-xl transition duration-300 flex items-center gap-2 text-sm font-bold text-[var(--c-cyan)] shadow-lg cursor-pointer'
          onClick={() => goBack()}
        >
          ◀ Quay lại thông tin phim
        </button>

        <div className='flex flex-col sm:flex-row sm:items-end gap-2 mb-6'>
          <h1 className='text-2xl sm:text-3xl font-black tracking-tight text-white'>{movie.name}</h1>
          <span className='text-[var(--c-pink)] text-sm font-bold italic sm:mb-1'>{movie.origin_name}</span>
        </div>

        {/* Player trong card */}
        <div
          className='rounded-2xl overflow-hidden border-2 border-[var(--c-line)] mb-8 bg-black'
          style={{ boxShadow: '12px 12px 0 var(--c-pink)' }}
        >
          {selectedEpisode && episodeToPlay ? (
            <div>
              <div className='bg-white/5 p-5 border-b border-[var(--c-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                  <span className='c-marker yel mr-2 inline-block align-middle' />
                  <span className='text-lg font-black align-middle'>{episodeToPlay.name}</span>
                </div>

                {/* Phụ đề khả dụng */}
                <SubtitleBadges
                  data={subtitleData ?? null}
                  isLoading={isSubLoading}
                  errorMessage={errorMessage}
                  isSeasonFallback={data?.movie?.type === 'series' && isSeasonFallback}
                  onSub1Change={setSubtitles1}
                  onSub2Change={setSubtitles2}
                />
              </div>

              <div className='flex justify-center py-3 bg-white/2'>
                <button
                  onClick={() => setUseBackupPlayer(prev => !prev)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition cursor-pointer border
                    ${
                      useBackupPlayer
                        ? 'bg-[var(--c-yel)] text-[var(--c-bg)] border-[var(--c-yel)]'
                        : 'bg-transparent text-[var(--c-cyan)] border-[var(--c-cyan)] hover:bg-[var(--c-cyan)]/10'
                    }`}
                >
                  {useBackupPlayer ? '⚡ DỰ PHÒNG - ĐỔI VỀ SERVER CHÍNH' : '⇄ DÙNG LINK DỰ PHÒNG (CÓ QUẢNG CÁO)'}
                </button>
              </div>

              {/* Wrapper giữ tỉ lệ 16:9 */}
              <div className='relative pt-[56.25%] bg-black'>
                {!useBackupPlayer ? (
                  <VideoPlayer
                    progressKey={`${slug}_${episodeToPlay.name}`}
                    initialTime={tParam}
                    onEnded={handleEpisodeEnded}
                    onProgress={
                      user
                        ? (time, duration) => {
                            fetch('/api/history', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                slug: movie.slug,
                                name: movie.name,
                                image: movie.poster_url,
                                episode_name: episodeToPlay.name,
                                progress: time,
                                duration
                              })
                            })
                          }
                        : undefined
                    }
                    options={{
                      autoplay: false,
                      controls: true,
                      responsive: false,
                      fluid: false,
                      poster: thumbnail.src,
                      sources: [
                        {
                          src: episodeToPlay.link_m3u8,
                          type: 'application/x-mpegURL'
                        }
                      ]
                    }}
                    subtitles1={subtitles1}
                    subtitles2={subtitles2}
                  />
                ) : (
                  <div className='absolute top-0 left-0 w-full h-full'>
                    {iframeLoading && (
                      <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-10'>
                        <span className='text-white/60 text-xs italic'>(Đang tải video dự phòng...)</span>
                      </div>
                    )}
                    <iframe
                      src={episodeToPlay.link_embed || useBackup || ''}
                      title={episodeToPlay.name}
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                      className='w-full h-full border-none'
                    ></iframe>
                  </div>
                )}

                {/* Overlay auto-play tập tiếp theo */}
                {autoplayCountdown !== null && currentIndex < flatEpisodes.length - 1 && (
                  <div className='absolute inset-0 flex items-center justify-center bg-[var(--c-bg)]/90 z-20'>
                    <div className='text-center bg-[var(--c-card)] rounded-2xl p-8 border-2 border-[var(--c-line)] max-w-sm w-full mx-4 shadow-2xl'>
                      <p className='text-white/50 text-[10px] font-black uppercase tracking-wider mb-1'>
                        Tập tiếp theo
                      </p>
                      <p className='text-white font-bold text-lg mb-6 line-clamp-1'>
                        {flatEpisodes[currentIndex + 1]?.name}
                      </p>
                      {/* Vòng đếm ngược */}
                      <div className='relative w-20 h-20 mx-auto mb-6'>
                        <svg className='w-20 h-20 -rotate-90' viewBox='0 0 80 80'>
                          <circle cx='40' cy='40' r='34' fill='none' stroke='rgba(255,255,255,.1)' strokeWidth='6' />
                          <circle
                            cx='40'
                            cy='40'
                            r='34'
                            fill='none'
                            stroke='var(--c-pink)'
                            strokeWidth='6'
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - autoplayCountdown / AUTOPLAY_COUNTDOWN)}`}
                            strokeLinecap='round'
                            className='transition-all duration-1000 ease-linear'
                          />
                        </svg>
                        <span className='absolute inset-0 flex items-center justify-center text-white text-2xl font-black font-mono'>
                          {autoplayCountdown}
                        </span>
                      </div>
                      <div className='flex gap-3 justify-center'>
                        <button
                          onClick={() => {
                            const nextEp = flatEpisodes[currentIndex + 1]
                            handleSelectEpisode(nextEp.link_embed, nextEp.link_m3u8, nextEp.name)
                          }}
                          className='px-5 py-2 rounded-xl font-bold text-sm text-[var(--c-bg)] bg-[var(--c-pink)] hover:opacity-90 transition cursor-pointer'
                        >
                          Xem ngay
                        </button>
                        <button
                          onClick={() => setAutoplayCountdown(null)}
                          className='px-5 py-2 rounded-xl font-bold text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer'
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='flex items-center justify-center h-96 text-white/40 text-sm italic'>
              {!isAvailable ? 'Đang tải tập phim...' : 'Phim chưa cập nhật tập mới...'}
            </div>
          )}
        </div>
        <div className='mb-8 p-2 rounded-xl border border-white/5 bg-white/2 space-y-1.5'>
          <p className='text-xs text-white/50 flex items-center gap-2'>
            <span className='w-1 h-1 rounded-full bg-[var(--c-pink)]' />
            Phụ đề có thể bị lệch trên một số phim, dùng 2 phím{' '}
            <kbd className='px-1.5 py-0.5 rounded bg-white/10 font-mono text-[var(--c-yel)]'>Z</kbd> /{' '}
            <kbd className='px-1.5 py-0.5 rounded bg-white/10 font-mono text-[var(--c-yel)]'>X</kbd> để chỉnh tay
            sớm/trễ.
          </p>
          <p className='text-xs text-white/50 flex items-center gap-2'>
            <span className='w-1 h-1 rounded-full bg-[var(--c-pink)]' />
            Phim nào độ phân giải dị (như 960p) có thể bị lỗi ẩn thanh progress bar khi fullscreen.
          </p>
        </div>

        {/* Điều hướng tập */}
        {selectedEpisode && episodeToPlay && (
          <div className='flex justify-between mb-10'>
            <button
              className='px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold rounded-xl disabled:opacity-30 transition duration-300 flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer'
              disabled={currentIndex <= 0}
              onClick={() => {
                const ep = flatEpisodes[currentIndex - 1]
                handleSelectEpisode(ep.link_embed, ep.link_m3u8, ep.name)
              }}
            >
              ◀ Tập trước
            </button>
            <button
              className='px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold rounded-xl disabled:opacity-30 transition duration-300 flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer text-[var(--c-cyan)]'
              disabled={currentIndex >= flatEpisodes.length - 1}
              onClick={() => {
                const ep = flatEpisodes[currentIndex + 1]
                handleSelectEpisode(ep.link_embed, ep.link_m3u8, ep.name)
              }}
            >
              Tập sau ▶
            </button>
          </div>
        )}

        <div className='grid md:grid-cols-3 gap-8 items-start'>
          {/* Thông tin phim tóm tắt */}
          <div className='md:col-span-1 flex flex-col gap-6'>
            <div className='rounded-2xl p-6 border border-[var(--c-line)]' style={{ background: 'var(--c-card)' }}>
              <h3 className='text-lg font-black tracking-tight text-white mb-4 flex items-center gap-2'>
                <span className='c-marker cyan' />
                Thông tin
              </h3>

              <div className='space-y-3 text-sm text-white/80'>
                <div className='flex items-center gap-4 mb-4'>
                  <Image
                    unoptimized
                    width={100}
                    height={150}
                    src={movie.poster_url}
                    alt={movie.name}
                    className='w-16 h-24 object-cover rounded-xl border border-white/10 shadow-md'
                  />
                  <div className='space-y-1'>
                    <div>
                      <span className='text-white/40'>Năm:</span> {movie.year}
                    </div>
                    <div>
                      <span className='text-white/40'>Chất lượng:</span> {movie.quality}
                    </div>
                    <div>
                      <span className='text-white/40'>Ngôn ngữ:</span> {movie.lang}
                    </div>
                  </div>
                </div>

                <p>
                  <span className='text-white/40 inline-block w-20'>Quốc gia:</span>{' '}
                  {movie.country.map(c => c.name).join(', ')}
                </p>
                <p>
                  <span className='text-white/40 inline-block w-20'>Thể loại:</span>{' '}
                  {movie.category.map(c => c.name).join(', ')}
                </p>
              </div>

              <div className='mt-4 pt-4 border-t border-[var(--c-line)] text-xs text-white/60 leading-relaxed'>
                {movie.content}
              </div>
            </div>
          </div>

          {/* Danh sách tập */}
          <div className='md:col-span-2'>
            <div className='rounded-2xl p-6 border border-[var(--c-line)]' style={{ background: 'var(--c-card)' }}>
              <h3 className='text-lg font-black tracking-tight text-white mb-4 flex items-center gap-2'>
                <span className='c-marker pink' />
                Danh Sách Tập
              </h3>
              {isAvailable ? (
                <div className='text-sm text-white/40 italic'>
                  Phim sẽ cập nhật trong thời gian sớm nhất, mong bạn thông cảm!
                </div>
              ) : (
                data?.episodes && (
                  <EpisodeList
                    episodes={data.episodes}
                    onSelectEpisode={ep => handleSelectEpisode(ep.link_embed, ep.link_m3u8, ep.name)}
                    selectedEpisode={selectedEpisode}
                  />
                )
              )}
            </div>
          </div>
        </div>

        <MovieReview slug={movie.slug} name={movie.name} image={movie.poster_url} />
      </div>
    </div>
  )
}
