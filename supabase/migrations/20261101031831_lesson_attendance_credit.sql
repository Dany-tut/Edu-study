begin;
alter table public.lessons add column delivery_mode text not null default 'live'
  check (delivery_mode in ('live','recording'));

-- Project only lesson format and this pupil's attendance. Never return private
-- teacher notes. Compute from current journal marks, so corrections revoke credit.
create function public.student_lesson_participation(p_student uuid, p_refs text[])
returns table(lesson_ref text, delivery_mode text, attended boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.students s left join public.groups g on g.id=s.group_id
    where s.id=p_student and (s.auth_user_id=auth.uid() or s.created_by=auth.uid()
      or g.created_by=auth.uid() or public.is_admin())
  ) then raise exception 'Посещаемость недоступна'; end if;
  if coalesce(cardinality(p_refs),0)>250 then raise exception 'Слишком много уроков'; end if;
  return query
  with available as materialized (
    select l.*,c.subject as course_subject,
      coalesce(l.lesson_sched_manual and l.rec_date is not null and
        (l.rec_date is distinct from l.scheduled_date or l.rec_time is distinct from l.scheduled_time),false) as split
    from public.lessons l join public.courses c on c.id=l.course_id
    join public.students s on s.id=p_student
    where (s.id=any(c.student_ids) or s.group_id=any(c.group_ids)) and l.kind is distinct from 'test'
  ), nodes as materialized (
    select a.id,a.short_id as base_ref,a.short_id || n.suffix as ref,a.delivery_mode,a.title,a.course_subject,
      a.split,n.kind,
      case when n.day ~ '^\d{4}-\d{2}-\d{2}$' then n.day::date
           when n.day ~ '^\d{2}\.\d{2}\.\d{4}$' then to_date(n.day,'DD.MM.YYYY') end as day,
      nullif(n.tm,'')::time as tm
    from available a cross join lateral (
      select ''::text as suffix,'lesson'::text as kind,a.scheduled_date::text as day,a.scheduled_time::text as tm
      union all select '~rec','rec',a.rec_date::text,a.rec_time::text where a.split
    ) n
  ), candidates as (
    select sl.id,n.ref,n.base_ref,count(*) over(partition by sl.id) as matches
    from public.schedule_lessons sl join public.students s on s.id=p_student
    join nodes n on (not n.split or coalesce(sl.node_type,'lesson')=n.kind)
      and (sl.lesson_id=n.id or (sl.lesson_id is null and sl.lesson_title=n.title
        and sl.subject=n.course_subject and sl.date=n.day and nullif(sl.time_start,'')::time=n.tm))
    where (sl.group_id=s.group_id or sl.student_id=s.id) and sl.status is distinct from 'cancelled'
  ), events as materialized (
    select id,ref from candidates where matches=1 and base_ref=any(p_refs)
  ), batches as (
    select array_agg(id) as ids from (
      select id,(row_number() over(order by id)-1)/500 as batch from events
    ) x group by batch
  ), marks as materialized (
    select m.* from batches b cross join lateral public.student_schedule_attendance(p_student,b.ids) m
  )
  select n.ref,n.delivery_mode,n.delivery_mode='live' and coalesce(bool_or(m.present is true),false)
  from nodes n left join events e on e.ref=n.ref left join marks m on m.schedule_id=e.id
  where n.base_ref=any(p_refs)
  group by n.ref,n.delivery_mode;
end $$;
revoke all on function public.student_lesson_participation(uuid,text[]) from public,anon;
grant execute on function public.student_lesson_participation(uuid,text[]) to authenticated;
commit;
