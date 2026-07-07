-- 0035_content_owner_scope.sql — Этап 0: изоляция контента между учителями.
-- До этого lessons/task_bank/trainers/schedule имели ALL(true) для authenticated:
-- любой залогиненный учитель мог править/удалять контент любого другого.
-- 0026 закрыла только courses/groups/homework — здесь дотягиваем остальное.
-- ОСТАВЛЕНО НА ЭТАП 2 (сознательно): curriculum и widgets — глобальный конфиг,
-- который клиент сидит upsert'ами под любым учителем; после закрытия свободной
-- регистрации authenticated = только приглашённые учителя.

-- ── lessons: через владельца курса ────────────────────────────────────────────
drop policy if exists write_auth_lessons on public.lessons;
create policy lessons_owner_all on public.lessons
  for all to authenticated
  using (public.is_admin()
    or exists (select 1 from public.courses c
               where c.id = lessons.course_id and c.created_by = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.courses c
               where c.id = lessons.course_id and c.created_by = auth.uid()));

-- ── schedule: через владельца группы ──────────────────────────────────────────
drop policy if exists "write schedule" on public.schedule;
create policy schedule_owner_all on public.schedule
  for all to authenticated
  using (public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = schedule.group_id and g.created_by = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = schedule.group_id and g.created_by = auth.uid()));

-- ── schedule_lessons: group-скоуп ИЛИ student-скоуп (персональные уроки) ──────
drop policy if exists write_auth_schedule_lessons on public.schedule_lessons;
create policy schedule_lessons_owner_all on public.schedule_lessons
  for all to authenticated
  using (public.is_admin()
    or (group_id is not null and exists (select 1 from public.groups g
          where g.id = schedule_lessons.group_id and g.created_by = auth.uid()))
    or (student_id is not null and exists (select 1 from public.students s
          join public.groups g on g.id = s.group_id
          where s.id = schedule_lessons.student_id and g.created_by = auth.uid())))
  with check (public.is_admin()
    or (group_id is not null and exists (select 1 from public.groups g
          where g.id = schedule_lessons.group_id and g.created_by = auth.uid()))
    or (student_id is not null and exists (select 1 from public.students s
          join public.groups g on g.id = s.group_id
          where s.id = schedule_lessons.student_id and g.created_by = auth.uid())));

-- ── task_bank: персональное владение; 149 сид-строк без владельца — админу ────
update public.task_bank
   set created_by = '84fe210b-677d-41e2-a3d9-74021390c0c2' -- dillatt (админ)
 where created_by is null;
alter table public.task_bank alter column created_by set default auth.uid();
drop policy if exists write_auth_task_bank on public.task_bank;
create policy task_bank_insert on public.task_bank for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());
create policy task_bank_update on public.task_bank for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy task_bank_delete on public.task_bank for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ── trainers + trainer_questions: владелец тренажёра ──────────────────────────
alter table public.trainers alter column created_by set default auth.uid();
drop policy if exists write_auth_trainers on public.trainers;
create policy trainers_insert on public.trainers for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());
create policy trainers_update on public.trainers for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy trainers_delete on public.trainers for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists write_auth_trainer_questions on public.trainer_questions;
create policy trainer_questions_owner_all on public.trainer_questions
  for all to authenticated
  using (public.is_admin()
    or exists (select 1 from public.trainers t
               where t.id = trainer_questions.trainer_id and t.created_by = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.trainers t
               where t.id = trainer_questions.trainer_id and t.created_by = auth.uid()));
