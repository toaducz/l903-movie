import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase client cho TRÌNH DUYỆT — chỉ dùng Realtime trong trang phòng "Xem chung".
// Không giữ phiên (auth bằng cookie httpOnly); access token gắn tay qua realtime.setAuth.

let client: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return client
}
