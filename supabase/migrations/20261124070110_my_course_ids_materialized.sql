-- Без MATERIALIZED Postgres встраивал «me» в запрос и снова звал
-- my_student_ids()/my_group_ids()/my_taught_group_ids() на каждую строку
-- courses (~17 мс). С MATERIALIZED они считаются один раз (~1,4 мс).
-- Набор курсов сверен со старой версией для всех 45 входов.
create or replace function public.my_course_ids()
returns uuid[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  with me as materialized (
    select auth.uid() as uid,
      public.my_student_ids() as sids,
      public.my_group_ids() as gids,
      public.my_taught_group_ids() as tgids
  )
  select coalesce(array_agg(c.id), '{}'::uuid[])
  from public.courses c cross join me
  where c.created_by = me.uid
     or exists (select 1 from public.course_shares cs
                 where cs.course_id = c.id and cs.teacher_id = me.uid)
     or c.student_ids && me.sids
     or c.group_ids && me.gids
     or exists (select 1 from public.course_enrollments e
                 where e.course_id = c.id
                   and e.student_id = any (me.sids::text[]))
     or exists (
       select 1 from public.students s
       where s.group_id = any (me.tgids)
         and (s.id = any (c.student_ids)
           or s.group_id = any (c.group_ids)
           or exists (select 1 from public.course_enrollments e2
                       where e2.course_id = c.id and e2.student_id = s.id::text))
     );
$function$;
