import { NextRequest, NextResponse } from 'next/server'

interface ExtractResponse {
  success: boolean
  m3u8Url?: string
  error?: string
}

const MEDIA_URL_REGEX = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:[^\s"'<>]*)/gi
const FILE_PROP_REGEX = /(?:file|source|src)\s*:\s*["'](https?:\/\/[^"']+)["']/gi
const BASE64_CANDIDATE_REGEX = /[A-Za-z0-9+/=]{24,}/g

function tryDecodeBase64(str: string): string | null {
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8')
    if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
      const match = decoded.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:[^\s"'<>]*)/i)
      return match ? match[0] : null
    }
  } catch {
    // Không phải chuỗi base64 hợp lệ
  }
  return null
}

export async function GET(req: NextRequest): Promise<NextResponse<ExtractResponse>> {
  const targetUrl = req.nextUrl.searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ success: false, error: 'Thiếu tham số url' }, { status: 400 })
  }

  // 1. Nếu URL ban đầu đã là link m3u8/mp4 trực tiếp
  if (targetUrl.includes('.m3u8') || targetUrl.includes('.mp4')) {
    return NextResponse.json({ success: true, m3u8Url: targetUrl })
  }

  try {
    // 2. Fetch trang embed player với timeout 6s
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        Referer: targetUrl,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể kết nối đến player của nhà đài (HTTP ${res.status})` },
        { status: 200 }
      )
    }

    const html = await res.text()

    // 3. Quét regex tìm link m3u8 / mp4 trực tiếp trong HTML hoặc script
    const directMatches = html.match(MEDIA_URL_REGEX)
    if (directMatches && directMatches.length > 0) {
      // Ưu tiên m3u8 nếu có
      const m3u8 = directMatches.find(u => u.includes('.m3u8')) || directMatches[0]
      return NextResponse.json({ success: true, m3u8Url: m3u8 })
    }

    // 4. Quét qua thuộc tính player file: '...'
    const fileMatches = Array.from(html.matchAll(FILE_PROP_REGEX))
    for (const match of fileMatches) {
      const candidate = match[1]
      if (candidate.includes('.m3u8') || candidate.includes('.mp4')) {
        return NextResponse.json({ success: true, m3u8Url: candidate })
      }
    }

    // 5. Thử quét các chuỗi Base64 tiềm năng
    const b64Matches = html.match(BASE64_CANDIDATE_REGEX) || []
    for (const b64 of b64Matches.slice(0, 30)) {
      const decodedUrl = tryDecodeBase64(b64)
      if (decodedUrl) {
        return NextResponse.json({ success: true, m3u8Url: decodedUrl })
      }
    }

    // Không tìm thấy sau khi quét
    return NextResponse.json(
      {
        success: false,
        error:
          'Không thể trích xuất luồng video từ player của nguồn này (nhà đài có thể đã mã hóa hoặc dùng bảo mật Turnstile). Vui lòng chuyển sang nguồn KKPhim để tải trực tiếp!'
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const isAbort = (error as { name?: string })?.name === 'AbortError'
    return NextResponse.json(
      {
        success: false,
        error: isAbort
          ? 'Quá thời gian kết nối đến player của nguồn này.'
          : 'Lỗi trong quá trình phân tích player nguồn.'
      },
      { status: 200 }
    )
  }
}

