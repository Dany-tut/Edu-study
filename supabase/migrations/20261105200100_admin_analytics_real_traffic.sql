-- Отчёт «Проблемы платформы» считает только живых людей на проде.
--
-- Короткий dwell в отчёте за 05.11 почти целиком был автотестами: #/homework —
-- 14 сессий по ~1,1 с с локального хоста (event_source = automation_suspected,
-- app_host_kind = local), #/landing — так же. Туда же попадали ошибки
-- локального dev-сервера (sw.js 404 на 127.0.0.1) и «зависания» бота с чужого
-- хоста. Индекс проблем рос от собственных проверок.
--
-- Отсекаем: event_source automation_suspected / qa и app_host_kind local /
-- other_host. События без этих полей (старые сборки, до разметки источника)
-- остаются — это реальные пользователи, и выбросить их значило бы потерять
-- историю. Сигнатуры и результат функций не меняются.

create or replace function public.analytics_is_real_traffic(meta jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(meta->>'event_source', '') not in ('automation_suspected', 'qa')
     and coalesce(meta->>'app_host_kind', 'canonical_production') not in ('local', 'other_host')
$$;

create or replace function public.admin_page_stats(p_days integer default 30)
returns table(path text, role text, visits bigint, avg_dwell_sec numeric, errors bigint, rage_clicks bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.path,
      ae.role,
      count(*) filter (where ae.event = 'page_view')            as visits,
      round(avg((ae.meta->>'dwell_ms')::numeric) filter (where ae.event = 'page_leave') / 1000, 1) as avg_dwell_sec,
      count(*) filter (where ae.event in ('js_error','promise_rejection')) as errors,
      count(*) filter (where ae.event = 'rage_click')           as rage_clicks
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and ae.path is not null
      and public.analytics_is_real_traffic(ae.meta)
    group by ae.path, ae.role
    order by errors desc, rage_clicks desc, visits desc;
end; $function$;

create or replace function public.admin_rage_hotspots(p_days integer default 30)
returns table(path text, element text, cnt bigint, last_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.path,
      coalesce(ae.meta->>'text', ae.meta->>'cls', ae.meta->>'tag', '—') as element,
      count(*)::bigint, max(ae.created_at)
    from analytics_events ae
    where ae.event = 'rage_click' and ae.created_at > now() - make_interval(days => p_days)
      and public.analytics_is_real_traffic(ae.meta)
    group by ae.path, element order by 3 desc limit 20;
end; $function$;

create or replace function public.admin_recent_errors(p_limit integer default 50)
returns table(created_at timestamp with time zone, role text, path text, event text, msg text, src text, line integer, session_id text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.created_at,
      ae.role,
      ae.path,
      ae.event,
      (ae.meta->>'msg')::text,
      (ae.meta->>'src')::text,
      (ae.meta->>'line')::int,
      ae.session_id
    from analytics_events ae
    where ae.event in ('js_error','promise_rejection','rage_click')
      and public.analytics_is_real_traffic(ae.meta)
    order by ae.created_at desc
    limit p_limit;
end; $function$;
