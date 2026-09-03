-- Почта в админских таблицах активности.
--
-- ЗАЧЕМ. В «Администрирование → Пользователи» люди перечислены по имени, а имя
-- в этой базе не различает: «Даниил Макаренко» — это и учительский аккаунт с
-- 24 учениками, и отдельная тестовая карточка ученика. Владелец платформы,
-- глядя на строку, не мог понять, о какой из двух учёток речь, и какой из них
-- принадлежит группа. Почта — единственное, что здесь по-настоящему уникально.
--
-- ОТКУДА БЕРЁТСЯ. В `profiles` колонки email нет вовсе: она живёт в
-- `auth.users`. Обе функции и так SECURITY DEFINER с проверкой `is_admin()` в
-- первой строке, поэтому чтение auth.users не расширяет круг тех, кто увидит
-- почты, — их и раньше мог получить только админ.
--
-- У учеников почта своя, в `students.email`: у большинства она синтетическая
-- (`...@uchenik.iskra`) и почтовым ящиком не является — это логин. Поэтому в
-- admin_user_activity берётся coalesce: сначала настоящая из auth.users, потом
-- ученическая.
--
-- Тип возвращаемой таблицы меняется, а CREATE OR REPLACE так не умеет —
-- отсюда drop перед каждой функцией.

drop function if exists public.admin_teacher_usage(integer);

create or replace function public.admin_teacher_usage(p_days integer default 30)
returns table(
  teacher_id uuid, name text, email text, plan_code text,
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
    pr.id, pr.name, u.email::text, sub.plan_code,
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

drop function if exists public.admin_user_activity(integer);

create or replace function public.admin_user_activity(p_days integer default 30)
returns table(
  actor_kind text, actor_id uuid, name text, email text,
  sessions bigint, active_min bigint, events bigint, logins bigint,
  last_seen timestamptz, first_seen timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    max(ev.role), ev.aid, coalesce(p.name, s.name, '—'),
    coalesce(u.email::text, s.email),
    count(distinct ev.session_id),
    count(*) filter (where ev.event = 'heartbeat'),
    count(*),
    count(*) filter (where ev.event = 'login'),
    max(ev.created_at), min(ev.created_at)
  from ev
  left join profiles p on p.id = ev.aid
  left join students s on s.id = ev.aid
  left join auth.users u on u.id = ev.aid
  group by ev.aid, p.name, s.name, u.email, s.email
  order by max(ev.created_at) desc;
end $function$;

revoke execute on function public.admin_teacher_usage(integer) from public, anon;
revoke execute on function public.admin_user_activity(integer) from public, anon;
grant execute on function public.admin_teacher_usage(integer) to authenticated;
grant execute on function public.admin_user_activity(integer) to authenticated;
