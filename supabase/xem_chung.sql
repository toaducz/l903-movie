-- "Xem chung": phòng xem phim cố định + thành viên + chat có lưu.
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor. Chạy lại an toàn (idempotent).
-- Sau khi chạy: Realtime → Settings → TẮT "Allow public access" (kênh phòng là private, chỉ thành viên vào được).

-- ───────────────────────── Bảng ─────────────────────────

create table if not exists public.watch_rooms (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 40),
  owner_id         uuid references auth.users (id) on delete set null,
  invite_token     text not null unique check (invite_token ~ '^[A-Za-z0-9_-]{16,64}$'),
  -- trạng thái phát gần nhất (snapshot, để "Tiếp tục xem")
  movie            jsonb check (movie is null or jsonb_typeof(movie) = 'object'),
  server_name      text check (char_length(server_name) <= 200),
  episode_slug     text check (char_length(episode_slug) <= 255),
  episode_name     text check (char_length(episode_name) <= 255),
  position_sec     numeric not null default 0 check (position_sec >= 0),
  is_playing       boolean not null default false,
  state_updated_at timestamptz,
  state_updated_by uuid,
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.watch_room_members (
  room_id      uuid not null references public.watch_rooms (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists watch_room_members_user_idx on public.watch_room_members (user_id);

create table if not exists public.watch_room_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.watch_rooms (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('text', 'event')),
  text       text,
  event      jsonb,
  created_at timestamptz not null default now(),
  check (
    (kind = 'text' and event is null and text is not null and char_length(btrim(text)) between 1 and 500)
    or (kind = 'event' and text is null and jsonb_typeof(event) = 'object')
  )
);
create index if not exists watch_room_messages_room_created_idx
  on public.watch_room_messages (room_id, created_at desc);
create index if not exists watch_room_messages_user_idx on public.watch_room_messages (user_id);
create index if not exists watch_rooms_owner_idx on public.watch_rooms (owner_id) where owner_id is not null;

-- ───────────────────────── Hàm phụ trợ ─────────────────────────

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_room_id is not null and exists (
    select 1 from public.watch_room_members where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- 'room:<uuid>' → uuid; sai định dạng → null (không ném lỗi trong policy Realtime)
create or replace function public.room_id_from_topic(p_topic text)
returns uuid
language sql immutable
as $$
  select case
    when p_topic ~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substring(p_topic from 6)::uuid
  end;
$$;

create or replace function public.new_invite_token()
returns text
language sql volatile set search_path = public, extensions
as $$
  select translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/', '-_');
$$;

create or replace function public.clean_display_name(p_name text)
returns text
language sql immutable
as $$
  -- bỏ ký tự điều khiển + ký tự đảo chiều chữ (U+202A–U+202E) trước khi trim
  select left(coalesce(nullif(btrim(regexp_replace(p_name, '[[:cntrl:]\u202a-\u202e]', '', 'g')), ''), 'ẩn danh'), 40);
$$;

-- Tin / sự kiện mới → cập nhật last_activity_at của phòng
create or replace function public.watch_room_messages_touch_room()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.watch_rooms set last_activity_at = now() where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists watch_room_messages_touch_room on public.watch_room_messages;
create trigger watch_room_messages_touch_room
  after insert on public.watch_room_messages
  for each row execute function public.watch_room_messages_touch_room();

-- ───────────────────────── RPC ─────────────────────────

create or replace function public.create_room(p_name text, p_display_name text)
returns table (room_id uuid, token text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_room public.watch_rooms;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if (select count(*) from public.watch_rooms where owner_id = v_uid) >= 20 then
    raise exception 'too_many_rooms' using errcode = '54000';
  end if;

  insert into public.watch_rooms (name, owner_id, invite_token)
  values (v_name, v_uid, public.new_invite_token())
  returning * into v_room;

  insert into public.watch_room_members (room_id, user_id, display_name)
  values (v_room.id, v_uid, public.clean_display_name(p_display_name));

  insert into public.watch_room_messages (room_id, user_id, kind, event)
  values (v_room.id, v_uid, 'event', jsonb_build_object('type', 'create'));

  return query select v_room.id, v_room.invite_token;
end;
$$;

create or replace function public.join_room(p_token text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room_id uuid;
  v_added int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select id into v_room_id from public.watch_rooms where invite_token = p_token;
  if v_room_id is null then raise exception 'invalid_token' using errcode = 'P0002'; end if;

  insert into public.watch_room_members (room_id, user_id, display_name)
  values (v_room_id, v_uid, public.clean_display_name(p_display_name))
  on conflict (room_id, user_id) do nothing;
  get diagnostics v_added = row_count;

  if v_added > 0 then
    insert into public.watch_room_messages (room_id, user_id, kind, event)
    values (v_room_id, v_uid, 'event', jsonb_build_object('type', 'join'));
  end if;

  return v_room_id;
end;
$$;

-- Xem trước lời mời: KHÔNG trả room_id nếu người gọi chưa là thành viên
create or replace function public.room_invite_preview(p_token text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_room public.watch_rooms;
  v_is_member boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select * into v_room from public.watch_rooms where invite_token = p_token;
  if v_room.id is null then return null; end if;

  v_is_member := public.is_room_member(v_room.id);

  return json_build_object(
    'name', v_room.name,
    'inviter', coalesce(
      (select display_name from public.watch_room_members where room_id = v_room.id and user_id = v_room.owner_id),
      (select display_name from public.watch_room_members where room_id = v_room.id order by joined_at limit 1),
      'ai đó'
    ),
    'member_count', (select count(*) from public.watch_room_members where room_id = v_room.id),
    'movie', v_room.movie,
    'episode_name', v_room.episode_name,
    'position_sec', v_room.position_sec,
    'is_member', v_is_member,
    'room_id', case when v_is_member then v_room.id end
  );
end;
$$;

create or replace function public.save_room_state(
  p_room_id uuid,
  p_movie jsonb,
  p_server_name text,
  p_episode_slug text,
  p_episode_name text,
  p_position_sec numeric,
  p_is_playing boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_room_member(p_room_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_movie is not null and (jsonb_typeof(p_movie) <> 'object' or pg_column_size(p_movie) > 4096) then
    raise exception 'invalid_movie' using errcode = '22023';
  end if;
  if p_position_sec = 'NaN'::numeric or p_position_sec > 1000000 then
    raise exception 'invalid_position' using errcode = '22023';
  end if;

  update public.watch_rooms set
    movie            = p_movie,
    server_name      = left(p_server_name, 200),
    episode_slug     = left(p_episode_slug, 255),
    episode_name     = left(p_episode_name, 255),
    position_sec     = greatest(coalesce(p_position_sec, 0), 0),
    is_playing       = coalesce(p_is_playing, false),
    state_updated_at = now(),
    state_updated_by = auth.uid(),
    last_activity_at = now()
  where id = p_room_id;
end;
$$;

create or replace function public.log_room_event(p_room_id uuid, p_type text, p_value text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_room_member(p_room_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_type is null or p_type not in ('pause', 'play', 'seek', 'episode', 'movie') then
    raise exception 'invalid_event' using errcode = '22023';
  end if;
  -- chống spam: cùng người + phòng đã ghi trong 2 giây gần nhất → bỏ qua lặng lẽ
  if exists (
    select 1 from public.watch_room_messages
    where room_id = p_room_id and user_id = auth.uid() and kind = 'event'
      and created_at > now() - interval '2 seconds'
  ) then
    return;
  end if;

  insert into public.watch_room_messages (room_id, user_id, kind, event)
  values (p_room_id, auth.uid(), 'event',
          jsonb_strip_nulls(jsonb_build_object('type', p_type, 'value', left(p_value, 255))));
end;
$$;

revoke all on function public.create_room(text, text) from public, anon;
revoke all on function public.join_room(text, text) from public, anon;
revoke all on function public.room_invite_preview(text) from public, anon;
revoke all on function public.save_room_state(uuid, jsonb, text, text, text, numeric, boolean) from public, anon;
revoke all on function public.log_room_event(uuid, text, text) from public, anon;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.room_invite_preview(text) to authenticated;
grant execute on function public.save_room_state(uuid, jsonb, text, text, text, numeric, boolean) to authenticated;
grant execute on function public.log_room_event(uuid, text, text) to authenticated;

-- Hàm nội bộ: không ai gọi trực tiếp; hàm dùng trong policy chỉ cho authenticated
revoke all on function public.watch_room_messages_touch_room() from public, anon, authenticated;
revoke all on function public.new_invite_token() from public, anon, authenticated;
revoke all on function public.clean_display_name(text) from public, anon, authenticated;
revoke all on function public.is_room_member(uuid) from public, anon;
revoke all on function public.room_id_from_topic(text) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.room_id_from_topic(text) to authenticated;

-- ───────────────────────── RLS ─────────────────────────

alter table public.watch_rooms enable row level security;
alter table public.watch_room_members enable row level security;
alter table public.watch_room_messages enable row level security;

-- Khách (anon) không đụng được gì; authenticated chỉ có đúng quyền cần dùng
-- (phòng / thành viên đổi qua RPC; thành viên chỉ sửa last_read_at; tin chỉ insert các cột text)
revoke all on public.watch_rooms, public.watch_room_members, public.watch_room_messages from anon, authenticated;
grant select on public.watch_rooms, public.watch_room_members to authenticated;
grant update (last_read_at) on public.watch_room_members to authenticated;
grant select on public.watch_room_messages to authenticated;
grant insert (room_id, user_id, kind, text) on public.watch_room_messages to authenticated;

drop policy if exists "watch_rooms_select_member" on public.watch_rooms;
create policy "watch_rooms_select_member" on public.watch_rooms
  for select to authenticated using (public.is_room_member(id));

drop policy if exists "watch_room_members_select_member" on public.watch_room_members;
create policy "watch_room_members_select_member" on public.watch_room_members
  for select to authenticated using (public.is_room_member(room_id));

drop policy if exists "watch_room_members_update_own" on public.watch_room_members;
create policy "watch_room_members_update_own" on public.watch_room_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "watch_room_messages_select_member" on public.watch_room_messages;
create policy "watch_room_messages_select_member" on public.watch_room_messages
  for select to authenticated using (public.is_room_member(room_id));

drop policy if exists "watch_room_messages_insert_text" on public.watch_room_messages;
create policy "watch_room_messages_insert_text" on public.watch_room_messages
  for insert to authenticated
  with check (user_id = auth.uid() and kind = 'text' and public.is_room_member(room_id));

-- ───────────────────────── Realtime ─────────────────────────

-- Tin mới đẩy qua postgres_changes (vẫn áp RLS ở trên)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'watch_room_messages'
  ) then
    alter publication supabase_realtime add table public.watch_room_messages;
  end if;
end;
$$;

-- Kênh private 'room:<id>': chỉ thành viên được nghe / gửi broadcast + presence
drop policy if exists "watch_room_channel_read" on realtime.messages;
create policy "watch_room_channel_read" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_room_member(public.room_id_from_topic(realtime.topic()))
  );

drop policy if exists "watch_room_channel_write" on realtime.messages;
create policy "watch_room_channel_write" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_room_member(public.room_id_from_topic(realtime.topic()))
  );
