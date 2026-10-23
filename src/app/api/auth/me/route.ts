import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (data?.user && !error) {
      return NextResponse.json({
        user: {
          id: data.user.id,
          email: data.user.email
        }
      })
    }
  }

  // thử refresh
  if (refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (data?.session && !error) {
      const res = NextResponse.json({
        user: {
          id: data.session.user.id,
          email: data.session.user.email
        }
      })

      res.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: data.session.expires_in
      })

      res.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 ngày
      })

      return res
    }
  }

  return NextResponse.json({ user: null })
}
