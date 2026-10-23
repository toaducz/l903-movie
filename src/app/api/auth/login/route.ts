import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return NextResponse.json({ error: error.message, status: false }, { status: 401 })
  }

  if (data.session) {
    const res = NextResponse.json({ message: 'Đăng nhập thành công', status: true })

    // Lưu token vào HTTP-only cookie
    res.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 ngày
    })
    res.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 ngày
    })
    return res
  }

  return NextResponse.json({ error: 'No session' }, { status: 401 })
}
