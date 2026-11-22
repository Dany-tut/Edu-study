CREATE OR REPLACE FUNCTION public.my_course_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(c.id), '{}'::uuid[])
  from public.courses c
  where c.created_by = auth.uid()
     or exists (select 1 from public.course_shares cs
                 where cs.course_id = c.id and cs.teacher_id = auth.uid())
     or c.student_ids && public.my_student_ids()
     or c.group_ids   && public.my_group_ids()
     or exists (select 1 from public.course_enrollments e
                 where e.course_id = c.id
                   and e.student_id = any (select unnest(public.my_student_ids())::text))
     or exists (
       select 1 from public.students s
       where s.group_id = any (public.my_taught_group_ids())
         and (s.id = any (c.student_ids)
           or s.group_id = any (c.group_ids)
           or exists (select 1 from public.course_enrollments e2
                       where e2.course_id = c.id and e2.student_id = s.id::text))
     );
$function$
