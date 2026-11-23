-- «Администрирование → Пользователи» снова грузится.
--
-- admin_user_activity и admin_teacher_usage падали по statement timeout (500),
-- а экран показывал «Нет данных»: за 30 дней в analytics_events ~200 тыс.
-- строк, из них ~71% — служебная телеметрия запросов (api_request, api_slow,
-- db_error). Действиями людей она не является, но оба запроса перебирали её,
-- а «По учителям» делал это четырьмя подзапросами на каждого учителя (~42 с).
--
-- Теперь:
--   • телеметрия не участвует в подсчёте активности (сессии, минуты, события);
--   • частичный покрывающий индекс только по событиям людей — index-only scan;
--   • «По учителям» читает журнал за период один раз и раскладывает по учителям.
-- Сигнатуры и формат результата не меняются. Данные не трогаются.

create index if not exists analytics_events_human_cover_idx
  on public.analytics_events (created_at desc)
  include (event, role, user_id, student_id, session_id)
  where event not in ('api_request', 'api_slow', 'db_error');

create or replace function public.admin_user_activity(p_days integer default 30)
returns table(actor_kind text, actor_id uuid, name text, email text, sessions bigint, active_min bigint, events bigint, logins bigint, last_seen timestamptz, first_seen timestamptz)
language plpgsql
security definer
set search_path to 'public'
set work_mem to '64MB'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with agg as (
    select coalesce(ae.user_id, ae.student_id) as aid,
           max(ae.role) as role,
           count(distinct ae.session_id) as sessions,
           count(*) filter (where ae.event = 'heartbeat') as active_min,
           count(*) as events,
           count(*) filter (where ae.event = 'login') as logins,
           max(ae.created_at) as last_seen,
           min(ae.created_at) as first_seen
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and ae.event not in ('api_request', 'api_slow', 'db_error')
      and coalesce(ae.user_id, ae.student_id) is not null
    group by 1
  )
  select
    agg.role, agg.aid, coalesce(p.name, s.name, '—'),
    coalesce(u.email::text, s.email),
    agg.sessions, agg.active_min, agg.events, agg.logins,
    agg.last_seen, agg.first_seen
  from agg
  left join profiles p on p.id = agg.aid
  left join students s on s.id = agg.aid
  left join auth.users u on u.id = agg.aid
  where p.id is not null or s.id is not null or u.id is not null
  order by agg.last_seen desc;
end $function$;

create or replace function public.admin_teacher_usage(p_days integer default 30)
returns table(teacher_id uuid, name text, email text, plan_code text, expires_at timestamptz, total_students bigint, active_students bigint, active_min bigint, sessions bigint, last_seen timestamptz)
language plpgsql
security definer
set search_path to 'public'
set work_mem to '64MB'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with ev as materialized (
    select ae.user_id, ae.student_id, ae.session_id, ae.event
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and ae.event not in ('api_request', 'api_slow', 'db_error')
  ),
  t_ev as (
    select ev.user_id as tid,
           count(*) filter (where ev.event = 'heartbeat') as hb,
           count(distinct ev.session_id) as ss
    from ev where ev.user_id is not null
    group by 1
  ),
  active_ids as (
    select distinct ev.student_id from ev where ev.student_id is not null
  ),
  st as (
    select g.created_by as tid,
           count(*) as total,
           count(*) filter (where a.student_id is not null) as active
    from students s
    join groups g on g.id = s.group_id
    left join active_ids a on a.student_id = s.id
    group by 1
  )
  select
    pr.id, pr.name, u.email::text, sub.plan_code, sub.expires_at,
    coalesce(st.total, 0), coalesce(st.active, 0),
    coalesce(t_ev.hb, 0), coalesce(t_ev.ss, 0),
    (select max(ae.created_at) from analytics_events ae where ae.user_id = pr.id)
  from profiles pr
  left join auth.users u on u.id = pr.id
  left join teacher_subscriptions sub on sub.teacher_id = pr.id
  left join st on st.tid = pr.id
  left join t_ev on t_ev.tid = pr.id
  where pr.role in ('teacher', 'admin')
  order by pr.name;
end $function$;

revoke execute on function public.admin_user_activity(integer) from public, anon;
grant execute on function public.admin_user_activity(integer) to authenticated;
revoke execute on function public.admin_teacher_usage(integer) from public, anon;
grant execute on function public.admin_teacher_usage(integer) to authenticated;
