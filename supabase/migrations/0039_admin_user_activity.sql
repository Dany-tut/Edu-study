-- 0039_admin_user_activity.sql — данные для экрана «По пользователям» в Админке.
-- Считает активное время (heartbeat≈минута), сессии, last seen по каждому
-- пользователю из analytics_events, резолвит имя из profiles/students, и даёт
-- per-teacher usage (активные ученики + тариф) — основа тарифных лимитов.
-- Обе admin-only; event trigger lock_admin_function_execute_trg авто-ревокнёт
-- anon/public по admin_-префиксу.

-- Активность по каждому актору (учитель/админ/ученик).
create or replace function public.admin_user_activity(p_days int default 30)
returns table(
  actor_kind text, actor_id uuid, name text,
  sessions bigint, active_min bigint, events bigint,
  logins bigint, last_seen timestamptz, first_seen timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with ev as (
    select coalesce(ae.user_id, ae.student_id) as aid, ae.role,
           ae.session_id, ae.event, ae.created_at
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and coalesce(ae.user_id, ae.student_id) is not null
  )
  select
    max(ev.role),
    ev.aid,
    coalesce(p.name, s.name, '—'),
    count(distinct ev.session_id),
    count(*) filter (where ev.event = 'heartbeat'),
    count(*),
    count(*) filter (where ev.event = 'login'),
    max(ev.created_at),
    min(ev.created_at)
  from ev
  left join profiles p on p.id = ev.aid
  left join students s on s.id = ev.aid
  group by ev.aid, p.name, s.name
  order by max(ev.created_at) desc;
end $$;

-- Per-teacher usage: активные ученики за период (= будущий счётчик тарифа) + тариф.
create or replace function public.admin_teacher_usage(p_days int default 30)
returns table(
  teacher_id uuid, name text, plan_code text,
  total_students bigint, active_students bigint,
  active_min bigint, sessions bigint, last_seen timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    pr.id, pr.name, sub.plan_code,
    (select count(*) from students st join groups g on g.id = st.group_id
      where g.created_by = pr.id),
    (select count(distinct st.id) from students st join groups g on g.id = st.group_id
      join analytics_events ae on ae.student_id = st.id
      where g.created_by = pr.id
        and ae.created_at > now() - make_interval(days => p_days)),
    coalesce((select count(*) from analytics_events ae
      where ae.user_id = pr.id and ae.event = 'heartbeat'
        and ae.created_at > now() - make_interval(days => p_days)), 0),
    coalesce((select count(distinct ae.session_id) from analytics_events ae
      where ae.user_id = pr.id
        and ae.created_at > now() - make_interval(days => p_days)), 0),
    (select max(ae.created_at) from analytics_events ae where ae.user_id = pr.id)
  from profiles pr
  left join teacher_subscriptions sub on sub.teacher_id = pr.id
  where pr.role in ('teacher','admin')
  order by pr.name;
end $$;
