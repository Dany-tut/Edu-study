-- 0033_prod_drift_snapshot.sql — ФИКСАЦИЯ ДРЕЙФА СХЕМЫ (2026-07-07).
-- Эти функции жили в проде (project ref igsdwvwiqnozgwczzycx), но их не было ни
-- в одном файле миграций — их применяли напрямую через execute_sql в прошлых
-- сессиях (аналитика-RPC, авто-RLS, storage-статистика, auth-триггер).
-- Снято через pg_get_functiondef, чтобы `supabase/migrations` воспроизводили
-- прод. Идемпотентно (CREATE OR REPLACE) — повторный прогон на проде безопасен.
-- Пронумеровано 0033, но по смыслу это снапшот РАНЕЕ применённого; не полагайтесь
-- на порядок относительно 0011/0014 (аналитика уже была).

-- ── Аналитика: role-фильтрованный heatmap + page/error/rage сводки ────────────
CREATE OR REPLACE FUNCTION public.admin_activity_heatmap_by_role(p_role text, p_days integer DEFAULT 30)
 RETURNS TABLE(dow integer, hour integer, cnt bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select extract(dow  from (created_at at time zone 'Europe/Moscow'))::int,
           extract(hour from (created_at at time zone 'Europe/Moscow'))::int,
           count(*)::bigint
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
      and role = p_role
    group by 1, 2;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_page_stats(p_days integer DEFAULT 30)
 RETURNS TABLE(path text, role text, visits bigint, avg_dwell_sec numeric, errors bigint, rage_clicks bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.path, ae.role,
      count(*) filter (where ae.event = 'page_view')            as visits,
      round(avg((ae.meta->>'dwell_ms')::numeric) filter (where ae.event = 'page_leave') / 1000, 1) as avg_dwell_sec,
      count(*) filter (where ae.event in ('js_error','promise_rejection')) as errors,
      count(*) filter (where ae.event = 'rage_click')           as rage_clicks
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and ae.path is not null
    group by ae.path, ae.role
    order by errors desc, rage_clicks desc, visits desc;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_rage_hotspots(p_days integer DEFAULT 30)
 RETURNS TABLE(path text, element text, cnt bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.path,
      coalesce(ae.meta->>'text', ae.meta->>'cls', ae.meta->>'tag', '—') as element,
      count(*)::bigint
    from analytics_events ae
    where ae.event = 'rage_click'
      and ae.created_at > now() - make_interval(days => p_days)
    group by ae.path, element
    order by 3 desc
    limit 20;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_recent_errors(p_limit integer DEFAULT 50)
 RETURNS TABLE(created_at timestamp with time zone, role text, path text, event text, msg text, src text, line integer, session_id text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.created_at, ae.role, ae.path, ae.event,
      (ae.meta->>'msg')::text, (ae.meta->>'src')::text, (ae.meta->>'line')::int, ae.session_id
    from analytics_events ae
    where ae.event in ('js_error','promise_rejection','rage_click')
    order by ae.created_at desc
    limit p_limit;
end; $function$;

-- ── gen_username + handle_new_user: auth-триггер создаёт profiles на регистрации ─
CREATE OR REPLACE FUNCTION public.gen_username(base text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare slug text; candidate text; n int := 0;
begin
  slug := regexp_replace(lower(coalesce(base, 'user')), '[^a-z0-9]+', '', 'g');
  if slug = '' then slug := 'user'; end if;
  candidate := slug;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    n := n + 1; candidate := slug || n::text;
  end loop;
  return candidate;
end; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  fn text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  ln text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(concat_ws(' ', fn, ln)), ''),
    split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, role, name, first_name, last_name, subject, username)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    full_name, fn, ln,
    nullif(trim(new.raw_user_meta_data->>'subject'), ''),
    public.gen_username(coalesce(nullif(split_part(new.email, '@', 1), ''), full_name)));
  return new;
end; $function$;
-- Триггер on_auth_user_created на auth.users уже существует в проде.

-- ── rls_auto_enable: event trigger авто-включает RLS на новых public-таблицах ──
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'rls_auto_enable: failed on %', cmd.object_identity;
      END;
     END IF;
  END LOOP;
END; $function$;

-- ── storage_stats: сводка занятого места (Админка → StorageUsagePanel) ─────────
CREATE OR REPLACE FUNCTION public.storage_stats()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
declare result jsonb;
begin
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'db_limit_bytes', 524288000,
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_limit_bytes', 1073741824,
    'storage_objects', (select count(*) from storage.objects),
    'attachments_bytes', coalesce((
      select sum(coalesce(octet_length(attachments::text),0) + coalesce(octet_length(review_attachments::text),0))
      from lesson_progress), 0),
    'attachments_rows', (
      select count(*) from lesson_progress
      where attachments is not null or review_attachments is not null),
    'tables', (
      select jsonb_agg(t order by t->>'bytes' desc)
      from (
        select jsonb_build_object('name', relname, 'bytes', pg_total_relation_size(relid), 'rows', n_live_tup) as t
        from pg_stat_user_tables where schemaname = 'public'
        order by pg_total_relation_size(relid) desc limit 12
      ) s)
  ) into result;
  return result;
end; $function$;

-- ПРИМЕЧАНИЕ: миграции 0015/0025 (security hardening, lock_admin event trigger)
-- также применялись через execute_sql и их файлы существуют, но в history-таблице
-- supabase могут отсутствовать. Event trigger lock_admin_function_execute_trg и
-- rls_auto_enable_trg живут в проде.
