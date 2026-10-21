-- ============================================================
-- Migration: Move existing notes from watched_movies to movie_reviews
-- Date: 2026-10-21
-- Purpose: Migrate data cũ từ watched_movies.note → movie_reviews.review_text
-- Chạy trong Supabase Dashboard → SQL Editor (Idempotent, an toàn)
-- Safe fallback: Không cần unique constraint, dùng manual INSERT approach
-- ============================================================

do $$
declare
  total_notes int := 0;
  inserted_count int := 0;
  updated_count int := 0;
  skipped_count int := 0;
  rec record;
begin
  -- Đếm số notes cần migrate
  select count(*) into total_notes
  from public.watched_movies
  where note is not null
    and note != ''
    and char_length(trim(note)) > 0;

  raise notice '========================================';
  raise notice 'Migration: watched_movies.note → movie_reviews';
  raise notice '  Total notes to migrate: %', total_notes;
  raise notice '========================================';

  if total_notes = 0 then
    raise notice 'No notes to migrate. Exiting.';
    return;
  end if;

  -- Manual INSERT/UPDATE approach (không cần unique constraint)
  for rec in (
    select
      w.user_id,
      coalesce(u.email, 'user@unknown.com') as user_email,
      w.slug,
      w.name,
      coalesce(w.image, '') as image,
      coalesce(w.score, 0) as score,
      w.note as review_text,
      not coalesce(p.is_watched_public, false) as is_private,
      w.id as watched_movie_id,
      w.updated_at
    from public.watched_movies w
    join auth.users u on u.id = w.user_id
    left join public.user_privacy_settings p on p.user_id = w.user_id
    where w.note is not null
      and w.note != ''
      and char_length(trim(w.note)) > 0
  ) loop
    -- Check if review already exists
    if exists (
      select 1 from public.movie_reviews
      where user_id = rec.user_id
        and slug = rec.slug
        and parent_id is null
    ) then
      -- Update only if review doesn't have watched_movie_id yet
      -- (tránh overwrite review độc lập)
      update public.movie_reviews
      set
        review_text = rec.review_text,
        watched_movie_id = rec.watched_movie_id,
        is_private = rec.is_private,
        updated_at = rec.updated_at
      where user_id = rec.user_id
        and slug = rec.slug
        and parent_id is null
        and watched_movie_id is null;

      if found then
        updated_count := updated_count + 1;
      else
        skipped_count := skipped_count + 1;
      end if;
    else
      -- Insert new review
      begin
        insert into public.movie_reviews (
          user_id, user_email, slug, name, image, score,
          review_text, parent_id, is_private, watched_movie_id, updated_at
        ) values (
          rec.user_id, rec.user_email, rec.slug, rec.name, rec.image, rec.score,
          rec.review_text, null, rec.is_private, rec.watched_movie_id, rec.updated_at
        );

        inserted_count := inserted_count + 1;
      exception
        when unique_violation then
          -- Race condition: review vừa được tạo bởi thread khác
          skipped_count := skipped_count + 1;
      end;
    end if;
  end loop;

  raise notice '========================================';
  raise notice 'Migration Summary:';
  raise notice '  Total notes: %', total_notes;
  raise notice '  Inserted: %', inserted_count;
  raise notice '  Updated: %', updated_count;
  raise notice '  Skipped: %', skipped_count;
  raise notice '  Success rate: %/%', inserted_count + updated_count, total_notes;
  raise notice '========================================';
  
  if (inserted_count + updated_count) < total_notes then
    raise notice '';
    raise notice '⚠ Some notes were skipped (already linked to reviews).';
    raise notice '  This is normal if reviews were created manually.';
  end if;
end $$;
