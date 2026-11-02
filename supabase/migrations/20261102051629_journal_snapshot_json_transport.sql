-- JSON is already the API transport. Stream row JSON once rather than build
-- and copy a large binary JSONB tree, then serialize that tree again.
-- Keep v1 for already-open clients; v2 has identical objects and authorization.
create or replace function public.teacher_journal_snapshot_v2(p_owner uuid, p_complete boolean default true)
returns json language plpgsql stable security invoker set search_path = '' as $function$
begin
  if (select auth.uid()) is null or p_owner is null
    or (p_owner <> (select auth.uid()) and not (select public.is_admin())) then
    raise exception 'Journal owner is not accessible' using errcode = '42501';
  end if;
  return (
    with course_scope as materialized (
      select c.id,c.short_id,c.title,c.subject,c.kind,c.group_ids,c.student_ids,c.created_by=p_owner owned from public.courses c
      where c.created_by=p_owner or c.id in(select s.course_id from public.course_shares s where s.teacher_id=p_owner)
    ), student_scope as materialized (
      select s.id from public.students s where s.created_by=p_owner
    ), group_scope as materialized (
      select g.id from public.groups g where g.created_by=p_owner
    ), event_scope as materialized (
      select e.id,e.lesson_id,e.node_type,e.group_id,e.student_id,e.date,e.time_start,e.time_end,e.lesson_title,e.subject,e.status
      from public.schedule_lessons e where e.group_id in(select id from group_scope) or e.student_id in(select id from student_scope)
    )
    select json_build_object(
      'courses',(select coalesce(json_agg(json_build_object('id',id,'short_id',short_id,'title',title,'subject',subject,'kind',kind,'group_ids',group_ids,'student_ids',student_ids) order by owned desc,id),'[]'::json) from (
        select id,short_id,title,subject,kind,group_ids,student_ids,owned from course_scope) q),
      'lessons',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select l.id,l.short_id,l.course_id,l.module_id,l.title,l.kind,l.position,l.lesson_number,
          l.scheduled_date,l.scheduled_time,l.rec_date,l.rec_time,l.lesson_sched_manual,l.delivery_mode,l.youtube_url,
          l.hw_tasks as "hwTask",l.rec_tasks as "recTask",l.hw_date as "hwDate",l.rec_hw_date as "recHwDate",
          case when p_complete then l.extra_hw end as "extraHw"
        from public.teacher_journal_lessons_v1 l where l.course_id in(select id from course_scope)) q),
      'modules',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select m.id,m.course_id,m.label,m.position from public.course_modules m where m.course_id in(select id from course_scope)) q),
      'work',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select p.id,p.student_id,p.lesson_ref,p.status,p.score,p.attachments,p.updated_at,p.review_comment
        from public.lesson_progress p where p.student_id in(select id from student_scope)) q),
      'events',(select coalesce(json_agg(e order by id),'[]'::json) from event_scope e),
      'assignments',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select h.id,h.lesson_id,h.group_id,h.title,h.due_date,h.status,h.basic_tasks->0 as "basicTask",
          case when p_complete then h.assigned_at end as "assignedAt",case when p_complete then h.basic_tasks end as "basicTasks"
        from public.homework h where h.created_by=p_owner) q),
      'legacy',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select a.id,a.student_id,a.lesson_date,a.lesson_title,a.present,a.grade
        from public.lesson_attendance a where a.student_id in(select id from student_scope)) q),
      'attempts',(select coalesce(json_agg(q order by id),'[]'::json) from (
        select a.id,a.student_id,a.lesson_ref,a.number,a.status,a.score,a.passing_score,a.submitted_at,a.review_comment
        from public.homework_attempts a where a.student_id in(select id from student_scope)) q),
      'marks',(select coalesce(json_agg(q order by schedule_id),'[]'::json) from (
        select s.schedule_id,s.attendance from public.teacher_lesson_sessions s where s.schedule_id in(select id from event_scope)) q),
      'students','[]'::json,'groups','[]'::json,'warnings','[]'::json,'demo',false
    )
  );
end $function$;
revoke all on function public.teacher_journal_snapshot_v2(uuid,boolean) from public,anon;
grant execute on function public.teacher_journal_snapshot_v2(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
