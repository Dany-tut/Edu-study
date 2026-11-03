CREATE OR REPLACE FUNCTION public.storage_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  result jsonb;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise insufficient_privilege using message = 'Administrator access required';
  end if;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'db_limit_bytes', 524288000,            -- Supabase Free Postgres: 500 MB
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_limit_bytes', 1073741824,      -- Supabase Free Storage: 1 GB
    'storage_objects', (select count(*) from storage.objects),
    -- Base64 photos + whiteboards live inline in lesson_progress JSONB columns.
    'attachments_bytes', coalesce((
      select sum(coalesce(octet_length(attachments::text),0) + coalesce(octet_length(review_attachments::text),0))
      from public.lesson_progress), 0),
    'attachments_rows', (
      select count(*) from public.lesson_progress
      where attachments is not null or review_attachments is not null),
    'tables', (
      select jsonb_agg(t order by t->>'bytes' desc)
      from (
        select jsonb_build_object(
          'name', relname,
          'bytes', pg_total_relation_size(relid),
          'rows', n_live_tup
        ) as t
        from pg_stat_user_tables
        where schemaname = 'public'
        order by pg_total_relation_size(relid) desc
        limit 12
      ) s)
  ) into result;
  return result;
end;
$function$
;
revoke execute on function public.storage_stats() from public, anon;
grant execute on function public.storage_stats() to authenticated, service_role;
