import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabase } from '@/lib/supabase-user-client'

const unauthorized = () => NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 })
const serverError = (context: string, error: unknown) => {
  console.error(`[api/privacy] ${context}:`, error)
  return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau' }, { status: 500 })
}

/**
 * POST /api/privacy
 * Body: { is_watched_public: boolean, is_history_public?: boolean }
 * 
 * Cập nhật privacy setting và batch update is_private flag trên tất cả review gốc
 */
export async function POST(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const body: unknown = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 })
  }

  const { is_watched_public, is_history_public } = body as {
    is_watched_public?: boolean
    is_history_public?: boolean
  }

  // Validate: ít nhất 1 trường phải có
  if (is_watched_public === undefined && is_history_public === undefined) {
    return NextResponse.json({ error: 'Thiếu is_watched_public hoặc is_history_public' }, { status: 400 })
  }

  // Validate type
  if (is_watched_public !== undefined && typeof is_watched_public !== 'boolean') {
    return NextResponse.json({ error: 'is_watched_public phải là boolean' }, { status: 400 })
  }
  if (is_history_public !== undefined && typeof is_history_public !== 'boolean') {
    return NextResponse.json({ error: 'is_history_public phải là boolean' }, { status: 400 })
  }

  // 1. Cập nhật privacy setting (upsert partial fields)
  const updatePayload: Record<string, unknown> = { user_id: auth.userId }
  if (is_watched_public !== undefined) updatePayload.is_watched_public = is_watched_public
  if (is_history_public !== undefined) updatePayload.is_history_public = is_history_public

  const { error: privacyErr } = await auth.client
    .from('user_privacy_settings')
    .upsert(updatePayload, { onConflict: 'user_id' })

  if (privacyErr) return serverError('update privacy setting', privacyErr)

  // 2. Batch update is_private flag trên tất cả review gốc (chỉ khi is_watched_public thay đổi)
  if (is_watched_public !== undefined) {
    try {
      // is_private = true nếu is_watched_public = false (riêng tư)
      // is_private = false nếu is_watched_public = true (công khai)
      const newPrivateFlag = !is_watched_public

      const { error: reviewErr } = await auth.client
        .from('movie_reviews')
        .update({ is_private: newPrivateFlag, updated_at: new Date().toISOString() })
        .eq('user_id', auth.userId)
        .is('parent_id', null) // Chỉ update review gốc, không động replies
        .not('watched_movie_id', 'is', null) // Chỉ update review được sync từ watched_movies

      if (reviewErr) {
        console.warn('[api/privacy] Batch update review thất bại (non-critical):', reviewErr)
        // Không block response, chỉ log warning
      }
    } catch (batchErr) {
      console.error('[api/privacy] Batch update error:', batchErr)
      // Không block response
    }
  }

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/privacy
 * Lấy privacy settings của user hiện tại
 */
export async function GET(req: NextRequest) {
  const auth = await getUserSupabase(req)
  if (!auth) return unauthorized()

  const { data, error } = await auth.client
    .from('user_privacy_settings')
    .select('is_watched_public, is_history_public')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) return serverError('get privacy setting', error)

  // Default values nếu chưa có setting
  return NextResponse.json({
    is_watched_public: data?.is_watched_public ?? false,
    is_history_public: data?.is_history_public ?? false
  })
}
