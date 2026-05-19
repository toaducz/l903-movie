'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import videojs from 'video.js'
import Player from 'video.js/dist/types/player'
import 'video.js/dist/video-js.css'
import { saveWatchProgress, getWatchProgress, clearWatchProgress, saveWatchDuration } from '@/utils/local-storage'
import { SubtitleCue } from '@/types/subtitle'
import { findActiveSub } from '@/utils/parse-srt'
import SubtitleSettingsPanel from '@/component/player/subtitle-settings-panel'
import { getSubtitleSettings, saveSubtitleSettings, DEFAULT_SUBTITLE_SETTINGS } from '@/utils/subtitle-settings'
import type { SubtitleSettings } from '@/types/subtitle'

interface HLSSegment {
  resolvedUri?: string
  uri: string
  duration: number
}

interface VHSPlaylist {
  segments: HLSSegment[]
}

interface VHSTech {
  vhs?: {
    playlists: {
      media: () => VHSPlaylist | undefined
    }
  }
}

type VideoJsPlayerOptions = Parameters<typeof videojs>[1]

interface VideoPlayerProps {
  options: VideoJsPlayerOptions
  onReady?: (player: Player) => void
  progressKey?: string
  initialTime?: number
  onEnded?: () => void
  onProgress?: (time: number, duration: number, source?: string) => void
  subtitles1?: SubtitleCue[]
  subtitles2?: SubtitleCue[]
  source?: string
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  onReady,
  progressKey,
  initialTime,
  onEnded,
  onProgress,
  subtitles1,
  subtitles2,
  source
}) => {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player | null>(null)
  const currentSrcRef = useRef<string | undefined>(undefined)
  const progressKeyRef = useRef<string | undefined>(progressKey)
  const onProgressRef = useRef(onProgress)
  const onEndedRef = useRef(onEnded)
  const blackScreenRef = useRef<HTMLDivElement>(null)

  // ── Subtitle refs (đọc trong RAF loop, tránh stale closure) ────────────────
  const subtitles1Ref = useRef<SubtitleCue[]>(subtitles1 ?? [])
  const subtitles2Ref = useRef<SubtitleCue[]>(subtitles2 ?? [])
  const subOffsetRef = useRef(0)
  const showSubRef = useRef(true)
  const activeSub1Ref = useRef<string | null>(null)
  const activeSub2Ref = useRef<string | null>(null)

  // ── Subtitle state (drive overlay render) ──────────────────────────────────
  const [activeSub1, setActiveSub1] = useState<string | null>(null)
  const [activeSub2, setActiveSub2] = useState<string | null>(null)
  const [showSub, setShowSub] = useState(true)
  const [subOffset, setSubOffset] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [subSettings, setSubSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_SETTINGS)

  // Load settings từ localStorage khi mount
  useEffect(() => {
    setSubSettings(getSubtitleSettings())
  }, [])

  useEffect(() => {
    progressKeyRef.current = progressKey
    onProgressRef.current = onProgress
    onEndedRef.current = onEnded
  }, [progressKey, onProgress, onEnded])

  // Sync subtitle arrays vào ref khi props thay đổi
  useEffect(() => {
    subtitles1Ref.current = subtitles1 ?? []
  }, [subtitles1])
  useEffect(() => {
    subtitles2Ref.current = subtitles2 ?? []
  }, [subtitles2])

  const [seekHint, setSeekHint] = useState<{ side: 'left' | 'right'; key: number } | null>(null)
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null)
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const player = playerRef.current
    if (!player) return

    // Không trigger khi chạm vào control bar hoặc các nút UI
    const target = e.target as HTMLElement
    if (target.closest('.vjs-control-bar') || target.closest('button')) return

    const touch = e.changedTouches[0]
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const side = touch.clientX - rect.left < rect.width / 2 ? 'left' : 'right'
    const now = Date.now()
    const last = lastTapRef.current

    if (last && now - last.time < 300 && last.side === side) {
      // double-tap detected → tua ±10s, hủy single-tap timer
      lastTapRef.current = null
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current)
        singleTapTimerRef.current = null
      }
      const delta = side === 'right' ? 10 : -10
      player.currentTime(Math.max(0, (player.currentTime() ?? 0) + delta))
      setSeekHint({ side, key: now })
      setTimeout(() => setSeekHint(null), 700)
    } else {
      lastTapRef.current = { time: now, side }
      // single-tap → đợi 300ms, nếu không có tap thứ 2 thì toggle pause/play
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current)
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null
        if (player.paused()) {
          player.play()?.catch(() => {})
        } else {
          player.pause()
        }
      }, 300)
    }
  }, [])

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js')
      videoElement.classList.add('vjs-big-play-centered')
      videoRef.current.appendChild(videoElement)

      const mergedOptions = {
        ...options,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        controlBar: {
          skipButtons: { backward: 10, forward: 10 },
          ...(((options as Record<string, unknown>)?.controlBar as object) ?? {})
        }
      }

      currentSrcRef.current = (options?.sources as Array<{ src: string }> | undefined)?.[0]?.src
      progressKeyRef.current = progressKey
      const player = (playerRef.current = videojs(videoElement, mergedOptions, () => {
        // bắt bàn phím
        const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return
          }

          // Chỉ xử lý phím tắt khi player đang hiển thị trong viewport
          const playerRect = playerEl?.getBoundingClientRect()
          if (playerRect && (playerRect.bottom < 0 || playerRect.top > window.innerHeight)) {
            return
          }

          if (e.key === 'ArrowRight') {
            e.preventDefault()
            player.currentTime(player.currentTime()! + 10)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            player.currentTime(player.currentTime()! - 10)
          } else if (e.key.toLowerCase() === 'f') {
            if (!player.isFullscreen()) {
              player.requestFullscreen()
            } else {
              player.exitFullscreen()
            }
          } else if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault()
            if (player.paused()) {
              player.play()
            } else {
              player.pause()
            }
          } else if (e.key.toLowerCase() === 'm') {
            player.muted(!player.muted())
          } else if (e.key.toLowerCase() === 't') {
            const doc = document as Document & {
              pictureInPictureElement?: Element
              exitPictureInPicture?: () => Promise<void>
            }
            const videoEl = player.el()?.querySelector('video') as
              | (HTMLVideoElement & {
                  requestPictureInPicture?: () => Promise<void>
                })
              | null
            if (doc.pictureInPictureElement) {
              doc.exitPictureInPicture?.()
            } else if (videoEl?.requestPictureInPicture) {
              videoEl.requestPictureInPicture().catch(() => {})
            }
          } else if (e.key === '[') {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
            const current = player.playbackRate() ?? 1
            const idx = rates.indexOf(current)
            if (idx > 0) player.playbackRate(rates[idx - 1])
          } else if (e.key === ']') {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
            const current = player.playbackRate() ?? 1
            const idx = rates.indexOf(current)
            if (idx < rates.length - 1) player.playbackRate(rates[idx + 1])
          } else if (e.key >= '0' && e.key <= '9') {
            const percent = parseInt(e.key) / 10
            const duration = player.duration()
            if (duration) player.currentTime(duration * percent)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            player.volume(Math.min(1, (player.volume() ?? 1) + 0.1))
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            player.volume(Math.max(0, (player.volume() ?? 0) - 0.1))
          } else if (e.key.toLowerCase() === 'c') {
            // Toggle hiển thị phụ đề
            showSubRef.current = !showSubRef.current
            setShowSub(prev => !prev)
          } else if (e.key.toLowerCase() === 'z') {
            // Phụ đề sớm hơn 0.5s
            subOffsetRef.current = parseFloat((subOffsetRef.current - 0.5).toFixed(1))
            setSubOffset(subOffsetRef.current)
          } else if (e.key.toLowerCase() === 'x') {
            // Phụ đề trễ hơn 0.5s
            subOffsetRef.current = parseFloat((subOffsetRef.current + 0.5).toFixed(1))
            setSubOffset(subOffsetRef.current)
          }
        }
        window.addEventListener('keydown', handleKeyDown)

        const handleMouseMove = () => {
          player.userActive(true)
        }
        const playerEl = player.el() as HTMLElement | null
        if (playerEl) {
          playerEl.addEventListener('mousemove', handleMouseMove)
        }

        // xoay ngang
        const handleFullscreenChange = () => {
          if (player.isFullscreen()) {
            player.focus()
          }
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          if (!isMobile) return

          if (player.isFullscreen()) {
            try {
              if (window.screen && window.screen.orientation && 'lock' in window.screen.orientation) {
                const orientation = window.screen.orientation as ScreenOrientation & {
                  lock: (type: string) => Promise<void>
                }
                orientation.lock('landscape').catch(() => {})
              }
            } catch (error) {
              console.warn('Không thể khóa màn hình ngang:', error)
            }
          } else {
            try {
              if (window.screen && window.screen.orientation && 'unlock' in window.screen.orientation) {
                const orientation = window.screen.orientation as ScreenOrientation & { unlock: () => void }
                orientation.unlock()
              }
            } catch (error) {
              console.warn('Không thể mở  khóa màn hình:', error)
            }
          }
        }
        player.on('fullscreenchange', handleFullscreenChange)

        let adRegions: Array<{ start: number; end: number; skipped?: boolean }> = []
        let mutedByAd = false
        let isSkippingAd = false
        let adRafId: number | null = null

        const calculateAdRegions = () => {
          const tech = player.tech() as unknown as VHSTech
          const vhs = tech?.vhs

          if (!vhs) return
          const media = vhs.playlists.media()
          if (!media) return

          let currentTimeAcc = 0
          const newAdRegions: Array<{ start: number; end: number }> = []

          // \d{4,}\.ts = pattern mới kiểu 000010.ts (tên toàn số từ 4 chữ số trở lên)
          const adRegex = /^(segment_\d+|ads?_.*|promo_.*|\d{4,})\.ts$/i

          media.segments.forEach(segment => {
            const url = segment.resolvedUri || segment.uri || ''
            const fileName = url.split('/').pop()?.split('?')[0]?.split('#')[0] || ''

            if (adRegex.test(fileName)) {
              newAdRegions.push({
                start: currentTimeAcc,
                end: currentTimeAcc + segment.duration
              })
            }
            currentTimeAcc += segment.duration
          })

          // Merge các region liền nhau thành 1 để tránh seek nhiều lần
          const merged: Array<{ start: number; end: number; skipped?: boolean }> = []
          for (const region of newAdRegions) {
            const last = merged[merged.length - 1]
            if (last && region.start <= last.end + 1) {
              last.end = Math.max(last.end, region.end)
            } else {
              merged.push({ ...region })
            }
          }
          adRegions = merged
        }

        player.on('loadedmetadata', calculateAdRegions)
        player.on('mediachange', calculateAdRegions)
        player.on('seeked', calculateAdRegions)

        const pollAds = () => {
          if (player.isDisposed()) return
          adRafId = requestAnimationFrame(pollAds)

          if (adRegions.length === 0) return
          const currentTime = player.currentTime() ?? 0

          const PRE_MUTE = 0.2 // Chỉ cần pre-mute 0.2s
          const upcoming = adRegions.find(r => currentTime >= r.start - PRE_MUTE && currentTime < r.end)

          if (upcoming) {
            if (!mutedByAd) {
              // 1. NGAY LÚC PHÁT HIỆN: Sập rèm đen & Tắt tiếng
              if (blackScreenRef.current) blackScreenRef.current.style.opacity = '1'
              player.muted(true)
              mutedByAd = true
            }

            // 2. Ép tua đi (CHỈ 1 LẦN NHỜ CỜ KHÓA)
            if (!isSkippingAd) {
              isSkippingAd = true
              player.currentTime(upcoming.end + 0.2)
            }
          } else {
            if (mutedByAd) {
              // 3. KHI ĐÃ TUA QUA KHỎI VÙNG QUẢNG CÁO VÀ TẢI XONG PHIM
              if (!player.seeking()) {
                setTimeout(() => {
                  if (blackScreenRef.current) blackScreenRef.current.style.opacity = '0'
                  player.muted(false)
                  mutedByAd = false
                  isSkippingAd = false
                }, 150)
              }
            }
          }

          // ── Subtitle sync (60fps, binary search O(log n)) ──────────────────
          if (!showSubRef.current) {
            if (activeSub1Ref.current !== null) {
              activeSub1Ref.current = null
              setActiveSub1(null)
            }
            if (activeSub2Ref.current !== null) {
              activeSub2Ref.current = null
              setActiveSub2(null)
            }
          } else {
            let adTimePassed = 0
            let inAd = false
            for (const region of adRegions) {
              if (currentTime >= region.end) {
                adTimePassed += region.end - region.start
              } else if (currentTime >= region.start - PRE_MUTE && currentTime < region.end) {
                inAd = true
                break
              } else {
                break
              }
            }
            if (inAd) {
              if (activeSub1Ref.current !== null) {
                activeSub1Ref.current = null
                setActiveSub1(null)
              }
              if (activeSub2Ref.current !== null) {
                activeSub2Ref.current = null
                setActiveSub2(null)
              }
            } else {
              const realTime = currentTime - adTimePassed + subOffsetRef.current
              const cue1 = findActiveSub(subtitles1Ref.current, realTime)
              if (cue1 !== activeSub1Ref.current) {
                activeSub1Ref.current = cue1
                setActiveSub1(cue1)
              }
              const cue2 = findActiveSub(subtitles2Ref.current, realTime)
              if (cue2 !== activeSub2Ref.current) {
                activeSub2Ref.current = cue2
                setActiveSub2(cue2)
              }
            }
          }
        }
        adRafId = requestAnimationFrame(pollAds)

        player.on('dispose', () => {
          if (adRafId !== null) cancelAnimationFrame(adRafId)
          window.removeEventListener('keydown', handleKeyDown)
          if (playerEl) {
            playerEl.removeEventListener('mousemove', handleMouseMove)
          }
        })

        // Restore vị trí xem — ưu tiên giá trị lớn hơn giữa URL (cross-device) và localStorage (same device)
        const saved = Math.max(initialTime ?? 0, progressKey ? getWatchProgress(progressKey) : 0)
        if (saved > 0) {
          player.one('loadedmetadata', () => {
            // Chỉ seek nếu tập này thực sự có tiến trình cũ
            player.currentTime(saved)
            player.play()?.catch(() => {})
          })
        }

        // Lưu vị trí xem mỗi 5s
        let lastSaved = 0

        const handleSaveProgress = () => {
          const key = progressKeyRef.current
          if (!key) return
          const current = player.currentTime() ?? 0
          saveWatchProgress(key, current)
          const dur = player.duration() ?? 0
          if (dur > 0) {
            saveWatchDuration(key, dur)
            onProgressRef.current?.(current, dur, source)
          }
          lastSaved = current
        }

        // Khi video đang chạy
        player.on('timeupdate', () => {
          const current = player.currentTime() ?? 0
          // fix trường hợp tua lùi thì cũng lưu, xài cái này cho nó không âm
          if (Math.abs(current - lastSaved) >= 5) {
            handleSaveProgress()
          }
        })

        // Xóa khi xem xong + callback cho parent
        player.on('ended', () => {
          const key = progressKeyRef.current
          if (key) clearWatchProgress(key)
          onEndedRef.current?.()
        })

        // Thêm nút tua 90s vào control bar — bên phải, trước nút fullscreen
        const controlBarEl = player.el()?.querySelector('.vjs-control-bar') as HTMLElement | null
        if (controlBarEl) {
          const skip90Btn = document.createElement('button')
          skip90Btn.className = 'vjs-skip-90s-button vjs-control vjs-button'
          skip90Btn.title = 'Tua 90 giây'
          skip90Btn.setAttribute('type', 'button')
          skip90Btn.innerHTML = `
            <span class="vjs-icon-placeholder" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; margin: auto;">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
                <text x="12" y="15" font-size="8" font-weight="900" text-anchor="middle" font-family="sans-serif">90</text>
              </svg>
            </span>
            <span class="vjs-control-text" aria-live="polite">Tua 90 giây</span>
          `
          skip90Btn.addEventListener('click', () => {
            const current = player.currentTime() ?? 0
            const duration = player.duration() ?? 0
            player.currentTime(Math.min(duration, current + 90))
          })
          const fsBtn = controlBarEl.querySelector('.vjs-fullscreen-control')
          if (fsBtn) {
            controlBarEl.insertBefore(skip90Btn, fsBtn)
          } else {
            controlBarEl.appendChild(skip90Btn)
          }
        }

        if (onReady) onReady(player)
      }))
    } else if (playerRef.current) {
      const player = playerRef.current
      if (options?.autoplay !== undefined) player.autoplay(options.autoplay)
      if (options?.poster) player.poster(options.poster)
      const newSrc = (options?.sources as Array<{ src: string }> | undefined)?.[0]?.src
      if (options?.sources && newSrc !== currentSrcRef.current) {
        currentSrcRef.current = newSrc
        progressKeyRef.current = progressKey
        player.src(options.sources)

        // Lấy tiến trình CỦA TẬP MỚI
        const savedOnChange = Math.max(initialTime ?? 0, progressKey ? getWatchProgress(progressKey) : 0)

        player.one('loadedmetadata', () => {
          // Luôn luôn seek về mốc thời gian của tập mới (kể cả là 0) để reset player
          player.currentTime(savedOnChange)
          player.play()?.catch(() => {})
        })
      }
    }
  }, [options, onReady, progressKey, initialTime])

  useEffect(() => {
    return () => {
      const player = playerRef.current
      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <div data-vjs-player className='absolute top-0 left-0 w-full h-full overflow-hidden' onTouchEnd={handleTap}>
      <div ref={videoRef} className='w-full h-full' />

      <div
        ref={blackScreenRef}
        className='pointer-events-none absolute top-0 left-0 w-full h-full bg-black z-50 flex items-center justify-center'
        style={{ opacity: 0, transition: 'opacity 0.1s ease-in-out' }}
      >
        <span className='text-sm font-semibold drop-shadow'>Bỏ qua QC...</span>
      </div>

      {seekHint && (
        <div
          key={seekHint.key}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-white animate-seek-hint ${
            seekHint.side === 'left' ? 'left-6' : 'right-6'
          }`}
        >
          <div className='rounded-full bg-white/20 p-4 text-2xl'>{seekHint.side === 'left' ? '«' : '»'}</div>
          <span className='text-sm font-semibold drop-shadow'>{seekHint.side === 'right' ? '+10s' : '-10s'}</span>
        </div>
      )}

      {/* Subtitle overlay — vị trí và màu theo settings */}
      {showSub && (activeSub1 || activeSub2) && (
        <div
          className='pointer-events-none absolute left-0 right-0 text-center z-40 px-6'
          style={{ bottom: `${subSettings.bottomOffset}%` }}
        >
          {activeSub1 && (
            <p
              className='text-base md:text-lg font-semibold leading-snug mb-0.5 inline-block rounded px-1'
              style={{
                color: subSettings.sub1Color,
                backgroundColor: subSettings.bgColor,
                textShadow: '0 1px 3px #000'
              }}
            >
              {activeSub1}
            </p>
          )}
          {activeSub2 && (
            <p
              className='text-sm md:text-base leading-snug inline-block rounded px-1'
              style={{
                color: subSettings.sub2Color,
                backgroundColor: subSettings.bgColor,
                textShadow: '0 1px 3px #000'
              }}
            >
              {activeSub2}
            </p>
          )}
        </div>
      )}

      {/* Sub offset indicator */}
      {subOffset !== 0 && (
        <div className='pointer-events-none absolute top-2 right-2 z-50'>
          <span className='text-xs bg-black/70 text-white rounded px-2 py-1 font-mono'>
            Sub {subOffset > 0 ? '+' : ''}
            {subOffset}s
          </span>
        </div>
      )}

      {/* Help button & panel */}
      <button
        onClick={() => {
          setShowHelp(v => !v)
          setShowSettings(false)
        }}
        className='absolute top-2 left-2 z-50 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-opacity opacity-30 hover:opacity-100'
        title='Hướng dẫn phím tắt'
      >
        ?
      </button>

      {/* Settings button */}
      <button
        onClick={() => {
          setShowSettings(v => !v)
          setShowHelp(false)
        }}
        className='absolute top-2 left-9 z-50 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-opacity opacity-30 hover:opacity-100'
        title='Cài đặt phụ đề'
      >
        ⚙
      </button>

      {/* Click outside overlay */}
      {(showHelp || showSettings) && (
        <div
          className='absolute inset-0 z-40 cursor-default'
          onClick={e => {
            e.stopPropagation()
            setShowHelp(false)
            setShowSettings(false)
          }}
          onTouchEnd={e => {
            e.stopPropagation()
            setShowHelp(false)
            setShowSettings(false)
          }}
        />
      )}

      {showHelp && (
        <div className='absolute top-9 left-2 z-50 bg-black/85 text-white rounded-lg p-3 text-xs space-y-1 min-w-[220px] backdrop-blur-sm'>
          <p className='font-semibold text-gray-300 mb-2'>⌨ Phím tắt</p>
          <div className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1'>
            <kbd className='font-mono bg-white/10 rounded px-1'>Space</kbd>
            <span>Tạm dừng / Phát</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>← →</kbd>
            <span>Tua ±10 giây</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>↑ ↓</kbd>
            <span>Âm lượng ±10%</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>0–9</kbd>
            <span>Nhảy đến % thời gian</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>[ ]</kbd>
            <span>Tốc độ phát</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>M</kbd>
            <span>Tắt / Bật tiếng</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>F</kbd>
            <span>Toàn màn hình</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>T</kbd>
            <span>Picture-in-Picture</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>C</kbd>
            <span>Ẩn / Hiện phụ đề</span>
            <kbd className='font-mono bg-white/10 rounded px-1'>Z / X</kbd>
            <span>Phụ đề sớm / trễ 0.5s</span>
          </div>
        </div>
      )}

      {showSettings && (
        <div className='absolute top-9 left-2 z-50 bg-black/90 rounded-lg p-4 min-w-[260px] backdrop-blur-sm'>
          <p className='text-white text-xs font-semibold mb-3'>⚙ Cài đặt phụ đề</p>
          <SubtitleSettingsPanel
            compact
            settings={subSettings}
            onChange={s => {
              setSubSettings(s)
              saveSubtitleSettings(s)
            }}
          />
        </div>
      )}
      <style jsx global>{`
        .video-js {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          top: 0;
          left: 0;
        }
        .vjs-poster {
          background-size: cover !important;
        }
        .vjs-skip-90s-button {
          cursor: pointer;
          flex: none;
          position: relative;
          width: 3em;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vjs-skip-90s-button .vjs-icon-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .vjs-skip-90s-button:hover {
          opacity: 0.8;
        }

        /* Ẩn bớt các chức năng không quan trọng trên điện thoại màn hình dọc */
        @media (max-width: 768px) and (orientation: portrait) {
          .video-js .vjs-volume-panel,
          .video-js .vjs-picture-in-picture-control,
          .video-js .vjs-playback-rate,
          .video-js .vjs-skip-90s-button {
            display: none !important;
          }

          /* Giảm kích thước một số nút để có thêm không gian */
          .video-js .vjs-control {
            width: 3em;
          }
        }

        /* Điện thoại nhỏ nữa thì ẩn luôn nút tua +/- 10s (người dùng vẫn có thể double-tap) */
        @media (max-width: 480px) and (orientation: portrait) {
          .video-js .vjs-skip-backward-10,
          .video-js .vjs-skip-forward-10 {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default VideoPlayer
