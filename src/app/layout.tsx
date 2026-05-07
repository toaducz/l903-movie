import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'
import Navbar from '@/component/layout/navbar'
import QueryProvider from '@/app/provider'
import { Suspense } from 'react'
import NProgressInit from '@/component/layout/NProgressInit'
import { AuthProvider } from './auth-provider'
import Footer from '@/component/layout/footer'
import ChatWidget from '@/component/chat-widget/chat-widget'

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800', '900']
})

export const metadata: Metadata = {
  title: 'L903 Movie',
  description: ''
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
      <body className={`${beVietnamPro.variable} antialiased`}>
        <QueryProvider>
          <Suspense>
            <NProgressInit />
          </Suspense>
          <AuthProvider>
            <div className='c-app'>
              <Navbar />
              {children}
              <Footer />
            </div>
            <ChatWidget />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
