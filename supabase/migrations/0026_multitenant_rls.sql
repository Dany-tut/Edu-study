-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0026_multitenant_rls — close cross-teacher access + admin escalation        ║
-- ║                                                                            ║
-- ║ Applied 2026-07-04 via execute_sql (verified). Before this, any authed      ║
-- ║ teacher could read/modify ANY other teacher's courses/groups/homework/      ║
-- ║ students/enrollments/shares (write policies were `using(true)`), and        ║
-- ║ is_admin() trusted client-editable user_metadata.                          ║
-- ║                                                                            ║
-- ║ Reads stay open where anon students need them (courses/groups/homework      ║
-- ║ SELECT); only WRITES are owner-scoped. Verified pre-apply: homework 0       ║
-- ║ orphans, students 0 without group, group/course owners are real accounts.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. admin flag: app_metadata only (user_metadata is client-editable → escalation).
--    Verified safe: the sole admin has role=admin in app_metadata too.
create or replace function public.is_admin()
returns boolean language sql stable set search_path to 'public'
as $function$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false); $function$;

-- 2. course_enrollments / course_shares — write only by course owner.
drop policy if exists write_auth_course_enrollments on public.course_enrollments;
create policy write_own_course_enrollments on public.course_enrollments for all to authenticated
  using (course_id in (select id from public.courses where created_by = auth.uid()))
  with check (course_id in (select id from public.courses where created_by = auth.uid()));

drop policy if exists write_auth_course_shares on public.course_shares;
create policy write_own_course_shares on public.course_shares for all to authenticated
  using (course_id in (select id from public.courses where created_by = auth.uid()))
  with check (course_id in (select id from public.courses where created_by = auth.uid()));

-- 3. groups / courses — write only by owner (read stays open for anon students).
drop policy if exists "write groups" on public.groups;
create policy write_own_groups on public.groups for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists write_auth_courses on public.courses;
create policy write_own_courses on public.courses for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- 4. homework — write only by creator; students — write only within owned groups.
drop policy if exists "write homework" on public.homework;
create policy write_own_homework on public.homework for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists teacher_write_students on public.students;
create policy teacher_write_students on public.students for all to authenticated
  using (group_id in (select id from public.groups where created_by = auth.uid()))
  with check (group_id in (select id from public.groups where created_by = auth.uid()));

-- 5. Backfill the orphan course to the admin owner (user-confirmed 2026-07-04).
update public.courses set created_by = '84fe210b-677d-41e2-a3d9-74021390c0c2' where created_by is null;

-- 6. Tighten students READ: admin sees all (analytics), teachers only own-group
--    students. Also align write with the same is_admin()-OR-owner rule so admin
--    isn't locked out of the student-management UI.
drop policy if exists teacher_read_students on public.students;
create policy teacher_read_students on public.students for select to authenticated
  using (is_admin() or group_id in (select id from public.groups where created_by = auth.uid()));

drop policy if exists teacher_write_students on public.students;
create policy teacher_write_students on public.students for all to authenticated
  using (is_admin() or group_id in (select id from public.groups where created_by = auth.uid()))
  with check (is_admin() or group_id in (select id from public.groups where created_by = auth.uid()));

-- 7. profiles READ: teachers read only their own (via "read own profile");
--    admin reads all. Was teacher_read_all_profiles (is_teacher → all), which
--    also broke .single() reads once ≥2 teacher rows exist.
drop policy if exists teacher_read_all_profiles on public.profiles;
create policy admin_read_all_profiles on public.profiles for select to authenticated
  using (is_admin());

-- Client-side admin UI gates were also switched from user_metadata (client-
-- editable) to app_metadata: teacherAccess.ts, TeacherAdminPage, TeacherTopBar,
-- TeacherProfileSettingsPage. Student detection stays on user_metadata (students
-- only carry their role there).

-- DEFERRED: students.anon_read_by_invite_token lets anon read any invited (pre-
-- registration) student row → minor PII/enumeration leak. Proper fix = a
-- security-definer RPC that returns only the token-matching row + drop the anon
-- SELECT policy (needs JoinPage change). teacher_read_all_profiles still is_teacher()-wide.
