import type { NextConfig } from 'next'

const securityHeaders = [
  //  Ngăn clickjacking (nhúng iframe)
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Giới hạn ai được phép nhúng trang này (CSP)
  // {
  //   key: 'Content-Security-Policy',
  //   value: "frame-ancestors 'self';",
  // },
  // Bật XSS filter cho trình duyệt cũ
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Chỉ cho phép tải tài nguyên an toàn (HTTPS)
  // {
  //   key: 'Content-Security-Policy',
  //   value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  // },
  // Giúp ngăn lộ thông tin server
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  //  HSTS - bắt buộc dùng HTTPS nếu deploy thật
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'phimimg.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'phim.nguonc.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'img.nguonc.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'img.ophim.live',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'ophim1.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'vsmov.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'nguon.vsphim.com',
        pathname: '/**'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)', // áp dụng cho tất cả route
        headers: securityHeaders
      }
    ]
  }
}

export default nextConfig
