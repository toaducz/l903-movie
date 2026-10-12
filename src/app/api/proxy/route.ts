import { NextRequest, NextResponse } from 'next/server'
import { kkphim, nguonc, ophim, ophimV1, proxyApiUrl, vsmov } from '@/utils/env'

const getHostName = (urlStr: string): string => {
  try {
    const formattedUrl = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`
    return new URL(formattedUrl).hostname
  } catch {
    return ''
  }
}

// Lấy hostnames động từ file env.ts để tránh hardcode
const ENV_DOMAINS = [
  getHostName(kkphim),
  getHostName(nguonc),
  getHostName(ophim),
  getHostName(ophimV1),
  getHostName(vsmov),
  getHostName(proxyApiUrl)
].filter(Boolean)

// Các regex whitelist cho CDN và phụ đề ngoài
const EXTERNAL_DOMAINS_PATTERNS = [
  /^(.+\.)?opstream\.me$/,
  /^(.+\.)?akamaized\.net$/,
  /^(.+\.)?opensubtitles\.org$/,
  /^(.+\.)?opensubtitles\.com$/,
  /^(.+\.)?oscdn\.net$/,
  /^(.+\.)?strem\.io$/
]

function isAllowedDomain(hostname: string): boolean {
  const isEnvMatch = ENV_DOMAINS.some(envHost => {
    return hostname === envHost || hostname.endsWith('.' + envHost)
  })
  if (isEnvMatch) return true

  return EXTERNAL_DOMAINS_PATTERNS.some(pattern => pattern.test(hostname))
}

export async function GET(req: NextRequest) {
  const targetUrlParam = req.nextUrl.searchParams.get('url')

  if (!targetUrlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(targetUrlParam)
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  if (!isAllowedDomain(targetUrl.hostname)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }

  const forwardedHeaders = new Headers()
  const allowedHeaders = [
    'user-agent',
    'accept',
    'accept-language',
    'referer',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site'
  ]

  if (targetUrl.hostname === 'l903-movie-proxy.toanduz.workers.dev') {
    allowedHeaders.push('cookie')
  }

  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      forwardedHeaders.set(key, value)
    }
  })

  if (!forwardedHeaders.has('user-agent')) {
    forwardedHeaders.set(
      'user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    )
  }
  if (!forwardedHeaders.has('accept')) {
    forwardedHeaders.set('accept', 'application/json, text/plain, */*')
  }

  try {
    const res = await fetch(targetUrl.toString(), { 
      method: 'GET',
      headers: forwardedHeaders 
    })
    
    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }
    const isSafeType = 
      contentType.includes('text/plain') || 
      contentType.includes('text/vtt') || 
      contentType.includes('text/srt') || 
      contentType.includes('application/x-subrip') || 
      contentType.includes('application/x-mpegurl') || 
      contentType.includes('video/mp2t')

    const safeContentType = isSafeType ? contentType : 'application/octet-stream'

    return new NextResponse(res.body, {
      status: res.status,
      headers: { 
        'Content-Type': safeContentType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    console.error('Proxy Fetch Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from target URL' }, 
      { status: 500 }
    )
  }
}