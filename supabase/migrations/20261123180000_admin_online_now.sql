-- «Сейчас на сайте» (админка): кто онлайн и когда был — по группам.
-- Только чтение analytics_events; данные не меняются. Доступ — is_admin().
-- «Онлайн» = последний сигнал свежее 3 минут (heartbeat раз в 60 с).
-- Ученик сводится к строке students: события до входа (только user_id)
-- приклеиваются через students.auth_user_id.

create or replace function public.admin_online_people(p_days integer default 7)
returns table(
  actor_kind text, actor_id uuid, name text, group_id uuid, group_name text, subject text,
  last_seen timestamptz, last_path text, session_from timestamptz, viewport_w integer,
  today_min integer, period_min integer, hours integer[], auth_failed_today integer,
  last_login timestamptz, last_login_method text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with auth_map as (
    select distinct on (s.auth_user_id) s.auth_user_id, s.id
    from students s where s.auth_user_id is not null
    order by s.auth_user_id, s.created_at
  ), ev as (
    -- только колонки покрывающего индекса analytics_events_activity_cover_idx:
    -- без path/meta выборка идёт index-only, иначе тянет тяжёлые meta всех api_request
    -- student_id иногда хранит auth-id ученика (вход до выбора строки) — сводим
    -- его к students.id; user_id сводим только для ученических событий, чтобы
    -- учитель с тестовой строкой ученика не превращался в ученика.
    select coalesce(am1.id, ae.student_id, am2.id, ae.user_id) as aid,
           ae.role, ae.session_id, ae.event, ae.created_at
    from analytics_events ae
    left join auth_map am1 on am1.auth_user_id = ae.student_id
    left join auth_map am2 on ae.student_id is null and ae.role = 'student' and am2.auth_user_id = ae.user_id
    where ae.created_at > now() - make_interval(days => greatest(1, least(p_days, 31)))
      and coalesce(ae.student_id, ae.user_id) is not null
      and ae.role in ('student', 'teacher', 'admin')
  ), agg as (
    select ev.aid,
      (array_agg(ev.role order by ev.created_at desc))[1] as role,
      max(ev.created_at) as last_at,
      (array_agg(ev.session_id order by ev.created_at desc))[1] as last_session,
      max(ev.created_at) filter (where ev.event = 'login') as login_at,
      (count(*) filter (where ev.event = 'heartbeat' and ev.created_at >= v_today))::int as today_min,
      (count(*) filter (where ev.event = 'heartbeat'))::int as period_min,
      coalesce(array_agg(distinct extract(hour from ev.created_at at time zone 'Europe/Moscow')::int)
        filter (where ev.event in ('heartbeat', 'page_view') and ev.created_at > now() - interval '24 hours'), '{}') as hours,
      (count(*) filter (where ev.event = 'auth_failed' and ev.created_at >= v_today))::int as auth_failed_today
    from ev group by ev.aid
  ), sess as (
    select ev.aid, min(ev.created_at) as started
    from ev join agg on agg.aid = ev.aid and agg.last_session = ev.session_id
    group by ev.aid
  )
  select
    case when s.id is not null and a.role = 'student' then 'student' when a.role = 'admin' then 'admin' else 'teacher' end,
    a.aid,
    coalesce(s.name, p.name, '—'),
    s.group_id, g.name, s.subject,
    a.last_at, lv.path, se.started,
    case when (lv.meta->>'viewport') ~ '^[0-9]+' then substring(lv.meta->>'viewport' from '^[0-9]+')::int end,
    a.today_min, a.period_min, a.hours, a.auth_failed_today,
    a.login_at, lg.method
  from agg a
  left join sess se on se.aid = a.aid
  left join students s on s.id = a.aid
  left join groups g on g.id = s.group_id
  left join profiles p on p.id = a.aid
  left join lateral (
    select x.path, x.meta from analytics_events x
    where x.created_at = a.last_at and x.session_id = a.last_session
    order by (x.event = 'page_view') desc limit 1
  ) lv on true
  left join lateral (
    select x.meta->>'method' as method from analytics_events x
    where a.login_at is not null and x.created_at = a.login_at and x.event = 'login' limit 1
  ) lg on true
  where s.id is not null or p.id is not null
  order by a.last_at desc;
end $function$;

-- Подробности по одному человеку: сессии (с путями по экранам) и минуты по дням.
create or replace function public.admin_online_timeline(p_actor uuid, p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_auth uuid;
  v_from timestamptz := now() - make_interval(days => greatest(1, least(p_days, 31)));
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.auth_user_id into v_auth from students s where s.id = p_actor;
  with ev as (
    select ae.session_id, ae.event, ae.path, ae.meta, ae.created_at
    from analytics_events ae
    where ae.created_at > v_from
      and (ae.student_id = p_actor or (v_auth is not null and ae.student_id = v_auth)
           or (v_auth is null and ae.user_id = p_actor)
           or (v_auth is not null and ae.student_id is null and ae.role = 'student' and ae.user_id = v_auth))
  ), sessions as (
    select ev.session_id,
      min(ev.created_at) as started, max(ev.created_at) as ended,
      (count(*) filter (where ev.event = 'heartbeat'))::int as minutes,
      (count(*) filter (where ev.event = 'auth_failed'))::int as auth_failed,
      (array_agg(ev.meta->>'method' order by ev.created_at desc) filter (where ev.event = 'login'))[1] as login_method,
      (array_agg(ev.meta->>'provider' order by ev.created_at desc) filter (where ev.event = 'auth_started'))[1] as provider,
      (array_agg(ev.meta->>'viewport' order by ev.created_at desc) filter (where ev.meta ? 'viewport'))[1] as viewport,
      array_agg(ev.path order by ev.created_at) filter (where ev.event = 'page_view') as paths
    from ev group by ev.session_id
  ), days as (
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*) from ev where ev.event = 'heartbeat'
         and (ev.created_at at time zone 'Europe/Moscow')::date = d::date)::int as minutes
    from generate_series((now() at time zone 'Europe/Moscow')::date - 6, (now() at time zone 'Europe/Moscow')::date, interval '1 day') d
  )
  select jsonb_build_object(
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'from', started, 'to', ended, 'minutes', minutes, 'auth_failed', auth_failed,
        'login_method', login_method, 'provider', provider, 'viewport', viewport, 'paths', coalesce(to_jsonb(paths), '[]'::jsonb))
        order by started desc) from (select * from sessions order by started desc limit 60) x), '[]'::jsonb),
    'days', (select jsonb_agg(jsonb_build_object('day', day, 'minutes', minutes) order by day) from days)
  ) into v_result;
  return v_result;
end $function$;

revoke all on function public.admin_online_people(integer) from public, anon;
revoke all on function public.admin_online_timeline(uuid, integer) from public, anon;
grant execute on function public.admin_online_people(integer) to authenticated;
grant execute on function public.admin_online_timeline(uuid, integer) to authenticated;
