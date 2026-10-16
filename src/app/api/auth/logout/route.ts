import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value

  // Nếu có access token, gọi Supabase Auth để vô hiệu hóa phiên trên server (revoke session)
  if (accessToken) {
    try {
      const supabaseUserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${accessToken}` } }
        }
      )
      await supabaseUserClient.auth.signOut()
    } catch (err) {
      console.error('[api/auth/logout] Lỗi khi vô hiệu hóa phiên trên Supabase:', err)
    }
  }

  const res = NextResponse.json({ message: 'Logged out' })

  res.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
  res.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })
  return res
}
