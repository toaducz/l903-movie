-- Cài đặt quyền riêng tư theo tài khoản người dùng trong auth.users
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor. Chạy lại an toàn (idempotent).

create table if not exists public.user_privacy_settings (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  is_history_public  boolean not null default false, -- Mặc định: Riêng tư
  is_watched_public  boolean not null default false, -- Mặc định: Riêng tư
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_user_privacy_settings_updated on public.user_privacy_settings (updated_at desc);

-- Tự cập nhật updated_at
create or replace function public.user_privacy_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_privacy_touch_updated_at on public.user_privacy_settings;
create trigger user_privacy_touch_updated_at
  before update on public.user_privacy_settings
  for each row execute function public.user_privacy_touch_updated_at();

-- RLS: Bất kỳ ai cũng có thể đọc (để hiển thị profile công khai và kiểm tra quyền xem)
-- Chỉ chủ tài khoản mới được ghi / cập nhật cài đặt của chính mình
alter table public.user_privacy_settings enable row level security;

drop policy if exists "user_privacy_select_all" on public.user_privacy_settings;
create policy "user_privacy_select_all" on public.user_privacy_settings
  for select using (true);

drop policy if exists "user_privacy_insert_own" on public.user_privacy_settings;
create policy "user_privacy_insert_own" on public.user_privacy_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_privacy_update_own" on public.user_privacy_settings;
create policy "user_privacy_update_own" on public.user_privacy_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- View cộng đồng thành viên (Hiển thị TẤT CẢ người dùng từ auth.users)
-- ============================================================
create or replace view public.community_users as
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) as display_name,
  split_part(u.email, '@', 1) as handle,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  u.created_at
from auth.users u;

-- Cấp quyền đọc view cho anon (khách) và authenticated (người đã đăng nhập)
grant select on public.community_users to anon, authenticated;

