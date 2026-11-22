-- Reduce planner-time evaluation of existing row-independent STABLE scope.
-- Four existing SELECT predicates only. No changes to helpers, roles, grants,
-- permissiveness, MFA/staff/visibility checks, USING branches or WITH CHECK.
-- Local original-helper proof:17 actors/306 SELECT/write-policy comparisons.
-- Each InitPlan re-evaluates per statement/current actor, not across requests.
set local lock_timeout='2s';
set local statement_timeout='8s';
set local search_path=pg_catalog,public;
do $reviewed_scope$
begin
  if not exists(select 1 from pg_proc where oid='public.my_course_ids()'::regprocedure
    and pronargs=0 and provolatile='s' and prosecdef
    and proowner='postgres'::regrole::oid
    and proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
    and md5(pg_get_functiondef(oid))='b1f7958ae44fdb0ff4e51f8b334b9688') then
    raise exception 'Course scope helper changed since reviewed baseline';
  end if;
  if not exists(select 1 from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='course_enrollments' and p.polname='read_all_course_enrollments'
      and t.relrowsecurity and p.polcmd='r' and p.polpermissive
      and p.polroles=array['authenticated'::regrole::oid]
      and pg_get_expr(p.polqual,p.polrelid)='(( SELECT is_admin() AS is_admin) OR (student_id IN ( SELECT (unnest(my_student_ids()))::text AS unnest)) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest)))' and p.polwithcheck is null) then
    raise exception 'Course scope policy changed since reviewed baseline: course_enrollments.read_all_course_enrollments';
  end if;
  if not exists(select 1 from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='course_modules' and p.polname='anyone can read course_modules'
      and t.relrowsecurity and p.polcmd='r' and p.polpermissive
      and p.polroles=array['authenticated'::regrole::oid]
      and pg_get_expr(p.polqual,p.polrelid)='(( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest)))' and p.polwithcheck is null) then
    raise exception 'Course scope policy changed since reviewed baseline: course_modules.anyone can read course_modules';
  end if;
  if not exists(select 1 from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='courses' and p.polname='read_all_courses'
      and t.relrowsecurity and p.polcmd='r' and p.polpermissive
      and p.polroles=array['authenticated'::regrole::oid]
      and pg_get_expr(p.polqual,p.polrelid)='(( SELECT is_admin() AS is_admin) OR (id IN ( SELECT unnest(my_course_ids()) AS unnest)))' and p.polwithcheck is null) then
    raise exception 'Course scope policy changed since reviewed baseline: courses.read_all_courses';
  end if;
  if not exists(select 1 from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='lessons' and p.polname='read_all_lessons'
      and t.relrowsecurity and p.polcmd='r' and p.polpermissive
      and p.polroles=array['authenticated'::regrole::oid]
      and pg_get_expr(p.polqual,p.polrelid)='(( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest)))' and p.polwithcheck is null) then
    raise exception 'Course scope policy changed since reviewed baseline: lessons.read_all_lessons';
  end if;
end $reviewed_scope$;

-- External candidate only. Four existing SELECT qualifications; no new policy.
alter policy "read_all_course_enrollments" on public."course_enrollments" using ((( SELECT is_admin() AS is_admin) OR (student_id IN ( SELECT (unnest(my_student_ids()))::text AS unnest)) OR (course_id IN ( SELECT unnest((SELECT public.my_course_ids())::uuid[]) AS unnest))));

alter policy "anyone can read course_modules" on public."course_modules" using ((( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest((SELECT public.my_course_ids())::uuid[]) AS unnest))));

alter policy "read_all_courses" on public."courses" using ((( SELECT is_admin() AS is_admin) OR (id IN ( SELECT unnest((SELECT public.my_course_ids())::uuid[]) AS unnest))));

alter policy "read_all_lessons" on public."lessons" using ((( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest((SELECT public.my_course_ids())::uuid[]) AS unnest))));

notify pgrst, 'reload schema';
