-- Срок тарифа в админской таблице «По учителям».
--
-- `teacher_subscriptions.expires_at` существует с самого начала, и RPC
-- `admin_set_teacher_plan` умеет его писать четвёртым аргументом. Не хватало
-- ровно двух вещей: кнопка выдачи никогда его не передавала, а таблица не
-- показывала. Без даты «Премиум» — это навсегда, и понять, кому пора платить,
-- нельзя: список выглядит одинаково у того, кто оплатил год, и у того, кто
-- взял месяц в июне.
--
-- Здесь только чтение: добавляем expires_at в выдачу. Тип возвращаемой
-- таблицы меняется, а CREATE OR REPLACE так не умеет — отсюда drop.

drop function if exists public.admin_teacher_usage(integer);

create or replace function public.admin_teacher_usage(p_days integer default 30)
returns table(
  teacher_id uuid, name text, email text, plan_code text, expires_at timestamptz,
  total_students bigint, active_students bigint,
  active_min bigint, sessions bigint, last_seen timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    pr.id, pr.name, u.email::text, sub.plan_code, sub.expires_at,
    (select count(*) from students st join groups g on g.id = st.group_id where g.created_by = pr.id),
    (select count(distinct st.id) from students st join groups g on g.id = st.group_id
      join analytics_events ae on ae.student_id = st.id
      where g.created_by = pr.id and ae.created_at > now() - make_interval(days => p_days)),
    coalesce((select count(*) from analytics_events ae
      where ae.user_id = pr.id and ae.event = 'heartbeat' and ae.created_at > now() - make_interval(days => p_days)), 0),
    coalesce((select count(distinct ae.session_id) from analytics_events ae
      where ae.user_id = pr.id and ae.created_at > now() - make_interval(days => p_days)), 0),
    (select max(ae.created_at) from analytics_events ae where ae.user_id = pr.id)
  from profiles pr
  left join auth.users u on u.id = pr.id
  left join teacher_subscriptions sub on sub.teacher_id = pr.id
  where pr.role in ('teacher','admin')
  order by pr.name;
end $function$;

revoke execute on function public.admin_teacher_usage(integer) from public, anon;
grant execute on function public.admin_teacher_usage(integer) to authenticated;
