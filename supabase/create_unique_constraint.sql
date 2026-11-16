-- ============================================================
-- Create unique constraint on movie_reviews (user_id, slug)
-- Required for ON CONFLICT in sync logic
-- Chạy SQL này TRƯỚC KHI deploy code sync
-- ============================================================

-- Step 1: Xoá reviews duplicate (nếu có)
-- Giữ lại review có parent_id = null (review gốc) hoặc review mới nhất
do $$
declare
  deleted_count int := 0;
begin
  with duplicates as (
    select
      id,
      row_number() over (
        partition by user_id, slug, parent_id
        order by
          case when parent_id is null then 0 else 1 end, -- Ưu tiên review gốc
          updated_at desc
      ) as rn
    from public.movie_reviews
  )
  delete from public.movie_reviews
  where id in (
    select id from duplicates where rn > 1
  );

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    raise notice '⚠ Deleted % duplicate reviews', deleted_count;
  else
    raise notice '✓ No duplicate reviews found';
  end if;
end $$;

-- Step 2: Tạo unique constraint
do $$
begin
  -- Check constraint chưa tồn tại
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.movie_reviews'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%user_id%slug%'
  ) then
    -- Tạo unique constraint trên (user_id, slug) cho review gốc và replies
    alter table public.movie_reviews
    add constraint movie_reviews_user_slug_unique
    unique (user_id, slug, parent_id);

    raise notice '✓ Created unique constraint: (user_id, slug, parent_id)';
    raise notice '  Note: NULL parent_id = review gốc (1 per user per movie)';
    raise notice '        NOT NULL parent_id = reply (multiple allowed)';
  else
    raise notice '✓ Unique constraint already exists';
  end if;
exception
  when duplicate_key then
    raise exception 'Cannot create constraint: duplicate rows exist. Run Step 1 first.';
  when others then
    raise exception 'Failed to create constraint: %', sqlerrm;
end $$;

-- Step 3: Tạo index để optimize lookup
create index if not exists idx_movie_reviews_user_slug_parent
  on public.movie_reviews (user_id, slug, parent_id);

raise notice '✓ Index created for fast lookups';
