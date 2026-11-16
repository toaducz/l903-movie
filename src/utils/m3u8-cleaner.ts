/**
 * Utility bóc tách và lọc quảng cáo chèn từ server (SSAI - Server-Side Ad Insertion)
 * khỏi luồng HLS (.m3u8) trên Client-Side.
 */

// Danh sách các regex nhận diện quảng cáo từ các CDN phim (KKPhim, OPhim, VSMov...)
export const AD_PATTERNS: RegExp[] = [
  /convertv\d*\//i, // e.g. convertv7/oDtbPji8.ts, convertv8/fQhabkhp.ts
  /\/v\d+\//i, // e.g. /v7/d61a.../segment_0001.ts, /v8/...
  /^(segment_\d+|ads?_.*|promo_.*|\d{4,})\.ts$/i, // e.g. segment_0001.ts, 000010.ts
  /\/ads?\//i, // e.g. /ad/, /ads/
  /adserver/i,
  /doubleclick/i,
  /sponsor/i,
  /creative/i,
  /delivery/i
]

/**
 * Kiểm tra xem một URL hoặc tên file segment có phải quảng cáo không
 */
export function isAdSegment(urlOrPath: string, fileName?: string): boolean {
  const name = fileName || urlOrPath.split('/').pop()?.split('?')[0]?.split('#')[0] || ''
  return AD_PATTERNS.some(pattern => pattern.test(urlOrPath) || pattern.test(name))
}

export interface CleanM3U8Result {
  cleanUrls: string[]
  totalOriginal: number
  adsRemovedCount: number
}

interface M3U8Block {
  segments: string[]
  duration: number
}

/**
 * Lọc sạch danh sách segment từ nội dung playlist m3u8
 * Kết hợp Regex Pattern + Phân tích khối kẹp giữa #EXT-X-DISCONTINUITY
 */
export function filterAdSegmentsFromM3U8(text: string, finalUrl: string): CleanM3U8Result {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const blocks: M3U8Block[] = []
  let currentBlock: string[] = []
  let currentDuration = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line === '#EXT-X-DISCONTINUITY') {
      if (currentBlock.length > 0) {
        blocks.push({ segments: currentBlock, duration: currentDuration })
        currentBlock = []
        currentDuration = 0
      }
    } else if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([0-9.]+)/)
      if (match) {
        currentDuration += parseFloat(match[1])
      }
    } else if (!line.startsWith('#')) {
      currentBlock.push(line)
    }
  }

  if (currentBlock.length > 0) {
    blocks.push({ segments: currentBlock, duration: currentDuration })
  }

  // Tìm thư mục / path phổ biến nhất (dominant path) của các segment để nhận diện đoạn chèn ngoại lai
  const pathFrequency: Record<string, number> = {}
  for (const block of blocks) {
    for (const seg of block.segments) {
      const parts = seg.split('/')
      parts.pop()
      const dir = parts.join('/')
      pathFrequency[dir] = (pathFrequency[dir] || 0) + 1
    }
  }

  let dominantDir = ''
  let maxCount = 0
  for (const dir in pathFrequency) {
    if (pathFrequency[dir] > maxCount) {
      maxCount = pathFrequency[dir]
      dominantDir = dir
    }
  }

  const cleanUrls: string[] = []
  let adsRemovedCount = 0
  let totalOriginal = 0

  for (const block of blocks) {
    totalOriginal += block.segments.length

    // Kiểm tra xem block có chứa segment quảng cáo không
    const hasAdPattern = block.segments.some(seg => isAdSegment(seg))

    // Kiểm tra xem block có nằm giữa Discontinuity với thời lượng ngắn (<= 45s) và thư mục khác thư mục chính
    const isForeignShortBlock =
      block.duration <= 45 &&
      block.segments.length > 0 &&
      block.segments.every(seg => {
        const parts = seg.split('/')
        parts.pop()
        return parts.join('/') !== dominantDir
      })

    if (hasAdPattern || isForeignShortBlock) {
      adsRemovedCount += block.segments.length
      continue
    }

    // Với các block phim chính, kiểm tra lại từng segment để đảm bảo không lọt
    for (const seg of block.segments) {
      if (isAdSegment(seg)) {
        adsRemovedCount++
      } else {
        const resolved = new URL(seg, finalUrl).href
        cleanUrls.push(resolved)
      }
    }
  }

  return {
    cleanUrls,
    totalOriginal,
    adsRemovedCount
  }
}

