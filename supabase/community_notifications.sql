-- Migration: Hệ thống Thông báo 2 Tab (Tập mới & Tương tác cộng đồng)

-- 1. Bảng lưu trữ snapshot hoạt động cộng đồng (Fan-out on Read)
CREATE TABLE IF NOT EXISTS community_activities (
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
  ON community_activities (created_at DESC);

-- Bật RLS cho phép đọc công khai
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'community_activities' AND policyname = 'Public read community_activities'
  ) THEN
    CREATE POLICY "Public read community_activities" 
      ON community_activities FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Cho phép authenticated user insert hoạt động của chính mình
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'community_activities' AND policyname = 'Users can insert their own activities'
  ) THEN
    CREATE POLICY "Users can insert their own activities" 
      ON community_activities FOR INSERT 
      WITH CHECK (auth.uid() = actor_id);
  END IF;
END $$;

-- 2. Cập nhật bảng hiện có user_notifications (Hỗ trợ thông báo Reply cá nhân)
ALTER TABLE user_notifications 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'episode',
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT;
