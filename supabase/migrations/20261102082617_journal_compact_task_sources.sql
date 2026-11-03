-- The journal needs required/basic and native/Testly presence, not one
-- repeated task-type object per exercise. Keep rich tasks in lessons.homework.
-- v1 remains unchanged for already-open clients.
create or replace function public.teacher_journal_task_sources_v2(p_tasks jsonb)
returns jsonb language sql immutable parallel safe security invoker set search_path = '' as $$
  select case when jsonb_typeof(p_tasks) = 'array' then (
    with tasks as (
      select task,
        task not in ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb)
        and coalesce(task->'isHard','null'::jsonb) in ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb) as basic
      from jsonb_array_elements(p_tasks) task
    ), flags as (
      select coalesce(bool_or(basic),false) as basic,
        coalesce(bool_or(basic and jsonb_typeof(task->'type')='string' and task->>'type' <> 'testly'),false) as native,
        coalesce(bool_or(basic and task->>'type'='testly'),false) as testly from tasks
    )
    select case when native or testly then
      case when native then '[{"type":"iskra"}]'::jsonb else '[]'::jsonb end ||
      case when testly then '[{"type":"testly"}]'::jsonb else '[]'::jsonb end
      when basic then '[{}]'::jsonb
      when jsonb_array_length(p_tasks)>0 then '[null]'::jsonb else '[]'::jsonb end from flags
  ) else public.teacher_journal_task_summary_v1(p_tasks) end
$$;
create or replace function public.teacher_journal_extra_sources_v2(p_extra jsonb)
returns jsonb language sql immutable parallel safe security invoker set search_path = '' as $$
  select case when jsonb_typeof(p_extra)='array' then
    (select coalesce(jsonb_agg(jsonb_build_object('id',extra->'id','date',extra->'date',
      'tasks',public.teacher_journal_task_sources_v2(extra->'tasks')) order by ordinal),'[]'::jsonb)
    from jsonb_array_elements(p_extra) with ordinality t(extra,ordinal)) else null end
$$;
revoke all on function public.teacher_journal_task_sources_v2(jsonb) from public,anon;
revoke all on function public.teacher_journal_extra_sources_v2(jsonb) from public,anon;
grant execute on function public.teacher_journal_task_sources_v2(jsonb) to authenticated,service_role;
grant execute on function public.teacher_journal_extra_sources_v2(jsonb) to authenticated,service_role;
create or replace view public.teacher_journal_lessons_v2 with (security_invoker=true) as
select id,short_id,course_id,module_id,title,kind,position,lesson_number,
  scheduled_date,scheduled_time,rec_date,rec_time,lesson_sched_manual,delivery_mode,youtube_url,
  hw_date,rec_hw_date,public.teacher_journal_task_sources_v2(hw_tasks) as hw_tasks,
  public.teacher_journal_task_sources_v2(rec_tasks) as rec_tasks,
  public.teacher_journal_extra_sources_v2(extra_hw) as extra_hw
from public.teacher_journal_lessons_v1;
revoke all on public.teacher_journal_lessons_v2 from public,anon;
grant select on public.teacher_journal_lessons_v2 to authenticated,service_role;

-- One owner-scoped snapshot avoids competing RLS scans and round trips.
create or replace function public.teacher_journal_snapshot_v3(p_owner uuid, p_complete boolean default true)
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
    select json_build_object('encoding','columns-v1',
      'courses',(select json_build_object('columns','["id","short_id","title","subject","kind","group_ids","student_ids"]'::json,'rows',coalesce(json_agg(json_build_array(id,short_id,title,subject,kind,group_ids,student_ids) order by owned desc,id),'[]'::json)) from course_scope),
      'lessons',(select json_build_object('columns','["id","short_id","course_id","module_id","title","kind","position","lesson_number","scheduled_date","scheduled_time","rec_date","rec_time","lesson_sched_manual","delivery_mode","youtube_url","hwTask","recTask","hwDate","recHwDate","extraHw"]'::json,'rows',coalesce(json_agg(json_build_array(l.id,l.short_id,l.course_id,l.module_id,l.title,l.kind,l.position,l.lesson_number,l.scheduled_date,l.scheduled_time,l.rec_date,l.rec_time,l.lesson_sched_manual,l.delivery_mode,l.youtube_url,l.hw_tasks,l.rec_tasks,l.hw_date,l.rec_hw_date,case when p_complete then l.extra_hw end) order by l.id),'[]'::json)) from public.teacher_journal_lessons_v2 l where l.course_id in(select id from course_scope)),
      'modules',(select json_build_object('columns','["id","course_id","label","position"]'::json,'rows',coalesce(json_agg(json_build_array(m.id,m.course_id,m.label,m.position) order by m.id),'[]'::json)) from public.course_modules m where m.course_id in(select id from course_scope)),
      'work',(select json_build_object('columns','["id","student_id","lesson_ref","status","score","attachments","updated_at","review_comment"]'::json,'rows',coalesce(json_agg(json_build_array(p.id,p.student_id,p.lesson_ref,p.status,p.score,p.attachments,p.updated_at,p.review_comment) order by p.id),'[]'::json)) from public.lesson_progress p where p.student_id in(select id from student_scope)),
      'events',(select json_build_object('columns','["id","lesson_id","node_type","group_id","student_id","date","time_start","time_end","lesson_title","subject","status"]'::json,'rows',coalesce(json_agg(json_build_array(e.id,e.lesson_id,e.node_type,e.group_id,e.student_id,e.date,e.time_start,e.time_end,e.lesson_title,e.subject,e.status) order by e.id),'[]'::json)) from event_scope e),
      'assignments',(select json_build_object('columns','["id","lesson_id","group_id","title","due_date","status","basicTask","assignedAt","basicTasks"]'::json,'rows',coalesce(json_agg(json_build_array(h.id,h.lesson_id,h.group_id,h.title,h.due_date,h.status,h.basic_tasks->0,case when p_complete then h.assigned_at end,case when p_complete then h.basic_tasks end) order by h.id),'[]'::json)) from public.homework h where h.created_by=p_owner),
      'legacy',(select json_build_object('columns','["id","student_id","lesson_date","lesson_title","present","grade"]'::json,'rows',coalesce(json_agg(json_build_array(a.id,a.student_id,a.lesson_date,a.lesson_title,a.present,a.grade) order by a.id),'[]'::json)) from public.lesson_attendance a where a.student_id in(select id from student_scope)),
      'attempts',(select json_build_object('columns','["id","student_id","lesson_ref","number","status","score","passing_score","submitted_at","review_comment"]'::json,'rows',coalesce(json_agg(json_build_array(a.id,a.student_id,a.lesson_ref,a.number,a.status,a.score,a.passing_score,a.submitted_at,a.review_comment) order by a.id),'[]'::json)) from public.homework_attempts a where a.student_id in(select id from student_scope)),
      'marks',(select json_build_object('columns','["schedule_id","attendance"]'::json,'rows',coalesce(json_agg(json_build_array(s.schedule_id,s.attendance) order by s.schedule_id),'[]'::json)) from public.teacher_lesson_sessions s where s.schedule_id in(select id from event_scope)),
      'students','[]'::json,'groups','[]'::json,'warnings','[]'::json,'demo',false
    )
  );
end $function$;
revoke all on function public.teacher_journal_snapshot_v3(uuid,boolean) from public,anon;
grant execute on function public.teacher_journal_snapshot_v3(uuid,boolean) to authenticated;
notify pgrst,'reload schema';

