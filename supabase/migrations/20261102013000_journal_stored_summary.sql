-- Compute the compact projection when homework changes, not on every OFFSET
-- page read. A stored generated column cannot become stale or be overwritten
-- by a client. The source homework and existing lesson RLS stay authoritative.
create or replace function public.teacher_journal_homework_summary_v1(p_homework jsonb)
returns jsonb language sql immutable parallel safe security invoker
set search_path = '' as $$
  select jsonb_build_object(
    'hwDate',p_homework->>'hwDate', 'recHwDate',p_homework->>'recHwDate',
    'hwTasks',public.teacher_journal_task_summary_v1(p_homework->'hwTasks'),
    'recHwTasks',public.teacher_journal_task_summary_v1(p_homework->'recHwTasks'),
    'extraHw',public.teacher_journal_extra_summary_v1(p_homework->'extraHw'))
    - case when p_homework->'hwTasks' is null then 'hwTasks' else '' end
    - case when p_homework->'recHwTasks' is null then 'recHwTasks' else '' end
$$;
revoke all on function public.teacher_journal_homework_summary_v1(jsonb) from public,anon;
grant execute on function public.teacher_journal_homework_summary_v1(jsonb) to authenticated,service_role;

set lock_timeout = '5s';
alter table public.lessons add column if not exists journal_homework_summary jsonb
  generated always as (public.teacher_journal_homework_summary_v1(homework)) stored;
reset lock_timeout;

create or replace view public.teacher_journal_lessons_v1 with (security_invoker = true) as
select id,short_id,course_id,module_id,title,kind,position,lesson_number,
  scheduled_date,scheduled_time,rec_date,rec_time,lesson_sched_manual,delivery_mode,youtube_url,
  journal_homework_summary->>'hwDate' as hw_date,
  journal_homework_summary->>'recHwDate' as rec_hw_date,
  journal_homework_summary->'hwTasks' as hw_tasks,
  journal_homework_summary->'recHwTasks' as rec_tasks,
  nullif(journal_homework_summary->'extraHw','null'::jsonb) as extra_hw
from public.lessons;
revoke all on public.teacher_journal_lessons_v1 from public,anon;
grant select on public.teacher_journal_lessons_v1 to authenticated,service_role;
notify pgrst, 'reload schema';
