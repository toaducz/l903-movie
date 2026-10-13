import type { Metadata } from 'next'
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import './watched.css'
import Navbar from '@/component/layout/navbar'
import QueryProvider from '@/app/provider'
import { Suspense } from 'react'
import NProgressInit from '@/component/layout/NProgressInit'
import { AuthProvider } from './auth-provider'
import Footer from '@/component/layout/footer'
import ChatWidget from '@/component/chat-widget/chat-widget'
import WatchedProvider from '@/component/watched/watched-provider'

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800', '900']
})

// Số / ngày / % (bộ đếm ký tự, % tiến độ, ngày xem…)
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800']
})

export const metadata: Metadata = {
  title: 'L903 Movie',
  description: '',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1
    }
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='vi'>
      <script
        defer
        src='https://umami.l903.site/script.js'
        data-website-id='c09bed4b-cda4-4fd9-8f6a-b739d33502da'
      ></script>
      <body className={`${beVietnamPro.variable} ${jetbrainsMono.variable} antialiased`}>
        <QueryProvider>
          <Suspense>
            <NProgressInit />
          </Suspense>
          <AuthProvider>
            <WatchedProvider>
              <div className='c-app'>
                <Navbar />
                {children}
                <Footer />
              </div>
              <ChatWidget />
            </WatchedProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
