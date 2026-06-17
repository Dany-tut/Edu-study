-- Each lesson can carry TWO scheduled events: the live session ("Запись") and
-- the lesson itself ("Урок"). They mirror by default and split into two track
-- nodes once the teacher sets the lesson date by hand (lesson_sched_manual).

alter table public.lessons
  add column if not exists rec_date text,
  add column if not exists rec_time text,
  add column if not exists rec_duration integer,
  add column if not exists lesson_sched_manual boolean not null default false;

-- Distinguish recording vs lesson rows in the calendar strip.
alter table public.schedule_lessons
  add column if not exists node_type text not null default 'lesson';

alter table public.schedule_lessons
  drop constraint if exists schedule_lessons_node_type_chk;
alter table public.schedule_lessons
  add constraint schedule_lessons_node_type_chk
  check (node_type in ('lesson', 'rec'));
