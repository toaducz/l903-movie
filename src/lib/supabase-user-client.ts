import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type UserSupabase = {
  client: SupabaseClient
  userId: string
  email?: string
  name?: string
  avatarUrl?: string | null
}

// Tạo Supabase client RIÊNG cho từng request, mang access token của chính người dùng.
// Khác với `supabaseClient` dùng chung + setSession (có thể lẫn phiên giữa các request đồng thời),
// client này đảm bảo RLS luôn chạy dưới đúng auth.uid() của người gọi.
export async function getUserSupabase(req: NextRequest): Promise<UserSupabase | null> {
  const accessToken = req.cookies.get('sb-access-token')?.value
  if (!accessToken) return null

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })

  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) return null

  const email = data.user.email
  const meta = data.user.user_metadata || {}
  const name = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Thành viên')
  const avatarUrl = meta.avatar_url || null

  return { client, userId: data.user.id, email, name, avatarUrl }
}
