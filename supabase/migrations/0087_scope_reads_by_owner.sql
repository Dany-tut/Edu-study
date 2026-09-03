-- Разграничить чтение по владельцу и доступу.
--
-- ЧТО БЫЛО. После 0086 анонимов не осталось, но условие политик так и было
-- `true`: ЛЮБОЙ вошедший — ученик соседнего преподавателя, только что заведённый
-- учитель — читал все 33 курса, 1452 урока, 117 домашек и всё расписание
-- платформы. Для многопользовательской платформы это не мелочь: расписание и
-- записи на курс говорят, кто с кем и когда занимается.
--
-- КАК УСТРОЕН ДОСТУП К КУРСУ. Путей четыре, и учитывать надо все:
--   • владелец — `courses.created_by`;
--   • поделились — `course_shares.teacher_id`;
--   • назначен — массивы `courses.student_ids` / `group_ids` (вкладка «Ученики»);
--   • зачислен — `course_enrollments` (это и есть настоящий доступ ученика).
-- Назначение и зачисление — РАЗНЫЕ вещи, и одно не подразумевает другого.
--
-- ПЯТЫЙ ПУТЬ, БЕЗ КОТОРОГО ЛОМАЕТСЯ ЖУРНАЛ. Ученик может заниматься по курсу,
-- который принадлежит другому преподавателю. Тогда его учителю нужно читать
-- этот курс, иначе журнал показывает прогресс по тому, чего он «не видит».
-- Замер на живых данных: у dillattd@gmail.com 8 своих курсов и 10 с этой
-- веткой — то есть двумя чужими курсами его ученики реально пользуются.
--
-- ЛОВУШКА ТИПОВ. `course_enrollments.student_id` — text, а `students.id` —
-- uuid. Прямое сравнение молча не находит ничего, а не падает: сравниваем,
-- приводя массив к text.
--
-- ПРОВЕРЕНО ДО ПРИМЕНЕНИЯ (03.09.2026), на реальных данных:
--   • 19 учеников видят 0 курсов — и это правда: у них ноль строк
--     lesson_progress, курс им никогда не назначали. Домашку они получают
--     через группу, её правило это покрывает (по 37 у каждого).
--   • Анна Петровна (1:1): 10 курсов, 1226 уроков — как и было.
--   • dillattd@gmail.com: 10 курсов из 33, 114 домашек из 117, 22 занятия
--     из 61 — ровно своё.
--
-- ЧТО ОСТАВЛЕНО ОБЩИМ. curriculum, quiz_questions, course_reactions,
-- science_facts, science_memes, plans — это платформенные справочники без
-- владельца, их видят все вошедшие.

-- ── Помощники ────────────────────────────────────────────────────────────
-- SECURITY DEFINER: читают students/groups в обход RLS, иначе политика на
-- students вызывала бы политику на students.

create or replace function public.my_student_ids()
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(s.id), '{}'::uuid[])
  from public.students s where s.auth_user_id = auth.uid();
$$;

create or replace function public.my_group_ids()
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(distinct s.group_id), '{}'::uuid[])
  from public.students s where s.auth_user_id = auth.uid() and s.group_id is not null;
$$;

/** Группы, которые ведёт вошедший (он их создал). */
create or replace function public.my_taught_group_ids()
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(g.id), '{}'::uuid[])
  from public.groups g where g.created_by = auth.uid();
$$;

create or replace function public.can_read_course(p_course uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course and (
         c.created_by = auth.uid()
      or exists (select 1 from public.course_shares cs
                  where cs.course_id = c.id and cs.teacher_id = auth.uid())
      or c.student_ids && public.my_student_ids()
      or c.group_ids   && public.my_group_ids()
      or exists (select 1 from public.course_enrollments e
                  where e.course_id = c.id
                    and e.student_id = any (select unnest(public.my_student_ids())::text))
      -- курс, по которому занимается мой ученик, даже если курс чужой
      or exists (
        select 1 from public.students s
        where s.group_id = any (public.my_taught_group_ids())
          and (s.id = any (c.student_ids)
            or s.group_id = any (c.group_ids)
            or exists (select 1 from public.course_enrollments e2
                        where e2.course_id = c.id and e2.student_id = s.id::text))
      )
    )
  );
