-- Ownership alone is insufficient: an ordinary signed-in student can set
-- created_by=auth.uid(). Require a server-assigned staff role as well.
-- RESTRICTIVE policies combine with the existing owner policies (AND).
do $$
declare t text;
begin
  foreach t in array array['groups','courses','lessons','course_modules','homework',
    'course_enrollments','course_shares','schedule','schedule_lessons','students','widgets']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_only_insert on public.%I as restrictive for insert to authenticated with check ((select public.is_staff()))', t);
    execute format('create policy staff_only_update on public.%I as restrictive for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format('create policy staff_only_delete on public.%I as restrictive for delete to authenticated using ((select public.is_staff()))', t);
  end loop;
end;
$$;
