-- Journal cells need task types and hard/basic flags, not rich conditions,
-- images, answer keys or task bodies. Preserve array order and extra-HW IDs.
create or replace function public.teacher_journal_task_summary_v1(p_tasks jsonb)
returns jsonb language sql immutable parallel safe security invoker
set search_path = '' as $$
  select case jsonb_typeof(p_tasks)
    when 'array' then (select coalesce(jsonb_agg(
      case when jsonb_typeof(task) = 'object'
        then jsonb_strip_nulls(jsonb_build_object('type',task->'type','isHard',task->'isHard'))
        else task end order by ordinal), '[]'::jsonb)
      from jsonb_array_elements(p_tasks) with ordinality as t(task,ordinal))
    when 'object' then jsonb_strip_nulls(jsonb_build_object('type',p_tasks->'type','isHard',p_tasks->'isHard'))
    else p_tasks end
$$;
create or replace function public.teacher_journal_extra_summary_v1(p_extra jsonb)
returns jsonb language sql immutable parallel safe security invoker
set search_path = '' as $$
  select case when jsonb_typeof(p_extra) = 'array' then
    (select coalesce(jsonb_agg(jsonb_build_object(
      'id',extra->'id','date',extra->'date','tasks',public.teacher_journal_task_summary_v1(extra->'tasks'))
      order by ordinal), '[]'::jsonb)
      from jsonb_array_elements(p_extra) with ordinality as t(extra,ordinal))
    else null end
$$;
revoke all on function public.teacher_journal_task_summary_v1(jsonb) from public,anon;
revoke all on function public.teacher_journal_extra_summary_v1(jsonb) from public,anon;
grant execute on function public.teacher_journal_task_summary_v1(jsonb) to authenticated,service_role;
grant execute on function public.teacher_journal_extra_summary_v1(jsonb) to authenticated,service_role;

-- Invoker security is essential: underlying lessons RLS remains authoritative.
create or replace view public.teacher_journal_lessons_v1 with (security_invoker = true) as
select id,short_id,course_id,module_id,title,kind,position,lesson_number,
  scheduled_date,scheduled_time,rec_date,rec_time,lesson_sched_manual,delivery_mode,youtube_url,
  homework->>'hwDate' as hw_date, homework->>'recHwDate' as rec_hw_date,
  public.teacher_journal_task_summary_v1(homework->'hwTasks') as hw_tasks,
  public.teacher_journal_task_summary_v1(homework->'recHwTasks') as rec_tasks,
  public.teacher_journal_extra_summary_v1(homework->'extraHw') as extra_hw
from public.lessons;
revoke all on public.teacher_journal_lessons_v1 from public,anon;
grant select on public.teacher_journal_lessons_v1 to authenticated,service_role;
notify pgrst, 'reload schema';
