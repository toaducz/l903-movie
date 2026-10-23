import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { getUserId } from '@/lib/auth-helper'

/** GET /api/user/privacy - Lấy cài đặt riêng tư của chính mình */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_privacy_settings')
    .select('is_history_public, is_watched_public')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[api/user/privacy] query warning:', error.message)
    // Fallback mặc định an toàn nếu chưa tạo bảng
    return NextResponse.json({
      data: {
        is_history_public: false,
        is_watched_public: false
      }
    })
  }

  return NextResponse.json({
    data: {
      is_history_public: Boolean(data?.is_history_public),
      is_watched_public: Boolean(data?.is_watched_public)
    }
  })
}

/** PUT /api/user/privacy - Cập nhật cài đặt riêng tư */
export async function PUT(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const isHistoryPublic = Boolean(body.is_history_public)
    const isWatchedPublic = Boolean(body.is_watched_public)

    const { error } = await supabase.from('user_privacy_settings').upsert({
      user_id: userId,
      is_history_public: isHistoryPublic,
      is_watched_public: isWatchedPublic,
      updated_at: new Date().toISOString()
    })

    if (error) {
      console.error('[api/user/privacy] upsert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        is_history_public: isHistoryPublic,
        is_watched_public: isWatchedPublic
      }
    })
  } catch (err) {
    console.error('[api/user/privacy] parse error:', err)
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }
}
