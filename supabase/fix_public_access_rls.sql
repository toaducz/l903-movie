-- ============================================================
-- Cập nhật RLS Policy: Cho phép xem Lịch sử & Đã xem xong công khai
-- Chạy trong Supabase Dashboard → SQL Editor (Idempotent, an toàn)
-- ============================================================

-- 1. Bảng watched_movies: Cho phép SELECT nếu là chính chủ HOẶC chủ sở hữu bật is_watched_public
alter table public.watched_movies enable row level security;
drop policy if exists "watched_movies_select_own" on public.watched_movies;
drop policy if exists "watched_movies_select_public" on public.watched_movies;
create policy "watched_movies_select_public" on public.watched_movies
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_privacy_settings
      where user_privacy_settings.user_id = watched_movies.user_id
        and user_privacy_settings.is_watched_public = true
    )
  );

-- 2. Bảng watch_history: Cho phép SELECT nếu là chính chủ HOẶC chủ sở hữu bật is_history_public
alter table public.watch_history enable row level security;
drop policy if exists "watch_history_select_own" on public.watch_history;
drop policy if exists "watch_history_select_public" on public.watch_history;
create policy "watch_history_select_public" on public.watch_history
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_privacy_settings
      where user_privacy_settings.user_id = watch_history.user_id
        and user_privacy_settings.is_history_public = true
    )
  );

-- Cấp quyền SELECT cho cả khách (anon) và người đã đăng nhập (authenticated)
grant select on public.watched_movies to anon, authenticated;
grant select on public.watch_history to anon, authenticated;
