'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

interface VHSRepresentation {
  id: string
  width: number
  height: number
  bandwidth: number
  enabled: (val?: boolean) => boolean
}

interface VHSTech {
  vhs?: {
    playlists: {
      media: () => VHSPlaylist | undefined
    }
    representations: () => VHSRepresentation[]
  }
}

type VideoJsPlayerOptions = Parameters<typeof videojs>[1]

interface VideoPlayerProps {
  options: VideoJsPlayerOptions
  onReady?: (player: Player) => void
  progressKey?: string
  initialTime?: number
  onEnded?: () => void
  onProgress?: (time: number, duration: number) => void
  subtitles1?: SubtitleCue[]
  subtitles2?: SubtitleCue[]
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  onReady,
  progressKey,
  initialTime,
  onEnded,
  onProgress,
  subtitles1,
  subtitles2
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
  const [playerEl, setPlayerEl] = useState<HTMLElement | null>(null)

  // ── Quality selection state ───────────────────────────────────────────────
  const [qualityLevels, setQualityLevels] = useState<{ id: string; label: string }[]>([])
  const [currentQuality, setCurrentQuality] = useState<string>('auto')
  const [showQuality, setShowQuality] = useState(false)

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
  const qualityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const player = playerRef.current
    if (!player) return

    // Không trigger double-tap khi chạm vào control bar
    const target = e.target as HTMLElement
    if (target.closest('.vjs-control-bar')) return

    const touch = e.changedTouches[0]
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const side = touch.clientX - rect.left < rect.width / 2 ? 'left' : 'right'
    const now = Date.now()
    const last = lastTapRef.current

