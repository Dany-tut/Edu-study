-- Журнал учителя: источники заданий уроков считаются при записи урока
-- (вычисляемые столбцы, как journal_homework_summary), а не при каждом
-- открытии журнала (~6000 вызовов функций, ~300 мс у учителя с 2000 уроков).
-- Представление сверено до/после по всем 2112 урокам: 0 расхождений.
-- В снимке журнала 'work' больше не везёт тяжёлые вложения (ответы по
-- сложным заданиям, доска, фото, разметка) — журнал их не читает, проверка
-- берёт их отдельным запросом. 1,3 МБ → 0,9 МБ, 340 → ~60 мс.
-- Откат: ~/.codex/iskra-backups/*-journal-speed/rollback.sql
alter table public.lessons
  add column if not exists journal_hw_sources jsonb generated always as (public.teacher_journal_task_sources_v2(public.teacher_journal_homework_summary_v1(homework) -> 'hwTasks')) stored,
  add column if not exists journal_rec_sources jsonb generated always as (public.teacher_journal_task_sources_v2(public.teacher_journal_homework_summary_v1(homework) -> 'recHwTasks')) stored,
  add column if not exists journal_extra_sources jsonb generated always as (public.teacher_journal_extra_sources_v2(nullif(public.teacher_journal_homework_summary_v1(homework) -> 'extraHw', 'null'::jsonb))) stored;
create or replace view public.teacher_journal_lessons_v2 with (security_invoker = true) as
 select id, short_id, course_id, module_id, title, kind, "position", lesson_number, scheduled_date, scheduled_time, rec_date, rec_time, lesson_sched_manual, delivery_mode, youtube_url,
   journal_homework_summary ->> 'hwDate' as hw_date, journal_homework_summary ->> 'recHwDate' as rec_hw_date,
   journal_hw_sources as hw_tasks, journal_rec_sources as rec_tasks, journal_extra_sources as extra_hw
 from public.lessons;
do $$ declare d text; n text; begin
  d := pg_get_functiondef('public.teacher_journal_snapshot_v3(uuid,boolean)'::regprocedure);
  n := replace(d, 'p.score,p.attachments,p.updated_at', 'p.score,p.attachments - ''tasks'' - ''board'' - ''photos'' - ''annotation'',p.updated_at');
  if n = d then raise exception 'snapshot work column not found'; end if;
  execute n;
end $$;
