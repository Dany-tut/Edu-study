-- Ускорить разграничение из 0087.
--
-- ЧТО СЛОМАЛОСЬ. Политика на `lessons` звала `can_read_course(course_id)` — то
-- есть по разу НА КАЖДУЮ СТРОКУ, и каждый вызов сам делал несколько подзапросов.
-- Замер: `select ... from lessons limit 200` под ролью ученика — 252 мс. Кабинет
-- читает 1226 уроков, это уже полторы секунды на одной только проверке доступа,
-- поверх всех остальных запросов загрузки.
--
-- ПОЧЕМУ ТАК. `can_read_course(course_id)` зависит от столбца строки, поэтому
-- планировщик обязан вычислять её построчно. Функция БЕЗ аргументов такой
-- зависимости не имеет: её значение одинаково для всего запроса, и Postgres
-- считает его один раз (InitPlan), а дальше это просто проверка вхождения в
-- массив.
--
-- Поэтому список доступных курсов считается разом — `my_course_ids()` — а
-- политики сравнивают с ним. Правило доступа не меняется ни на йоту: тот же
-- предикат, что в 0087, просто вынесен из построчного контекста.
--
-- `can_read_course()` остаётся: она читается глазами и ею пользуется
-- `can_read_trainer`. На самой таблице courses построчность безобидна — там
-- 33 строки.

create or replace function public.my_course_ids()
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(c.id), '{}'::uuid[])
  from public.courses c
  where c.created_by = auth.uid()
     or exists (select 1 from public.course_shares cs
                 where cs.course_id = c.id and cs.teacher_id = auth.uid())
     or c.student_ids && public.my_student_ids()
     or c.group_ids   && public.my_group_ids()
     or exists (select 1 from public.course_enrollments e
                 where e.course_id = c.id
                   and e.student_id = any (select unnest(public.my_student_ids())::text))
     or exists (
       select 1 from public.students s
       where s.group_id = any (public.my_taught_group_ids())
         and (s.id = any (c.student_ids)
           or s.group_id = any (c.group_ids)
           or exists (select 1 from public.course_enrollments e2
                       where e2.course_id = c.id and e2.student_id = s.id::text))
     );
$$;

revoke execute on function public.my_course_ids() from public, anon;
grant execute on function public.my_course_ids() to authenticated;

drop policy if exists read_all_courses on public.courses;
create policy read_all_courses on public.courses
  for select to authenticated
  using (is_admin() or id = any (my_course_ids()));

drop policy if exists read_all_lessons on public.lessons;
create policy read_all_lessons on public.lessons
  for select to authenticated
  using (is_admin() or course_id = any (my_course_ids()));

drop policy if exists "anyone can read course_modules" on public.course_modules;
create policy "anyone can read course_modules" on public.course_modules
  for select to authenticated
  using (is_admin() or course_id = any (my_course_ids()));

drop policy if exists read_all_course_enrollments on public.course_enrollments;
create policy read_all_course_enrollments on public.course_enrollments
  for select to authenticated
  using (
    is_admin()
    or student_id = any (select unnest(my_student_ids())::text)
    or course_id = any (my_course_ids())
  );

drop policy if exists read_all_widgets on public.widgets;
create policy read_all_widgets on public.widgets
  for select to authenticated
  using (
    is_admin()
    or created_by = auth.uid()
    or exists (select 1 from lessons l
                where l.widget_id = widgets.id and l.course_id = any (my_course_ids()))
  );

create or replace function public.can_read_trainer(p_trainer uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.trainers t
    where t.id = p_trainer and (
         t.created_by = auth.uid()
      or exists (select 1 from public.lessons l
                  where l.trainer_id = t.id and l.course_id = any (public.my_course_ids()))
    )
  );
$$;
