-- ============================================================
-- Drop watched_movies.note column
-- Data đã được migrate sang movie_reviews
-- Run this AFTER constraint creation
-- ============================================================

-- Verify data migration first
do $$
declare
  notes_count int;
  reviews_count int;
begin
  -- Count notes in watched_movies
  select count(*) into notes_count
  from public.watched_movies
  where note is not null and note != '';

  -- Count synced reviews in movie_reviews
  select count(*) into reviews_count
  from public.movie_reviews
  where watched_movie_id is not null and parent_id is null;

  raise notice '========================================';
  raise notice 'Pre-drop verification:';
  raise notice '  Notes in watched_movies: %', notes_count;
  raise notice '  Synced reviews: %', reviews_count;
  
  if reviews_count < notes_count then
    raise notice '⚠ WARNING: Some notes may not be migrated!';
    raise notice '  Missing: %', notes_count - reviews_count;
    raise exception 'Aborting drop. Run migrate_notes_to_reviews.sql first.';
  else
    raise notice '✓ All notes migrated successfully';
  end if;
  raise notice '========================================';
end $$;

-- Drop the note column
alter table public.watched_movies
drop column if exists note;

do $$
begin
  raise notice '✓ Dropped column: watched_movies.note';
  raise notice '';
  raise notice '🎉 Migration complete!';
  raise notice '   watched_movies.note → movie_reviews.review_text';
end $$;