    if (last && now - last.time < 300 && last.side === side) {
      // double-tap detected
      lastTapRef.current = null
      const delta = side === 'right' ? 10 : -10
      player.currentTime(Math.max(0, (player.currentTime() ?? 0) + delta))
      setSeekHint({ side, key: now })
      setTimeout(() => setSeekHint(null), 700)
    } else {
      lastTapRef.current = { time: now, side }
    }
  }, [])

  const handleSetQuality = useCallback((id: string) => {
    const player = playerRef.current
    if (!player) return
    const tech = player.tech() as unknown as VHSTech
    const reps = tech.vhs?.representations()
    if (!reps) return

    if (id === 'auto') {
      reps.forEach(r => r.enabled(true))
    } else {
      reps.forEach(r => r.enabled(r.id === id))
    }
    setCurrentQuality(id)
    setShowQuality(false)
  }, [])

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js')
      videoElement.classList.add('vjs-big-play-centered')
      videoRef.current.appendChild(videoElement)

      const mergedOptions = {
        ...options,
        html5: {
          vhs: {
            limitRenditionByPlayerDimensions: false,
            useDevicePixelRatio: false,
            ...(options as { html5?: { vhs?: Record<string, unknown> } })?.html5?.vhs
          }
        },
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        controlBar: {
          skipButtons: { backward: 10, forward: 10 },
          pictureInPictureToggle: false,
          ...(((options as Record<string, unknown>)?.controlBar as object) ?? {})
        }
      }

      currentSrcRef.current = (options?.sources as Array<{ src: string }> | undefined)?.[0]?.src
      progressKeyRef.current = progressKey
      const player = (playerRef.current = videojs(videoElement, mergedOptions, () => {
        setPlayerEl(player.el() as HTMLElement)
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
          } else {
            return // Phím không được handle → bỏ qua
          }

          // Báo Video.js user đang active → hiện control bar khi dùng bàn phím
          player.userActive(true)
          // Ngăn Video.js double-handle cùng phím trên player element
          // (Space sẽ toggle 2 lần = net không pause; Arrow sẽ tua 2 lần = ±15s)
          e.stopPropagation()
        }
        window.addEventListener('keydown', handleKeyDown)

        const handleMouseMove = () => {
          if (playerRef.current) {
            playerRef.current.userActive(true)
          }
        }
        const playerEl = player.el() as HTMLElement | null
        if (playerEl) {
          playerEl.addEventListener('mousemove', handleMouseMove)
          playerEl.addEventListener('mousedown', handleMouseMove)
          playerEl.addEventListener('touchstart', handleMouseMove)
        }

        // xoay ngang + fix control bar trong fullscreen
        let fullscreenPointerHandler: (() => void) | null = null

        const handleFullscreenChange = () => {
          if (player.isFullscreen()) {
            player.focus()

            const controlBar = player.getChild('controlBar')
            if (controlBar) {
              const el = controlBar.el() as HTMLElement
              if (el) {
                const prevDisplay = el.style.display
                el.style.display = 'none'
                void el.offsetHeight // Cú lừa trigger reflow
                el.style.display = prevDisplay
              }
            }

            if (!fullscreenPointerHandler) {
              fullscreenPointerHandler = () => {
                if (playerRef.current && !playerRef.current.isDisposed()) {
                  playerRef.current.userActive(true)
                }
              }
              document.addEventListener('pointermove', fullscreenPointerHandler)
            }
          } else {
            if (fullscreenPointerHandler) {
              document.removeEventListener('pointermove', fullscreenPointerHandler)
              fullscreenPointerHandler = null
            }
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
              console.warn('Không thể mở khóa màn hình:', error)
            }
          }
        }
        player.on('fullscreenchange', handleFullscreenChange)

        const updateQualityLevels = () => {
          const tech = player.tech() as unknown as VHSTech
          const reps = tech?.vhs?.representations()
          if (reps && reps.length > 0) {
            const levels = reps
              .map(r => ({
                id: r.id,
                label: r.height ? `${r.height}p` : 'N/A'
              }))
              .sort((a, b) => parseInt(b.label) - parseInt(a.label))

            const uniqueLevels = levels.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i)

            // Chỉ cập nhật nếu thực sự có sự thay đổi về danh sách độ phân giải để tránh nháy (re-render portal)
            setQualityLevels(prev => {
              if (prev.length === uniqueLevels.length && prev.every((l, i) => l.label === uniqueLevels[i].label)) {
                return prev
              }
              return uniqueLevels
            })
          }
        }

        player.on('loadedmetadata', updateQualityLevels)
        player.on('mediachange', updateQualityLevels)

        let adRegions: Array<{ start: number; end: number; skipped?: boolean }> = []
        let mutedByAd = false
        let adRafId: number | null = null
        let isSeekingAd = false
        let adRegionsReady = false

        const calculateAdRegions = () => {
          const tech = player.tech() as unknown as VHSTech
          const vhs = tech?.vhs
          if (!vhs) return

          const media = vhs.playlists.media()
          if (!media?.segments?.length) return

          const playerDuration = player.duration() ?? 0
          if (playerDuration > 0) {
            const segTotal = media.segments.reduce((s, seg) => s + (seg.duration || 0), 0)
            if (segTotal < playerDuration * 0.85) return
          }

          adRegionsReady = true

          let currentTimeAcc = 0
          const newAdRegions: Array<{ start: number; end: number }> = []
          const adRegex = /^(segment_\d+|ads?_.*|promo_.*|\d{4,})\.ts$/i

          media.segments.forEach(segment => {
            const url = segment.resolvedUri || segment.uri || ''
            const fileName = url.split('/').pop()?.split('?')[0]?.split('#')[0] || ''
            // Round accumulated time to 3 decimals to prevent floating-point drift
            // across many segments (especially on high segment-count streams)
            const segStart = Math.round(currentTimeAcc * 1000) / 1000
            const segEnd = Math.round((currentTimeAcc + segment.duration) * 1000) / 1000
            if (adRegex.test(fileName)) {
              newAdRegions.push({ start: segStart, end: segEnd })
            }
            currentTimeAcc += segment.duration
          })

          const merged: Array<{ start: number; end: number; skipped?: boolean }> = []
          for (const region of newAdRegions) {
            const last = merged[merged.length - 1]
            if (last && region.start <= last.end + 1) {
              last.end = Math.max(last.end, region.end)
            } else {
              merged.push({ ...region })
            }
          }

          for (const newR of merged) {
            const old = adRegions.find(r => Math.abs(r.start - newR.start) < 2 && Math.abs(r.end - newR.end) < 2)
            if (old?.skipped) newR.skipped = true
          }
          adRegions = merged
        }

        player.on('loadedmetadata', calculateAdRegions)
        player.on('mediachange', calculateAdRegions)
        player.on('canplay', calculateAdRegions)

        const pollAds = () => {
          if (player.isDisposed()) return
          adRafId = requestAnimationFrame(pollAds)
          if (!adRegionsReady) {
            calculateAdRegions()
            return
          }
          if (adRegions.length === 0) return
          const currentTime = player.currentTime() ?? 0
          const PRE_MUTE = 0.2
          const upcoming = adRegions.find(r => currentTime >= r.start - PRE_MUTE && currentTime < r.end)

          if (upcoming) {
            if (!mutedByAd) {
              if (blackScreenRef.current) blackScreenRef.current.style.opacity = '1'
              player.muted(true)
              mutedByAd = true
            }
            if (
              !upcoming.skipped &&
              !isSeekingAd &&
              currentTime >= upcoming.start &&
              currentTime < upcoming.end - 0.1
            ) {
              upcoming.skipped = true
              isSeekingAd = true
              // Add +0.3s overshoot buffer to ensure we land PAST the ad boundary.
              // On high-refresh displays (144Hz+) the decoder's actual timestamp
              // can differ from the manifest-accumulated nominal duration, causing
              // a seek to the exact end to still land inside the ad.
              const seekTarget = upcoming.end + 0.3
              player.currentTime(seekTarget)
              player.one('seeked', () => {
                // Post-seek verification: if we somehow still landed inside the ad
                // region (e.g. network buffering snapped back), seek once more.
                const ct = player.currentTime() ?? 0
                if (ct >= upcoming.start && ct < upcoming.end) {
                  player.currentTime(upcoming.end + 0.5)
                  player.one('seeked', () => {
                    isSeekingAd = false
                  })
                } else {
                  isSeekingAd = false
                }
              })
            }
          } else if (mutedByAd) {
            setTimeout(() => {
              if (blackScreenRef.current) blackScreenRef.current.style.opacity = '0'
              player.muted(false)
              mutedByAd = false
            }, 150)
          }

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
              if (currentTime >= region.end) adTimePassed += region.end - region.start
              else if (currentTime >= region.start && currentTime < region.end) {
                inAd = true
                break
              } else break
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
            playerEl.removeEventListener('mousedown', handleMouseMove)
            playerEl.removeEventListener('touchstart', handleMouseMove)
          }
          if (fullscreenPointerHandler) {
            document.removeEventListener('pointermove', fullscreenPointerHandler)
            fullscreenPointerHandler = null
          }
        })

        const saved = Math.max(initialTime ?? 0, progressKey ? getWatchProgress(progressKey) : 0)
        if (saved > 0) {
          player.one('loadedmetadata', () => {
            player.currentTime(saved)
            player.play()?.catch(() => {})
          })
        }

        let lastSaved = 0
        const handleSaveProgress = () => {
          const key = progressKeyRef.current
          if (!key) return
          const current = player.currentTime() ?? 0
          saveWatchProgress(key, current)
          const dur = player.duration() ?? 0
          if (dur > 0) {
            saveWatchDuration(key, dur)
            onProgressRef.current?.(current, dur)
          }
          lastSaved = current
        }

        player.on('timeupdate', () => {
          const current = player.currentTime() ?? 0
          if (Math.abs(current - lastSaved) >= 5) handleSaveProgress()
        })

        player.on('ended', () => {
          const key = progressKeyRef.current
          if (key) clearWatchProgress(key)
          onEndedRef.current?.()
        })

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
          if (fsBtn) controlBarEl.insertBefore(skip90Btn, fsBtn)
          else controlBarEl.appendChild(skip90Btn)

          const qualityBtn = document.createElement('button')
          qualityBtn.className = 'vjs-quality-button vjs-control vjs-button'
          qualityBtn.title = 'Chất lượng'
          qualityBtn.setAttribute('type', 'button')
          qualityBtn.innerHTML = `
            <span class="vjs-icon-placeholder" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px; margin: auto;">
                <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14zm-4-4h2v-2h-2v2zm0-4h2V9h-2v2zM9 13h2v-2H9v2zm0 4h2v-2H9v2zm0-8h2V7H9v2z" />
              </svg>
            </span>
            <span class="vjs-control-text" aria-live="polite">Chất lượng</span>
          `
          qualityBtn.addEventListener('click', () => {
            setShowQuality(v => !v)
            setShowSettings(false)
            setShowHelp(false)
          })
          qualityBtn.addEventListener('mouseenter', () => {
            if (qualityTimeoutRef.current) clearTimeout(qualityTimeoutRef.current)
            setShowQuality(true)
            setShowSettings(false)
            setShowHelp(false)
          })
          qualityBtn.addEventListener('mouseleave', () => {
            qualityTimeoutRef.current = setTimeout(() => {
              setShowQuality(false)
            }, 200)
          })

          const playbackBtn = controlBarEl.querySelector('.vjs-playback-rate')
          if (playbackBtn) controlBarEl.insertBefore(qualityBtn, playbackBtn)
          else if (fsBtn) controlBarEl.insertBefore(qualityBtn, fsBtn)
          else controlBarEl.appendChild(qualityBtn)
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
        const savedOnChange = Math.max(initialTime ?? 0, progressKey ? getWatchProgress(progressKey) : 0)
        if (savedOnChange > 0) {
          player.one('loadedmetadata', () => {
            player.currentTime(savedOnChange)
            player.play()?.catch(() => {})
          })
        }
      }
    }
  }, [options, onReady, initialTime, progressKey])

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
    <div
      data-vjs-player
      className='absolute top-0 left-0 w-full h-full overflow-hidden'
      onMouseMove={() => playerRef.current?.userActive(true)}
      onMouseDown={() => playerRef.current?.userActive(true)}
      onTouchStart={() => playerRef.current?.userActive(true)}
      onTouchEnd={handleTap}
    >
      <div ref={videoRef} className='w-full h-full' />

      {playerEl &&
        createPortal(
          <>
            <div
              ref={blackScreenRef}
              className='pointer-events-none absolute top-0 left-0 w-full h-full bg-black z-[110] flex items-center justify-center'
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
                style={{ zIndex: 110 }}
              >
                <div className='rounded-full bg-white/20 p-4 text-2xl'>{seekHint.side === 'left' ? '«' : '»'}</div>
                <span className='text-sm font-semibold drop-shadow'>{seekHint.side === 'right' ? '+10s' : '-10s'}</span>
              </div>
            )}

            {showSub && (activeSub1 || activeSub2) && (
              <div
                className='pointer-events-none absolute left-0 right-0 text-center z-[90] px-6'
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

            {subOffset !== 0 && (
              <div className='pointer-events-none absolute top-2 right-2 z-[110]'>
                <span className='text-xs bg-black/70 text-white rounded px-2 py-1 font-mono'>
                  Sub {subOffset > 0 ? '+' : ''}
                  {subOffset}s
                </span>
              </div>
            )}

            <button
              onClick={e => {
                e.stopPropagation()
                setShowHelp(v => !v)
                setShowSettings(false)
                setShowQuality(false)
              }}
              className='absolute top-2 left-2 z-[110] w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-opacity opacity-30 hover:opacity-100 cursor-pointer'
              title='Hướng dẫn phím tắt'
            >
              ?
            </button>

            <button
              onClick={e => {
                e.stopPropagation()
                setShowSettings(v => !v)
                setShowHelp(false)
                setShowQuality(false)
              }}
              className='absolute top-2 left-9 z-[110] w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-opacity opacity-30 hover:opacity-100 cursor-pointer'
              title='Cài đặt phụ đề'
            >
              ⚙
            </button>

            {(showHelp || showSettings) && (
              <div
                className='absolute inset-0 z-[100] cursor-default'
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
              <div className='absolute top-9 left-2 z-[110] bg-black/85 text-white rounded-lg p-3 text-xs space-y-1 min-w-[220px] backdrop-blur-sm'>
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
              <div className='absolute top-9 left-9 z-[110] bg-black/90 rounded-lg p-4 min-w-[260px] backdrop-blur-sm'>
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

            {showQuality && (
              <div
                onMouseEnter={() => {
                  if (qualityTimeoutRef.current) clearTimeout(qualityTimeoutRef.current)
                }}
                onMouseLeave={() => setShowQuality(false)}
                className='absolute bottom-[3.5em] right-[4em] md:right-[5.5em] z-[110] bg-[#2b333f]/90 min-w-[100px] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200'
              >
                <div className='flex flex-col max-h-[250px] overflow-y-auto scrollbar-hide'>
                  {qualityLevels.map(level => (
                    <button
                      key={level.id}
                      onClick={() => handleSetQuality(level.id)}
                      className='flex items-center justify-center w-full h-10 text-sm transition-all cursor-pointer hover:bg-[#505050]'
                      style={{
                        color: currentQuality === level.id ? '#4ade80' : '#eee',
                        fontWeight: currentQuality === level.id ? 700 : 400,
                        background: currentQuality === level.id ? 'rgba(255,255,255,0.05)' : undefined
                      }}
                    >
                      <span>{level.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleSetQuality('auto')}
                    className='flex items-center justify-center w-full h-10 text-sm transition-all cursor-pointer border-t border-white/5 hover:bg-[#505050]'
                    style={{
                      color: currentQuality === 'auto' ? '#4ade80' : '#eee',
                      fontWeight: currentQuality === 'auto' ? 700 : 400,
                      background: currentQuality === 'auto' ? 'rgba(255,255,255,0.05)' : undefined
                    }}
                  >
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            )}
          </>,
          playerEl
        )}

      <style jsx global>{`
        .video-js {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          top: 0;
          left: 0;
        }
        .video-js .vjs-control-bar {
          z-index: 10 !important;
        }
        .video-js.vjs-user-active .vjs-control-bar {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
        .video-js.vjs-user-inactive.vjs-playing .vjs-control-bar {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .video-js .vjs-tech {
          z-index: 0 !important;
          opacity: 0.9999;
        }

        .video-js.vjs-fullscreen .vjs-control-bar {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateZ(10px) !important;
          -webkit-transform: translateZ(10px) !important;
          will-change: transform, opacity;
          z-index: 2147483647 !important;
          background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%) !important;
        }

        .video-js.vjs-fullscreen .vjs-progress-control {
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        }

        .video-js.vjs-fullscreen .vjs-tech {
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          z-index: 1 !important;
        }

        .video-js .vjs-big-play-button {
          z-index: 11 !important;
          transform: translate3d(0, 0, 0);
        }
        .vjs-poster {
          background-size: cover !important;
        }
        .vjs-skip-90s-button {
          cursor: pointer !important;
          flex: none;
          position: relative;
          width: 3em;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vjs-quality-button {
          cursor: pointer !important;
        }
        .vjs-quality-button svg {
          pointer-events: none;
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

        @media (max-width: 768px) and (orientation: portrait) {
          .video-js .vjs-volume-panel,
          .video-js .vjs-picture-in-picture-control,
          .video-js .vjs-playback-rate,
          .video-js .vjs-skip-90s-button {
            display: none !important;
          }
          .video-js .vjs-control {
            width: 3em;
          }
        }

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
