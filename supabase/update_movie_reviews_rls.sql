-- ============================================================
-- Migration: Add RLS policies to movie_reviews (Privacy Control)
-- Date: 2026-10-21
-- Purpose: Bảo vệ review riêng tư, chỉ owner + review công khai mới thấy được
-- Chạy trong Supabase Dashboard → SQL Editor (Idempotent, an toàn)
-- ============================================================

-- Drop policies cũ nếu tồn tại (idempotent)
drop policy if exists "movie_reviews_select_public" on public.movie_reviews;
drop policy if exists "movie_reviews_insert_own" on public.movie_reviews;
drop policy if exists "movie_reviews_update_own" on public.movie_reviews;
drop policy if exists "movie_reviews_delete_own" on public.movie_reviews;

-- Enable RLS (nếu chưa enable)
alter table public.movie_reviews enable row level security;

-- ============================================================
-- Policy 1: SELECT
-- Ai được xem review?
-- 1. Owner của review (luôn luôn xem được cả private/public)
-- 2. Non-owner chỉ xem nếu:
--    - Review công khai (is_private = false)
--    - AND owner cho phép xem danh sách watched (is_watched_public = true)
-- ============================================================
create policy "movie_reviews_select_public" on public.movie_reviews
  for select using (
    -- Trường hợp 1: Owner của review
    auth.uid() = user_id
    -- Trường hợp 2: Review công khai + owner cho phép xem danh sách watched
    or (
      is_private = false
      and exists (
        select 1 from public.user_privacy_settings
        where user_privacy_settings.user_id = movie_reviews.user_id
          and user_privacy_settings.is_watched_public = true
      )
    )
  );

-- ============================================================
-- Policy 2: INSERT
-- Chỉ authenticated users mới được tạo review
-- ============================================================
create policy "movie_reviews_insert_own" on public.movie_reviews
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- Policy 3: UPDATE
-- Chỉ owner của review mới được cập nhật
-- ============================================================
create policy "movie_reviews_update_own" on public.movie_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Policy 4: DELETE
-- Chỉ owner của review mới được xoá
-- ============================================================
create policy "movie_reviews_delete_own" on public.movie_reviews
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Grant permissions cho anon + authenticated
-- ============================================================
grant select on public.movie_reviews to anon, authenticated;
grant insert, update, delete on public.movie_reviews to authenticated;
