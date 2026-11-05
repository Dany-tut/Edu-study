-- «Аналитика → Все пользователи» без удалённых аккаунтов.
--
-- В таблице висели ~90 строк «—» с ролью «Учитель», 0 мин, 1 сессия: события
-- аналитики остались от временных аккаунтов проверок прода (02–03.11), которые
-- после прогона удаляются. Имени и почты у них уже нет, а счётчик
-- «Пользователей» раздувался вдвое.
--
-- Показываем только тех, кто есть в profiles, students или auth.users. Сами
-- события не трогаем: общая статистика страниц считается по ним как раньше.
-- Сигнатура и формат результата не меняются.

create or replace function public.admin_user_activity(p_days integer default 30)
returns table(actor_kind text, actor_id uuid, name text, email text, sessions bigint, active_min bigint, events bigint, logins bigint, last_seen timestamptz, first_seen timestamptz)
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
  where p.id is not null or s.id is not null or u.id is not null
  group by ev.aid, p.name, s.name, u.email, s.email
  order by max(ev.created_at) desc;
end $function$;
