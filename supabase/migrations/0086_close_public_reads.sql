-- Убрать анонимное чтение там, где оно не нужно.
--
-- ЧТО БЫЛО. Семнадцать таблиц отдавались роли `anon` по условию `true`:
-- courses, lessons, homework, schedule, schedule_lessons, course_enrollments и
-- прочие. Публичный ключ лежит в бандле и виден в исходниках страницы, то есть
-- любой человек с адресом сайта мог выгрузить все курсы, все домашние задания,
-- всё расписание занятий и список того, кто на какой курс записан. Расписание
-- и записи на курс — это уже персональные данные: кто, с кем и когда занимается.
--
-- ЗАЧЕМ ЭТО БЫЛО. Ученики без аккаунта ходили в базу анонимно, и другого
-- способа отдать им содержимое курса не было. Аккаунты появились у всех
-- 03.09.2026 (миграция 0085), и подпорка стала не нужна.
--
-- ПОЧЕМУ РОЛЬ МЕНЯЕТСЯ, А ПОЛИТИКА НЕ УДАЛЯЕТСЯ. У большинства этих таблиц
-- вторая политика — владельческая (`created_by = auth.uid()`). Снести чтение
-- совсем значило бы, что ученик не прочитает курс СВОЕГО учителя: он ему не
-- владелец. Поэтому `to public` (это anon + authenticated) заменяется на
-- `to authenticated` с тем же условием: для вошедших ничего не меняется,
-- анонимный доступ исчезает.
--
-- ЧТО НАМЕРЕННО ОСТАВЛЕНО АНОНИМУ:
--   • diag_questions, custom_diag_tests, screening_config — публичная
--     диагностика на `#/diagnostic`, вход в воронку без регистрации;
--   • app_flags — флаги читает тренажёр, в том числе гостевой.
-- Гостевой тренажёр и лендинг в базу не ходят вовсе: их содержимое лежит в
-- коде, а колода гостя помечена anon_name и разрешена отдельно (0085).
--
-- ПОБОЧНОЕ ДЕЙСТВИЕ. Ученик, у которого в браузере осталась старая
-- localStorage-сессия без сессии Supabase, увидит пустой кабинет и должен
-- войти заново — логином и паролем, которые есть у преподавателя. Это и есть
-- смысл изменения: без входа данных больше не отдаём.
--
-- ЧТО ЭТА МИГРАЦИЯ НЕ ДЕЛАЕТ. Условие остаётся `true`: любой ВОШЕДШИЙ
-- по-прежнему видит курсы и домашки всех преподавателей. Это отдельная
-- задача — разграничение по владельцу и записи на курс; её нельзя делать
-- вслепую, она ломает кабинет, если ошибиться в одном условии.

-- ── Таблицы, где публичное чтение было единственным для не-владельца ──────

drop policy if exists read_all_courses on public.courses;
create policy read_all_courses on public.courses
  for select to authenticated using (true);

drop policy if exists read_all_lessons on public.lessons;
create policy read_all_lessons on public.lessons
  for select to authenticated using (true);

drop policy if exists read_all_curriculum on public.curriculum;
create policy read_all_curriculum on public.curriculum
  for select to authenticated using (true);

drop policy if exists "read homework" on public.homework;
create policy "read homework" on public.homework
  for select to authenticated using (true);

drop policy if exists "read schedule" on public.schedule;
create policy "read schedule" on public.schedule
  for select to authenticated using (true);

drop policy if exists read_all_schedule_lessons on public.schedule_lessons;
create policy read_all_schedule_lessons on public.schedule_lessons
  for select to authenticated using (true);

drop policy if exists read_all_course_enrollments on public.course_enrollments;
create policy read_all_course_enrollments on public.course_enrollments
  for select to authenticated using (true);

drop policy if exists read_all_course_shares on public.course_shares;
create policy read_all_course_shares on public.course_shares
  for select to authenticated using (true);

drop policy if exists read_all_trainers on public.trainers;
create policy read_all_trainers on public.trainers
  for select to authenticated using (true);

drop policy if exists read_all_trainer_questions on public.trainer_questions;
create policy read_all_trainer_questions on public.trainer_questions
  for select to authenticated using (true);

drop policy if exists read_all_widgets on public.widgets;
create policy read_all_widgets on public.widgets
  for select to authenticated using (true);

drop policy if exists anon_select_qq on public.quiz_questions;
create policy quiz_questions_read_auth on public.quiz_questions
  for select to authenticated using (true);

drop policy if exists anon_select_cr on public.course_reactions;
create policy course_reactions_read_auth on public.course_reactions
  for select to authenticated using (true);

drop policy if exists anon_select_sf on public.science_facts;
create policy science_facts_read_auth on public.science_facts
  for select to authenticated using (true);

drop policy if exists anon_select_sm on public.science_memes;
create policy science_memes_read_auth on public.science_memes
  for select to authenticated using (true);

drop policy if exists plans_read_all on public.plans;
create policy plans_read_all on public.plans
  for select to authenticated using (true);

-- ── Здесь чтение для вошедших уже есть отдельной политикой ────────────────
-- («anyone can read course_modules» для authenticated), поэтому анонимную
-- достаточно снять.

drop policy if exists "anon can read course_modules" on public.course_modules;
