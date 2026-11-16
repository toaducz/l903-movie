import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/auth/realtime-token — trả access token hiện tại cho Supabase Realtime (chỉ trang phòng "Xem chung" gọi).
// Đánh đổi đã chấp nhận: token lộ ra JS của trang phòng; RLS + private channel vẫn là chốt chặn.

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Client riêng cho từng request để không lẫn phiên khi refresh
const newClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

/** Đọc `exp` (giây) trong payload JWT — token đã được Supabase xác nhận trước khi gọi */
function jwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value
  const supabase = newClient()
  let current: { token: string; expiresAt: number } | null = null

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    const exp = jwtExp(accessToken)
    if (data?.user && !error && exp && exp * 1000 > Date.now()) current = { token: accessToken, expiresAt: exp }
    // Còn > 60s mới hết hạn thì dùng luôn; sắp hết thì thử refresh bên dưới
    if (current && current.expiresAt * 1000 - Date.now() > 60_000) {
      return NextResponse.json(current, { headers: NO_STORE })
    }
  }

  if (refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    const session = data?.session
    if (session && !error) {
      const res = NextResponse.json(
        { token: session.access_token, expiresAt: session.expires_at ?? jwtExp(session.access_token) },
        { headers: NO_STORE }
      )
      const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' }
      res.cookies.set('sb-access-token', session.access_token, { ...cookie, maxAge: session.expires_in })
      res.cookies.set('sb-refresh-token', session.refresh_token, { ...cookie, maxAge: 60 * 60 * 24 * 7 })
      return res
    }
  }

  // Refresh lỗi nhưng token cũ vẫn còn hạn → trả tạm, client sẽ hỏi lại sau
  if (current) return NextResponse.json(current, { headers: NO_STORE })
  return NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401, headers: NO_STORE })
}