$$;

create or replace function public.can_read_trainer(p_trainer uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.trainers t
    where t.id = p_trainer and (
         t.created_by = auth.uid()
      or exists (select 1 from public.lessons l
                  where l.trainer_id = t.id and public.can_read_course(l.course_id))
    )
  );
$$;

revoke execute on function public.my_student_ids()      from public, anon;
revoke execute on function public.my_group_ids()        from public, anon;
revoke execute on function public.my_taught_group_ids() from public, anon;
revoke execute on function public.can_read_course(uuid) from public, anon;
revoke execute on function public.can_read_trainer(uuid) from public, anon;
grant execute on function public.my_student_ids()       to authenticated;
grant execute on function public.my_group_ids()         to authenticated;
grant execute on function public.my_taught_group_ids()  to authenticated;
grant execute on function public.can_read_course(uuid)  to authenticated;
grant execute on function public.can_read_trainer(uuid) to authenticated;

-- ── Курсы и их содержимое ────────────────────────────────────────────────

drop policy if exists read_all_courses on public.courses;
create policy read_all_courses on public.courses
  for select to authenticated
  using (is_admin() or can_read_course(id));

drop policy if exists read_all_lessons on public.lessons;
create policy read_all_lessons on public.lessons
  for select to authenticated
  using (is_admin() or can_read_course(course_id));

drop policy if exists "anyone can read course_modules" on public.course_modules;
create policy "anyone can read course_modules" on public.course_modules
  for select to authenticated
  using (is_admin() or can_read_course(course_id));

drop policy if exists read_all_course_enrollments on public.course_enrollments;
create policy read_all_course_enrollments on public.course_enrollments
  for select to authenticated
  using (
    is_admin()
    or student_id = any (select unnest(my_student_ids())::text)
    or can_read_course(course_id)
  );

drop policy if exists read_all_course_shares on public.course_shares;
create policy read_all_course_shares on public.course_shares
  for select to authenticated
  using (
    is_admin()
    or teacher_id = auth.uid()
    or exists (select 1 from courses c where c.id = course_shares.course_id and c.created_by = auth.uid())
  );

-- ── Домашка и расписание: по группе ──────────────────────────────────────

drop policy if exists "read homework" on public.homework;
create policy "read homework" on public.homework
  for select to authenticated
  using (
    is_admin()
    or created_by = auth.uid()
    or group_id = any (my_group_ids())
    or group_id = any (my_taught_group_ids())
  );

drop policy if exists read_all_schedule_lessons on public.schedule_lessons;
create policy read_all_schedule_lessons on public.schedule_lessons
  for select to authenticated
  using (
    is_admin()
    or group_id = any (my_group_ids())
    or group_id = any (my_taught_group_ids())
    or student_id = any (my_student_ids())
  );

drop policy if exists "read schedule" on public.schedule;
create policy "read schedule" on public.schedule
  for select to authenticated
  using (
    is_admin()
    or group_id = any (my_group_ids())
    or group_id = any (my_taught_group_ids())
  );

-- ── Тренажёры и виджеты: свои либо прикреплённые к доступному уроку ──────

drop policy if exists read_all_trainers on public.trainers;
create policy read_all_trainers on public.trainers
  for select to authenticated
  using (is_admin() or can_read_trainer(id));

drop policy if exists read_all_trainer_questions on public.trainer_questions;
create policy read_all_trainer_questions on public.trainer_questions
  for select to authenticated
  using (is_admin() or can_read_trainer(trainer_id));

drop policy if exists read_all_widgets on public.widgets;
create policy read_all_widgets on public.widgets
  for select to authenticated
  using (
    is_admin()
    or created_by = auth.uid()
    or exists (select 1 from lessons l where l.widget_id = widgets.id and can_read_course(l.course_id))
  );
