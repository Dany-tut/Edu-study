-- Заставить проверку доступа считаться ОДИН раз на запрос, а не на строку.
--
-- 0088 вынес список доступных курсов в функцию без аргументов, рассчитывая,
-- что Postgres вычислит её однажды. Не вычислил: `STABLE` разрешает кэширование,
-- но не обязывает планировщик выносить вызов из фильтра, и в плане он остался
-- построчным. Замер стал ХУЖЕ, а не лучше: `select * from lessons` под ролью
-- ученика — 8915 мс на 1226 строк (до 0088 было 252 мс на 200).
--
-- Выносит вызов из построчного контекста только обёртка подзапросом: `in
-- (select unnest(my_course_ids()))` становится hashed SubPlan, а `(select
-- is_admin())` — InitPlan, и оба считаются по разу. После этой миграции тот же
-- запрос — 130 мс, строк по-прежнему 1226.
--
-- Первая попытка обернуть как `= any ((select my_course_ids()))` не прошла:
-- подзапрос возвращает МАССИВ одной строкой, а `any` ждёт множество строк —
-- `operator does not exist: uuid = uuid[]`. Отсюда `unnest`.
--
-- Правила доступа те же, что в 0087. Меняется только форма записи.

drop policy if exists read_all_courses on public.courses;
create policy read_all_courses on public.courses
  for select to authenticated
  using ((select is_admin()) or id in (select unnest(my_course_ids())));

drop policy if exists read_all_lessons on public.lessons;
create policy read_all_lessons on public.lessons
  for select to authenticated
  using ((select is_admin()) or course_id in (select unnest(my_course_ids())));

drop policy if exists "anyone can read course_modules" on public.course_modules;
create policy "anyone can read course_modules" on public.course_modules
  for select to authenticated
  using ((select is_admin()) or course_id in (select unnest(my_course_ids())));

drop policy if exists read_all_course_enrollments on public.course_enrollments;
create policy read_all_course_enrollments on public.course_enrollments
  for select to authenticated
  using (
    (select is_admin())
    or student_id in (select unnest(my_student_ids())::text)
    or course_id in (select unnest(my_course_ids()))
  );

drop policy if exists "read homework" on public.homework;
create policy "read homework" on public.homework
  for select to authenticated
  using (
    (select is_admin())
    or created_by = (select auth.uid())
    or group_id in (select unnest(my_group_ids()))
    or group_id in (select unnest(my_taught_group_ids()))
  );

drop policy if exists read_all_schedule_lessons on public.schedule_lessons;
create policy read_all_schedule_lessons on public.schedule_lessons
  for select to authenticated
  using (
    (select is_admin())
    or group_id in (select unnest(my_group_ids()))
    or group_id in (select unnest(my_taught_group_ids()))
    or student_id in (select unnest(my_student_ids()))
  );

drop policy if exists "read schedule" on public.schedule;
create policy "read schedule" on public.schedule
  for select to authenticated
  using (
    (select is_admin())
    or group_id in (select unnest(my_group_ids()))
    or group_id in (select unnest(my_taught_group_ids()))
  );

drop policy if exists read_all_widgets on public.widgets;
create policy read_all_widgets on public.widgets
  for select to authenticated
  using (
    (select is_admin())
    or created_by = (select auth.uid())
    or exists (select 1 from lessons l
                where l.widget_id = widgets.id and l.course_id in (select unnest(my_course_ids())))
  );

drop policy if exists read_all_trainers on public.trainers;
create policy read_all_trainers on public.trainers
  for select to authenticated
  using ((select is_admin()) or created_by = (select auth.uid())
    or exists (select 1 from lessons l
                where l.trainer_id = trainers.id and l.course_id in (select unnest(my_course_ids()))));

drop policy if exists read_all_trainer_questions on public.trainer_questions;
create policy read_all_trainer_questions on public.trainer_questions
  for select to authenticated
  using ((select is_admin()) or exists (
    select 1 from trainers t where t.id = trainer_questions.trainer_id
      and (t.created_by = (select auth.uid())
        or exists (select 1 from lessons l where l.trainer_id = t.id and l.course_id in (select unnest(my_course_ids()))))));

drop policy if exists read_all_course_shares on public.course_shares;
create policy read_all_course_shares on public.course_shares
  for select to authenticated
  using (
    (select is_admin())
    or teacher_id = (select auth.uid())
    or exists (select 1 from courses c where c.id = course_shares.course_id and c.created_by = (select auth.uid()))
  );
