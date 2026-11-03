-- Privileged legacy RPCs must never treat a supplied student UUID as proof of identity.
-- Read aggregations use caller RLS; the narrow order writer checks the actor explicitly.
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create or replace function public.person_student_rows(p_student uuid)
returns table(id uuid,group_id uuid)
language sql stable security invoker set search_path = '' as $function$
  with actor as (
    select (select auth.uid()) as uid,
      coalesce((select auth.jwt())->'app_metadata'->>'role' = 'admin', false) as admin,
      coalesce((select auth.role()) = 'service_role', false) as service
  ), me as (
    select s.person_id,s.auth_user_id from public.students s,actor a
    where s.id=p_student and (a.admin or a.service or s.auth_user_id=a.uid or s.created_by=a.uid)
  )
  select s.id,s.group_id from public.students s,me,actor a
  where (s.id=p_student or (me.person_id is not null and s.person_id=me.person_id)
    or (me.auth_user_id is not null and s.auth_user_id=me.auth_user_id))
    and (a.admin or a.service or s.auth_user_id=a.uid or s.created_by=a.uid)
$function$;
revoke all on function public.person_student_rows(uuid) from public,anon;
grant execute on function public.person_student_rows(uuid) to authenticated,service_role;

alter function public.student_track(uuid,uuid) security invoker;
alter function public.student_track(uuid,uuid) set search_path = '';
revoke all on function public.student_track(uuid,uuid) from public,anon;
grant execute on function public.student_track(uuid,uuid) to authenticated,service_role;

create or replace function public.set_course_order(p_student uuid,p_courses uuid[])
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not exists(select 1 from public.person_student_rows(p_student)) then
    raise insufficient_privilege using message='Student account required';
  end if;
with rows as (
  select id, group_id from public.person_student_rows(p_student)
),
ord as (
  select cid, (ordinality - 1)::smallint pos
  from unnest(coalesce(p_courses, '{}'::uuid[])) with ordinality t(cid, ordinality)
),
tgt as (
  select o.cid, o.pos,
         coalesce(
           (select r.id from rows r where c.student_ids @> array[r.id] limit 1),
           (select r.id from rows r where r.group_id is not null and c.group_ids @> array[r.group_id] limit 1)
         ) owner
    from ord o
    join public.courses c on c.id = o.cid
)
insert into public.course_enrollments (course_id, student_id, access_mode, position)
select cid, owner::text, 'custom', pos from tgt where owner is not null
on conflict (course_id, student_id) do update set position = excluded.position;
end;
$function$;
revoke all on function public.set_course_order(uuid,uuid[]) from public,anon;
grant execute on function public.set_course_order(uuid,uuid[]) to authenticated,service_role;

-- Scheduled digest is an internal job, never an anonymous/client entry point.
revoke all on function public.run_analytics_digest() from public,anon,authenticated;
grant execute on function public.run_analytics_digest() to service_role;
