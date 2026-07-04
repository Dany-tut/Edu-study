-- 0020_course_enrollments.sql
-- Per-student enrollment into a course, carrying an access mode that decides how
-- lessons open up. Assignment (courses.student_ids/group_ids) still controls
-- *visibility*; this table controls *openness*:
--   'full'    — every lesson open immediately (bought a finished, recorded course)
--   'custom'  — nothing auto-opens; teacher unlocks lessons by hand (current default)
--   'by_date' — lessons open as their scheduled date passes (joined an ongoing course);
--               computed at read time from lessons.scheduled_date, no cron needed.

create table if not exists public.course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  student_id  text not null,
  access_mode text not null default 'custom'
              check (access_mode in ('full', 'custom', 'by_date')),
  granted_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (course_id, student_id)
);

create index if not exists course_enrollments_student_idx
  on public.course_enrollments (student_id);
create index if not exists course_enrollments_course_idx
  on public.course_enrollments (course_id);

-- RLS mirrors courses / schedule_lessons: public SELECT (students run as anon),
-- writes only for authenticated teachers.
alter table public.course_enrollments enable row level security;

drop policy if exists read_all_course_enrollments on public.course_enrollments;
create policy read_all_course_enrollments
  on public.course_enrollments for select
  using (true);

drop policy if exists write_auth_course_enrollments on public.course_enrollments;
create policy write_auth_course_enrollments
  on public.course_enrollments for all
  to authenticated
  using (true)
  with check (true);
