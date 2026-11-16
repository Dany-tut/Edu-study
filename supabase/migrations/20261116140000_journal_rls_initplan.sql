-- Keep the journal snapshot's existing RLS rules while evaluating stable auth
-- helpers once per statement instead of once per candidate row. This is the
-- Supabase-recommended initplan form: (select auth.uid()).

alter policy write_own_courses on public.courses
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

alter policy write_own_groups on public.groups
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

alter policy groups_read_auth on public.groups
  using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or student_owns_group(id)
  );

alter policy student_read_own on public.students
  using (auth_user_id = (select auth.uid()));

alter policy course_modules_owner_all on public.course_modules
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and c.created_by = (select auth.uid())
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and c.created_by = (select auth.uid())
    )
  );

alter policy lessons_owner_all on public.lessons
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and c.created_by = (select auth.uid())
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and c.created_by = (select auth.uid())
    )
  );

alter policy schedule_lessons_owner_all on public.schedule_lessons
  using (
    (select public.is_admin())
    or (
      group_id is not null
      and exists (
        select 1 from public.groups g
        where g.id = schedule_lessons.group_id
          and g.created_by = (select auth.uid())
      )
    )
    or (
      student_id is not null
      and exists (
        select 1
        from public.students s
        join public.groups g on g.id = s.group_id
        where s.id = schedule_lessons.student_id
          and g.created_by = (select auth.uid())
      )
    )
  )
  with check (
    (select public.is_admin())
    or (
      group_id is not null
      and exists (
        select 1 from public.groups g
        where g.id = schedule_lessons.group_id
          and g.created_by = (select auth.uid())
      )
    )
    or (
      student_id is not null
      and exists (
        select 1
        from public.students s
        join public.groups g on g.id = s.group_id
        where s.id = schedule_lessons.student_id
          and g.created_by = (select auth.uid())
      )
    )
  );

alter policy write_own_homework on public.homework
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

alter policy auth_select_lp on public.lesson_progress
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.students s
      where s.id = lesson_progress.student_id
        and (
          s.auth_user_id = (select auth.uid())
          or exists (
            select 1 from public.groups g
            where g.id = s.group_id
              and g.created_by = (select auth.uid())
          )
        )
    )
  );

alter policy attendance_owner_all on public.lesson_attendance
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.groups g
      where g.id = lesson_attendance.group_id
        and g.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = lesson_attendance.student_id
        and g.created_by = (select auth.uid())
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.groups g
      where g.id = lesson_attendance.group_id
        and g.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.students s
      join public.groups g on g.id = s.group_id
      where s.id = lesson_attendance.student_id
        and g.created_by = (select auth.uid())
    )
  );
