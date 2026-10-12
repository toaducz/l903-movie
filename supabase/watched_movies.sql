-- Danh sách "Đã xem": phim người dùng đã xem xong (kể cả xem ở nơi khác) + điểm/ghi chú RIÊNG TƯ.
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor. Chạy lại an toàn (idempotent).

create table if not exists public.watched_movies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug        text not null check (char_length(slug) between 1 and 255),
  source      text not null check (source in ('vsmov', 'kkphim', 'nguonc')),
  name        text not null check (char_length(name) between 1 and 500),
  origin_name text check (char_length(origin_name) <= 500),
  image       text check (char_length(image) <= 2000),
  year        int check (year between 1880 and 2100),
  -- [{ "slug": "hanh-dong", "name": "Hành Động" }, ...] — dùng để lọc theo thể loại / quốc gia
  categories  jsonb not null default '[]'::jsonb check (jsonb_typeof(categories) = 'array'),
  countries   jsonb not null default '[]'::jsonb check (jsonb_typeof(countries) = 'array'),
  score       smallint check (score between 1 and 5), -- null = đã xem nhưng chưa chấm
  note        text check (char_length(note) <= 200),
  watched_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists watched_movies_user_watched_idx on public.watched_movies (user_id, watched_at desc);
create index if not exists watched_movies_user_score_idx on public.watched_movies (user_id, score desc nulls last);
create index if not exists watched_movies_categories_idx on public.watched_movies using gin (categories jsonb_path_ops);
create index if not exists watched_movies_countries_idx on public.watched_movies using gin (countries jsonb_path_ops);

-- Tự cập nhật updated_at
create or replace function public.watched_movies_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists watched_movies_touch_updated_at on public.watched_movies;
create trigger watched_movies_touch_updated_at
  before update on public.watched_movies
  for each row execute function public.watched_movies_touch_updated_at();

-- RLS: mỗi người chỉ đọc / ghi / xoá danh sách của chính mình
alter table public.watched_movies enable row level security;

drop policy if exists "watched_movies_select_own" on public.watched_movies;
create policy "watched_movies_select_own" on public.watched_movies
  for select using (auth.uid() = user_id);

drop policy if exists "watched_movies_insert_own" on public.watched_movies;
create policy "watched_movies_insert_own" on public.watched_movies
  for insert with check (auth.uid() = user_id);

drop policy if exists "watched_movies_update_own" on public.watched_movies;
create policy "watched_movies_update_own" on public.watched_movies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "watched_movies_delete_own" on public.watched_movies;
create policy "watched_movies_delete_own" on public.watched_movies
  for delete using (auth.uid() = user_id);
