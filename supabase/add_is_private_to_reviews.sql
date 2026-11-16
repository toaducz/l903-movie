-- ============================================================
-- Migration: Add is_private and watched_movie_id to movie_reviews
-- Date: 2026-10-21
-- Purpose: Enable privacy control và sync giữa watched_movies ↔ movie_reviews
-- Chạy trong Supabase Dashboard → SQL Editor (Idempotent, an toàn)
-- ============================================================

-- 1. Thêm cột is_private (default false = công khai)
alter table public.movie_reviews
add column if not exists is_private boolean not null default false;

-- 2. Thêm cột watched_movie_id (FK backward-link đến watched_movies)
alter table public.movie_reviews
add column if not exists watched_movie_id uuid references public.watched_movies(id) on delete set null;

-- 3. Tạo index để lọc review công khai/riêng tư
create index if not exists idx_movie_reviews_is_private 
  on public.movie_reviews (user_id, is_private);

-- 4. Tạo index để join về watched_movies (optimize query performance)
create index if not exists idx_movie_reviews_watched_movie_id 
  on public.movie_reviews (watched_movie_id)
  where watched_movie_id is not null;

-- 5. Comment giải thích cột
comment on column public.movie_reviews.is_private is 
  'Review riêng tư (true) chỉ owner xem được. Review công khai (false) ai cũng thấy nếu is_watched_public=true';

comment on column public.movie_reviews.watched_movie_id is 
  'FK backward link đến watched_movies. Null = review độc lập, not null = review được sync từ note';
