'use client'

import React, { useState, useEffect, useRef } from 'react'
import { filterAdSegmentsFromM3U8 } from '@/utils/m3u8-cleaner'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  m3u8Url: string
  fileName: string
}

type DownloadStatus = 'confirm' | 'fetching_playlist' | 'downloading' | 'saving' | 'completed' | 'error'

const KEYWORDS = ['toiyeuanime', 'toilagay']

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, m3u8Url, fileName }) => {
  const [status, setStatus] = useState<DownloadStatus>('confirm')
  const [progress, setProgress] = useState(0)
  const [downloadedSegments, setDownloadedSegments] = useState(0)
  const [totalSegments, setTotalSegments] = useState(0)
  const [adsRemoved, setAdsRemoved] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const [expectedKeyword, setExpectedKeyword] = useState('')
  const [inputValue, setInputValue] = useState('')

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const keywordHashRef = useRef<string>('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('confirm')
      setProgress(0)
      setDownloadedSegments(0)
      setTotalSegments(0)
      setAdsRemoved(0)
      setErrorMessage('')
      setInputValue('')

      // Chọn ngẫu nhiên từ khóa và mã hóa hash để bảo mật chống bypass qua DevTools
      const selectedWord = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)]
      setExpectedKeyword(selectedWord)
      keywordHashRef.current = btoa(selectedWord)
    }
    return () => {
      // Clean up abort controller on unmount or close
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Helper to fetch text with proxy fallback
  const fetchText = async (url: string, signal: AbortSignal): Promise<{ text: string; finalUrl: string }> => {
    try {
      const res = await fetch(url, { signal })
      if (res.ok) {
        const text = await res.text()
        return { text, finalUrl: url }
      }
      throw new Error(`Direct fetch failed: ${res.status}`)
    } catch {
      // Fallback to proxy
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, { signal })
      if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`)
      const text = await res.text()
      return { text, finalUrl: url }
    }
  }

  // Logic to parse m3u8 and remove SSAI advertisements
  const parseM3U8 = async (
    url: string,
    signal: AbortSignal
  ): Promise<{ segmentUrls: string[]; adsRemovedCount: number }> => {
    const { text, finalUrl } = await fetchText(url, signal)
    const lines = text.split('\n').map(line => line.trim())

    // 1. Kiểm tra nếu là Master Playlist (chứa các variant stream)
    if (text.includes('#EXT-X-STREAM-INF')) {
      let bestVariantUrl = ''
      let maxBandwidth = 0

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
          const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/)
          const currentBandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0

          // Dòng tiếp theo chứa URL
          const nextLine = lines[i + 1]
          if (nextLine && !nextLine.startsWith('#') && currentBandwidth > maxBandwidth) {
            maxBandwidth = currentBandwidth
            bestVariantUrl = nextLine
          }
        }
      }

      if (bestVariantUrl) {
        const resolvedVariantUrl = new URL(bestVariantUrl, finalUrl).href
        return parseM3U8(resolvedVariantUrl, signal) // Đệ quy để tải Playlist con
      }
    }

    // 2. Nếu là Media Playlist (chứa trực tiếp các segment .ts)
    // Tách lọc bỏ hoàn toàn các segment quảng cáo SSAI từ server
    const { cleanUrls, adsRemovedCount } = filterAdSegmentsFromM3U8(text, finalUrl)

    if (cleanUrls.length === 0) {
      throw new Error('Không tìm thấy đoạn video (.ts) hợp lệ nào trong file m3u8.')
    }

    return { segmentUrls: cleanUrls, adsRemovedCount }
  }

  // Bắt đầu tải video
  const startDownload = async () => {
    // Kiểm tra chéo từ khóa trực tiếp từ DOM Input Ref để chống hack/bypass bằng cách thay đổi React State
    const currentVal = inputRef.current?.value || ''
    if (btoa(currentVal) !== keywordHashRef.current) {
      alert('Không thể bypass đâu bạn ơi! Hãy gõ đúng từ khóa nhé 😉')
      return
    }

    setStatus('fetching_playlist')
    setProgress(0)
    setDownloadedSegments(0)
    setAdsRemoved(0)

    const controller = new AbortController()
    abortControllerRef.current = controller
    const signal = controller.signal

    try {
      // Bước 1: Phân tích m3u8 lấy danh sách segment đã làm sạch quảng cáo
      const { segmentUrls, adsRemovedCount } = await parseM3U8(m3u8Url, signal)
      setAdsRemoved(adsRemovedCount)
      const total = segmentUrls.length
      setTotalSegments(total)
      setStatus('downloading')

      // Bước 2: Tải song song các segment (Worker Pool)
      const CONCURRENCY = 8
      const buffers = new Array<ArrayBuffer | null>(total).fill(null)
      let nextIdx = 0
      let loadedCount = 0

      const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
        while (nextIdx < total) {
          if (signal.aborted) return

          // Kiểm tra chéo liên tục trong lúc tải từng segment để chặn đứng mọi hành vi hack/bypass bằng DevTools giữa chừng
          const checkVal = inputRef.current?.value || ''
          if (btoa(checkVal) !== keywordHashRef.current) {
            throw new Error('Xác thực thất bại: Từ khóa bảo mật đã bị thay đổi hoặc không hợp lệ.')
          }

          const currentIdx = nextIdx++
          const url = segmentUrls[currentIdx]

          let buffer: ArrayBuffer | null = null
          let attempt = 0
          const maxAttempts = 3

          while (attempt < maxAttempts && !buffer) {
            if (signal.aborted) return
            try {
              // Thử tải trực tiếp
              const res = await fetch(url, { signal })
              if (res.ok) {
                buffer = await res.arrayBuffer()
              } else {
                throw new Error(`Direct segment fetch code: ${res.status}`)
              }
            } catch {
              // Thử qua proxy nếu tải trực tiếp lỗi (e.g. CORS)
              try {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
                const res = await fetch(proxyUrl, { signal })
                if (res.ok) {
                  buffer = await res.arrayBuffer()
                }
              } catch {
                attempt++
                if (attempt >= maxAttempts) {
                  throw new Error(`Không thể tải đoạn phim số ${currentIdx + 1}. Vui lòng thử lại.`)
                }
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }
          }

          if (buffer) {
            buffers[currentIdx] = buffer
            loadedCount++
            setDownloadedSegments(loadedCount)
            setProgress(Math.round((loadedCount / total) * 100))
          }
        }
      })

      await Promise.all(workers)

      if (signal.aborted) return

      // Bước 3: Ghép dữ liệu và lưu file
      setStatus('saving')
      const validBuffers = buffers.filter((b): b is ArrayBuffer => b !== null)
      if (validBuffers.length === 0) {
        throw new Error('Dữ liệu tải xuống bị trống.')
      }

      const fileBlob = new Blob(validBuffers, { type: 'video/mp4' })
      const downloadUrl = URL.createObjectURL(fileBlob)

      const downloadAnchor = document.createElement('a')
      downloadAnchor.href = downloadUrl
      downloadAnchor.download = fileName
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()

      // Cleanup
      document.body.removeChild(downloadAnchor)
      URL.revokeObjectURL(downloadUrl)

      setStatus('completed')

      // Tự động đóng modal sau 2s khi hoàn thành
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error: unknown) {
      if ((error as { name: string }).name === 'AbortError' || signal.aborted) {
        console.log('Download aborted.')
        return
      }
      console.error('Download error:', error)
      setErrorMessage((error as { message: string }).message || 'Lỗi không xác định xảy ra trong quá trình tải.')
      setStatus('error')
    }
  }

  // Huỷ tải xuống
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    onClose()
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm'>
      {/* Modal Card */}
      <div
        className='relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--c-line)] bg-[#1a1326] p-6 text-white shadow-2xl transition-all duration-300'
        style={{ boxShadow: '0 0 30px rgba(236,72,153,0.15)' }}
      >
        {/* Glow Ambient */}
        <div className='absolute -top-12 -right-12 w-24 h-24 bg-[var(--c-pink)]/10 rounded-full blur-2xl pointer-events-none' />
        <div className='absolute -bottom-12 -left-12 w-24 h-24 bg-[var(--c-cyan)]/10 rounded-full blur-2xl pointer-events-none' />

        {status === 'confirm' && (
          <div className='space-y-5'>
            <div className='flex items-center gap-3 border-b border-[var(--c-line)] pb-3'>
              <span className='c-marker pink' />
              <h3 className='text-lg font-black tracking-tight text-white uppercase'>Xác nhận tải phim</h3>
            </div>

            <div className='space-y-2 text-sm text-white/80'>
              <p>Bạn đang yêu cầu tải tập phim sau:</p>
              <div className='p-3.5 bg-white/5 rounded-xl border border-white/5 font-semibold text-[var(--c-cyan)] break-all'>
                {fileName}
              </div>
            </div>

            {/* Hộp nhập từ khóa xác thực chống bypass */}
            <div className='space-y-2.5 p-4 rounded-2xl bg-white/3 border border-white/5'>
              <p className='text-xs text-white/70'>
                Nhập từ khóa{' '}
                <span className='font-black text-[var(--c-pink)] select-all px-1.5 py-0.5 rounded bg-[var(--c-pink)]/10'>
                  {expectedKeyword}
                </span>{' '}
                để xác nhận mở khóa tải xuống:
              </p>
              <input
                ref={inputRef}
                type='text'
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder='Nhập chính xác từ khóa vào đây...'
                className='w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-center text-sm font-semibold tracking-wider text-[var(--c-cyan)] focus:outline-none focus:border-[var(--c-pink)] transition-all'
              />
            </div>

            {/* Thông báo tính năng lọc quảng cáo */}
            {/* <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed'>
              <span className='text-base select-none'>🛡️</span>
              <div>
                <p className='font-bold uppercase tracking-wider text-[10px] mb-0.5'>hẹ hẹ</p>
                <p className='opacity-90'>Hệ thống tự động phát hiện và loại bỏ phân đoạn quảng cáo SSAI để phim không bị đứng hình.</p>
              </div>
            </div> */}

            <div className='flex gap-3 pt-2'>
              <button
                onClick={onClose}
                className='flex-1 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer'
              >
                HỦY BỎ
              </button>
              <button
                onClick={startDownload}
                disabled={inputValue !== expectedKeyword}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition shadow-[0_0_15px_rgba(236,72,153,0.4)]
                  ${inputValue === expectedKeyword
                    ? 'text-[var(--c-bg)] bg-[var(--c-pink)] hover:opacity-90 cursor-pointer'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed shadow-none'
                  }`}
              >
                TẢI XUỐNG
              </button>
            </div>
          </div>
        )}

        {(status === 'fetching_playlist' || status === 'downloading' || status === 'saving') && (
          <div className='space-y-6 py-2'>
            {/* Input ẩn để giữ nguyên DOM Ref check liên tục cho background workers */}
            <input ref={inputRef} type='hidden' value={inputValue} />

            <div className='text-center space-y-1.5'>
              <h3 className='text-base font-bold tracking-tight text-white'>
                {status === 'fetching_playlist' && 'Đang phân tích danh sách phát...'}
                {status === 'downloading' && `Đang tải: ${progress}%`}
                {status === 'saving' && 'Đang hợp nhất video...'}
              </h3>
              <p className='text-xs text-white/40'>
                {status === 'fetching_playlist' && 'Đang kết nối đến CDN để lấy dữ liệu phân đoạn...'}
                {status === 'downloading' && `Đã tải ${downloadedSegments} / ${totalSegments} phần video (.ts)`}
                {status === 'saving' && 'Vui lòng chờ trong giây lát để xuất file MP4...'}
              </p>
              {adsRemoved > 0 && (
                <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-medium'>
                  <span>🛡️</span>
                  <span>Đã loại bỏ {adsRemoved} đoạn quảng cáo nhà đài</span>
                </div>
              )}
            </div>

            {/* Progress Bar Container */}
            <div className='w-full bg-white/5 rounded-full h-3.5 border border-white/5 overflow-hidden p-[2px]'>
              <div
                className='bg-gradient-to-r from-[var(--c-pink)] to-[var(--c-cyan)] h-full rounded-full transition-all duration-300 relative'
                style={{ width: `${progress}%` }}
              >
                {/* Glow bar */}
                <div className='absolute inset-0 bg-white/20 animate-pulse' />
              </div>
            </div>

            {/* Cancel Button */}
            <div className='flex justify-center pt-2'>
              <button
                onClick={handleAbort}
                className='px-6 py-2 text-xs font-bold rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer'
              >
                HỦY TẢI
              </button>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className='text-center space-y-4 py-4'>
            <div className='w-14 h-14 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(34,197,94,0.3)]'>
              ✓
            </div>
            <div className='space-y-1'>
              <h3 className='text-base font-bold text-white'>Tải xuống hoàn tất!</h3>
              <p className='text-xs text-white/50'>File video đã được lưu về máy của bạn thành công.</p>
              {adsRemoved > 0 && (
                <p className='text-xs text-emerald-400 font-semibold pt-1'>
                  🛡️ Phim đã được làm sạch ({adsRemoved} quảng cáo bị loại bỏ).
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className='space-y-5 py-2'>
            <div className='text-center space-y-4'>
              <div className='w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(239,68,68,0.3)]'>
                !
              </div>
              <div className='space-y-1.5'>
                <h3 className='text-base font-bold text-white'>Tải xuống thất bại</h3>
                <p className='text-xs text-red-400/90 leading-relaxed bg-red-500/5 p-3 rounded-xl border border-red-500/10 break-all'>
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className='flex gap-3 pt-2'>
              <button
                onClick={onClose}
                className='flex-1 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer'
              >
                ĐÓNG
              </button>
              <button
                onClick={startDownload}
                className='flex-1 py-2.5 text-xs font-black rounded-xl text-[var(--c-bg)] bg-[var(--c-pink)] hover:opacity-90 transition cursor-pointer'
              >
                THỬ LẠI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
