-- Migration: Hệ thống Thông báo 2 Tab (Tập mới & Tương tác cộng đồng)
-- Bao gồm: Chống trùng lặp thông báo (Upsert), RLS lọc 30 ngày, và Tự động xóa thông báo hết hạn

-- ============================================================
-- 1. BẢNG COMMUNITY_ACTIVITIES (Hoạt động cộng đồng)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_avatar TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('review', 'watched')),
  slug TEXT NOT NULL,
  movie_name TEXT NOT NULL,
  score NUMERIC(2,1),             -- 1.0 đến 5.0 (nếu có)
  content TEXT,                   -- Đoạn trích nội dung review hoặc note
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho sắp xếp theo thời gian mới nhất
CREATE INDEX IF NOT EXISTS idx_community_activities_created_at 
  ON public.community_activities (created_at DESC);

-- 1.1. DỌN DẸP DỮ LIỆU TRÙNG LẶP CŨ (Chỉ giữ lại bản ghi mới nhất theo created_at)
DELETE FROM public.community_activities
WHERE id NOT IN (
  SELECT DISTINCT ON (actor_id, slug, action_type) id
  FROM public.community_activities
  ORDER BY actor_id, slug, action_type, created_at DESC
);

-- 1.2. UNIQUE CONSTRAINT: Chống trùng lặp! 1 user chỉ có 1 bản ghi duy nhất cho 1 phim + 1 hành động
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_actor_action_slug'
  ) THEN
    ALTER TABLE public.community_activities 
      ADD CONSTRAINT unique_actor_action_slug UNIQUE (actor_id, slug, action_type);
  END IF;
END $$;

-- Bật RLS
ALTER TABLE public.community_activities ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Chỉ đọc thông báo trong 30 ngày gần nhất
DROP POLICY IF EXISTS "Public read community_activities" ON public.community_activities;
CREATE POLICY "Public read community_activities" 
  ON public.community_activities FOR SELECT 
  USING (created_at >= NOW() - INTERVAL '30 days');

-- Policy INSERT: Người dùng đăng nhập được ghi hoạt động của chính mình
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.community_activities;
CREATE POLICY "Users can insert their own activities" 
  ON public.community_activities FOR INSERT 
  WITH CHECK (auth.uid() = actor_id);

-- Policy UPDATE: Hỗ trợ upsert cập nhật điểm/ghi chú
DROP POLICY IF EXISTS "Users can update their own activities" ON public.community_activities;
CREATE POLICY "Users can update their own activities" 
  ON public.community_activities FOR UPDATE 
  USING (auth.uid() = actor_id)
  WITH CHECK (auth.uid() = actor_id);

-- Policy DELETE: Xóa hoạt động khi hủy xem / xóa review
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.community_activities;
CREATE POLICY "Users can delete their own activities" 
  ON public.community_activities FOR DELETE 
  USING (auth.uid() = actor_id);


-- ============================================================
-- 2. CẬP NHẬT BẢNG USER_NOTIFICATIONS (Thông báo cá nhân)
-- ============================================================
ALTER TABLE public.user_notifications 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'episode',
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Bật RLS cho user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Chỉ đọc thông báo của chính mình VÀ trong vòng 30 ngày gần nhất
DROP POLICY IF EXISTS "Users can read own notifications within 30 days" ON public.user_notifications;
CREATE POLICY "Users can read own notifications within 30 days" 
  ON public.user_notifications FOR SELECT 
  USING (
    (auth.uid() = user_id OR auth.uid() IS NULL)
    AND created_at >= NOW() - INTERVAL '30 days'
  );

-- Policy UPDATE: Đánh dấu đã đọc
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" 
  ON public.user_notifications FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy DELETE: Xóa thông báo của chính mình
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" 
  ON public.user_notifications FOR DELETE 
  USING (auth.uid() = user_id);


-- ============================================================
-- 3. HÀM DỌN DẸP VẬT LÝ VÀ TỰ ĐỘNG XÓA TRONG 30 NGÀY
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Xóa các hoạt động cộng đồng quá 30 ngày
  DELETE FROM public.community_activities
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Xóa các thông báo người dùng quá 30 ngày
  DELETE FROM public.user_notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Lên lịch chạy dọn dẹp hàng ngày vào 03:00 sáng (nếu database đã bật extension pg_cron)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Xóa cron cũ nếu có
    PERFORM cron.unschedule('daily-cleanup-expired-notifications') 
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-cleanup-expired-notifications');

    -- Đăng ký cron mới
    PERFORM cron.schedule(
      'daily-cleanup-expired-notifications',
      '0 3 * * *',
      'SELECT public.cleanup_expired_notifications()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Nếu chưa kích hoạt pg_cron thì bỏ qua an toàn
  NULL;
END $$;
