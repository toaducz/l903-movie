-- Kiểm tra constraints hiện tại trên bảng movie_reviews
-- Chạy script này trước khi run migration để biết constraint nào đã tồn tại

-- 1. Liệt kê tất cả constraints
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where rel.relname = 'movie_reviews'
  and nsp.nspname = 'public'
order by con.contype, con.conname;

-- 2. Kiểm tra unique indexes
select
  i.relname as index_name,
  ix.indisunique as is_unique,
  a.attname as column_name
from pg_index ix
join pg_class t on t.oid = ix.indrelid
join pg_class i on i.oid = ix.indexrelid
join pg_attribute a on a.attrelid = t.oid and a.attnum = any(ix.indkey)
join pg_namespace n on n.oid = t.relnamespace
where t.relname = 'movie_reviews'
  and n.nspname = 'public'
order by i.relname, a.attnum;
