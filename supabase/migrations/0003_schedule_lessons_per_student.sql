-- Allow scheduling lessons for individually-assigned students, not just groups.
-- Until now schedule_lessons rows were keyed only by group_id (NOT NULL), so a
-- course assigned via student_ids (with empty group_ids) never produced any
-- calendar rows. We add a nullable student_id and make group_id nullable so a
-- scheduled row can be scoped to EITHER a group OR a single student.

alter table public.schedule_lessons
  alter column group_id drop not null;

alter table public.schedule_lessons
  add column if not exists student_id uuid references public.students(id) on delete cascade;

create index if not exists schedule_lessons_student_id_idx
  on public.schedule_lessons (student_id);

-- A scheduled row must be scoped to a group or a student (or both).
alter table public.schedule_lessons
  drop constraint if exists schedule_lessons_scope_chk;
alter table public.schedule_lessons
  add constraint schedule_lessons_scope_chk
  check (group_id is not null or student_id is not null);
