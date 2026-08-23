-- Три дыры, найденные аудитом 23.08.2026. Общая у них одна: всё это тихо —
-- ничего не падает, просто где-то не то происходит.
--
-- 1. duplicate_course вызывает КТО УГОДНО. Функция security definer, а
--    EXECUTE у неё так и остался у public: revoke стоял только на обёртке
--    admin_duplicate_course (0022). Ключ anon лежит в бандле, значит любой
--    посетитель мог скопировать ЛЮБОЙ курс на ЛЮБОГО владельца — в том числе
--    на себя, а потом прочитать копию как свою. Это обход всей изоляции
--    арендаторов (0033–0037), а не мелочь.
--
-- 2. test_assignments: RLS включён, политик НОЛЬ. То есть назначить тест
--    нельзя вообще: insert режется, select всегда пуст, и клиент об этом
--    молчал (`if (created)` без ветки else). В таблице 0 строк — за всё время
--    ни одно назначение не сохранилось.
--
-- 3. courses.student_ids дописывается чтением-и-записью на клиенте. Два
--    одновременных добавления ученика (два устройства, две вкладки) — и одно
--    молча теряется. Здесь атомарная замена на стороне БД.

-- ── 1. Прикрыть внутренние функции ───────────────────────────────────────────
--
-- Оставляем как есть те, что участвуют в самих политиках (is_admin,
-- is_admin_user, is_legacy_student, student_owns_group, group_has_legacy_student):
-- у них EXECUTE обязан быть у вызывающей роли, иначе развалится RLS.
-- Триггерным функциям грант не нужен вовсе: триггер срабатывает без проверки
-- EXECUTE у роли, которая пишет в таблицу.

revoke execute on function public.duplicate_course(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.gen_username(text)           from public, anon, authenticated;
revoke execute on function public.my_student_id()              from public, anon, authenticated;
revoke execute on function public.is_teacher()                 from public, anon, authenticated;
revoke execute on function public.primary_teacher_id()         from public, anon, authenticated;

revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.enforce_student_limit()      from public, anon, authenticated;
revoke execute on function public.sync_student_last_visit()    from public, anon, authenticated;
revoke execute on function public.notify_on_lesson_progress()  from public, anon, authenticated;
revoke execute on function public.notify_on_payment_due()      from public, anon, authenticated;
revoke execute on function public.notify_on_student_insert()   from public, anon, authenticated;
revoke execute on function public.notify_on_test_assignment()  from public, anon, authenticated;
revoke execute on function public.notify_on_test_completed()   from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()            from public, anon, authenticated;
revoke execute on function public.lock_admin_function_execute() from public, anon, authenticated;

-- Пара функций без пришпиленного search_path — предупреждение линтера и
-- реальная зацепка для подмены таблиц через search_path вызывающего.
alter function public.courses_stamp_published_at()  set search_path to 'public';
alter function public.guard_profile_access_cols()   set search_path to 'public';

-- ── 2. test_assignments: владелец и политики ─────────────────────────────────

alter table public.test_assignments
  add column if not exists created_by uuid default auth.uid();

create index if not exists test_assignments_owner_idx
  on public.test_assignments (created_by, created_at desc);

drop policy if exists auth_select_ta on public.test_assignments;
drop policy if exists auth_write_ta  on public.test_assignments;
drop policy if exists anon_select_ta on public.test_assignments;

-- Учитель — своё; ученик — то, что назначено лично ему или его группе.
create policy auth_select_ta on public.test_assignments for select to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.students s
               where s.auth_user_id = auth.uid()
                 and (s.id = any (test_assignments.student_ids)
                      or s.group_id = any (test_assignments.group_ids)))
  );

-- Пишет только автор (и админ). `for all` покрывает insert/update/delete.
create policy auth_write_ta on public.test_assignments for all to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

-- Легаси-ученик без своего auth-пользователя (27 из 33 на сегодня) — читает
-- назначения своей группы тем же способом, что и остальные таблицы 0034.
create policy anon_select_ta on public.test_assignments for select to anon
  using (
    exists (select 1 from public.students s
            where public.is_legacy_student(s.id)
              and (s.id = any (test_assignments.student_ids)
                   or s.group_id = any (test_assignments.group_ids)))
  );

-- ── 3. Атомарное добавление ученика/группы в курс ────────────────────────────
--
-- Чтение-и-запись массива на клиенте теряет параллельное добавление. Здесь
-- один statement: массив дописывается в самой БД, повтор безвреден.

create or replace function public.course_add_student(p_course uuid, p_student uuid)
returns void
language sql
security invoker
set search_path to 'public'
as $$
  update public.courses
     set student_ids = (select array(select distinct unnest(coalesce(student_ids, '{}') || p_student)))
   where id = p_course
     and not (coalesce(student_ids, '{}') @> array[p_student]);
$$;

create or replace function public.course_add_group(p_course uuid, p_group uuid)
returns void
language sql
security invoker
set search_path to 'public'
as $$
  update public.courses
     set group_ids = (select array(select distinct unnest(coalesce(group_ids, '{}') || p_group)))
   where id = p_course
     and not (coalesce(group_ids, '{}') @> array[p_group]);
$$;

-- security invoker: право на запись остаётся за RLS курса (владелец), функция
-- не даёт ничего сверх того, что уже можно сделать руками.
revoke execute on function public.course_add_student(uuid, uuid) from public, anon;
revoke execute on function public.course_add_group(uuid, uuid)   from public, anon;
grant  execute on function public.course_add_student(uuid, uuid) to authenticated;
grant  execute on function public.course_add_group(uuid, uuid)   to authenticated;
