-- «Сейчас на сайте»: карточка человека не грузилась (statement timeout),
-- а «онлайн» показывал «143 ч».
--
-- • admin_online_timeline искал события условием «student_id = X ИЛИ user_id = X»
--   — индекс не применялся, и за неделю перебирался весь журнал вместе со
--   служебной телеметрией запросов (тяжёлые meta). Теперь — отдельные ветки
--   по индексам (user_id, created_at) и student_id, без api_request/api_slow/db_error.
-- • Визит = непрерывная активность без перерыва больше 10 минут. Вкладка держит
--   один session_id сутками, поэтому граница визита по session_id давала
--   «онлайн 143 ч» и один «визит» на неделю.
-- • admin_online_people читает только события людей (частичный индекс
--   analytics_events_human_cover_idx), session_from — начало текущего визита.
-- • meta (тяжёлый jsonb) распаковывается только у входа и открытия страницы.
-- Только чтение, сигнатуры и формат результата прежние. Данные не меняются.

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
set work_mem to '64MB'
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
  ), ev as materialized (
    -- student_id иногда хранит auth-id ученика — сводим к students.id;
    -- user_id сводим только для ученических событий.
    select coalesce(am1.id, ae.student_id, am2.id, ae.user_id) as aid,
           ae.role, ae.session_id, ae.event, ae.created_at
    from analytics_events ae
    left join auth_map am1 on am1.auth_user_id = ae.student_id
    left join auth_map am2 on ae.student_id is null and ae.role = 'student' and am2.auth_user_id = ae.user_id
    where ae.created_at > now() - make_interval(days => greatest(1, least(p_days, 31)))
      and ae.event not in ('api_request', 'api_slow', 'db_error')
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
    -- начало текущего визита: последнее событие после перерыва > 10 мин (окно — сутки)
    select x.aid, max(x.created_at) filter (where x.brk) as started
    from (
      select ev.aid, ev.created_at,
        coalesce(ev.created_at - lag(ev.created_at) over (partition by ev.aid order by ev.created_at) > interval '10 minutes', true) as brk
      from ev join agg on agg.aid = ev.aid and ev.created_at > agg.last_at - interval '24 hours'
    ) x
    group by x.aid
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

create or replace function public.admin_online_timeline(p_actor uuid, p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
set work_mem to '64MB'
as $function$
declare
  v_auth uuid;
  v_from timestamptz := now() - make_interval(days => greatest(1, least(p_days, 31)));
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.auth_user_id into v_auth from students s where s.id = p_actor;
  with raw as materialized (
    -- учитель/админ: по индексу (user_id, created_at)
    select ae.session_id, ae.event, ae.path,
           case when ae.event in ('login', 'auth_started', 'page_view', 'session_start') then ae.meta end as meta,
           ae.created_at
    from analytics_events ae
    where v_auth is null and ae.user_id = p_actor and ae.created_at > v_from
      and ae.student_id is distinct from p_actor
      and ae.event not in ('api_request', 'api_slow', 'db_error')
    union all
    -- ученик по students.id
    select ae.session_id, ae.event, ae.path,
           case when ae.event in ('login', 'auth_started', 'page_view', 'session_start') then ae.meta end as meta,
           ae.created_at
    from analytics_events ae
    where ae.student_id = p_actor and ae.created_at > v_from
      and ae.event not in ('api_request', 'api_slow', 'db_error')
    union all
    -- ученик, записанный auth-id в student_id
    select ae.session_id, ae.event, ae.path,
           case when ae.event in ('login', 'auth_started', 'page_view', 'session_start') then ae.meta end as meta,
           ae.created_at
    from analytics_events ae
    where v_auth is not null and ae.student_id = v_auth and ae.created_at > v_from
      and ae.event not in ('api_request', 'api_slow', 'db_error')
    union all
    -- ученик до выбора строки (только user_id)
    select ae.session_id, ae.event, ae.path,
           case when ae.event in ('login', 'auth_started', 'page_view', 'session_start') then ae.meta end as meta,
           ae.created_at
    from analytics_events ae
    where v_auth is not null and ae.user_id = v_auth and ae.created_at > v_from
      and ae.student_id is null and ae.role = 'student'
      and ae.event not in ('api_request', 'api_slow', 'db_error')
  ), marked as (
    select raw.*,
      coalesce(raw.created_at - lag(raw.created_at) over (order by raw.created_at) > interval '10 minutes', true) as brk
    from raw
  ), ev as (
    select marked.*, sum(case when marked.brk then 1 else 0 end) over (order by marked.created_at rows unbounded preceding) as visit
    from marked
  ), sessions as (
    select ev.visit,
      min(ev.created_at) as started, max(ev.created_at) as ended,
      (count(*) filter (where ev.event = 'heartbeat'))::int as minutes,
      (count(*) filter (where ev.event = 'auth_failed'))::int as auth_failed,
      (array_agg(ev.meta->>'method' order by ev.created_at desc) filter (where ev.event = 'login'))[1] as login_method,
      (array_agg(ev.meta->>'provider' order by ev.created_at desc) filter (where ev.event = 'auth_started'))[1] as provider,
      (array_agg(ev.meta->>'viewport' order by ev.created_at desc) filter (where ev.meta ? 'viewport'))[1] as viewport,
      array_agg(ev.path order by ev.created_at) filter (where ev.event = 'page_view') as paths
    from ev group by ev.visit
  ), days as (
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*) from raw where raw.event = 'heartbeat'
         and (raw.created_at at time zone 'Europe/Moscow')::date = d::date)::int as minutes
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
