import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|riv|favicon.ico).*)']
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    persistSession: false
  }
})

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isHomePage = req.nextUrl.pathname === '/home'

  let isAuthenticated = false
  let newSession = null

  // Gọi Supabase để verify tính hợp lệ của token thay vì chỉ check cookie tồn tại
  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (data?.user && !error) {
      isAuthenticated = true
    }
  }

  // Nếu access token hết hạn / fake nhưng lại có refresh token -> thử refresh
  if (!isAuthenticated && refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (data?.session && !error) {
      isAuthenticated = true
      newSession = data.session
    }
  }

  let res = NextResponse.next()

  // Trường hợp 1: Chưa đăng nhập hợp lệ (fake token hoặc không có) mà cố vào các trang nội dung
  if (!isAuthenticated && !isLoginPage && !isHomePage) {
    res = NextResponse.redirect(new URL('/home', req.url))
  }
  // Trường hợp 2: Đã đăng nhập mà cố vào lại trang login
  else if (isAuthenticated && isLoginPage) {
    res = NextResponse.redirect(new URL('/', req.url))
  }

  // Ghi lại token mới nếu vừa refresh thành công trong middleware
  if (newSession) {
    res.cookies.set('sb-access-token', newSession.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: newSession.expires_in
    })
    res.cookies.set('sb-refresh-token', newSession.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 ngày
    })
  }

  return res
}
