-- Строки одного человека без опоры на auth-сессию.
--
-- Кабинет собирает курсы по ВСЕМ строкам ученика (у 1:1-ученика своя строка на
-- каждый предмет). Раньше их искали только через `students.auth_user_id =
-- auth.uid()`, и легаси-вход (RPC student_login) либо протухшая auth-сессия
-- молча схлопывали охват до одной строки из localStorage: курсы остальных
-- предметов исчезали из кабинета, хотя назначены верно.
--
-- SECURITY DEFINER — потому что RLS `student_read_own` не пускает к строкам без
-- auth.uid(). Отдаём только id и group_id (ни имён, ни почт): знание uuid
-- строки и так даёт доступ к её курсам и прогрессу.
create or replace function public.person_student_rows(p_student uuid)
returns table (id uuid, group_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select s.person_id, s.auth_user_id from students s where s.id = p_student
  )
  select s.id, s.group_id
  from students s, me
  where s.id = p_student
     or (me.person_id is not null and s.person_id = me.person_id)
     or (me.auth_user_id is not null and s.auth_user_id = me.auth_user_id)
$$;

revoke all on function public.person_student_rows(uuid) from public;
grant execute on function public.person_student_rows(uuid) to anon, authenticated;
