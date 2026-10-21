-- ============================================================
-- Create unique constraint on movie_reviews
-- Required for proper review upsert logic
-- Run this BEFORE dropping watched_movies.note
-- ============================================================

-- Step 1: Clean up duplicate reviews (keep newest)
do $$
declare
  deleted_count int := 0;
begin
  with duplicates as (
    select
      id,
      row_number() over (
        partition by user_id, slug, coalesce(parent_id::text, 'NULL')
        order by updated_at desc
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

-- Step 2: Create unique constraint
do $$
begin
  -- Note: parent_id included to allow multiple replies per user
  alter table public.movie_reviews
  add constraint movie_reviews_user_slug_parent_unique
  unique (user_id, slug, parent_id);

  raise notice '✓ Created unique constraint: (user_id, slug, parent_id)';
  raise notice '  - Review gốc (parent_id = NULL): 1 per user per movie';
  raise notice '  - Replies (parent_id != NULL): multiple allowed';
exception
  when duplicate_table then
    raise notice '✓ Constraint already exists';
  when others then
    raise exception 'Failed to create constraint: %', sqlerrm;
end $$;

-- Step 3: Create index for performance
create index if not exists idx_movie_reviews_user_slug_parent
  on public.movie_reviews (user_id, slug, parent_id);

do $$
begin
  raise notice '✓ Index created for fast lookups';
end $$;
