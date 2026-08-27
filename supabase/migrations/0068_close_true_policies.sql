-- Политики, написанные как `true`, — ревизия 26.08.2026.
--
-- ЧТО НАШЛОСЬ. Advisors по проекту не показывают ни одной ошибки: RLS включён
-- везде, политики есть у всех таблиц. Дыры не в отсутствии политик, а в их
-- содержании — половина написана как `USING (true) WITH CHECK (true)` для роли
-- `authenticated`. А `authenticated` — это не только учитель: ученик с
-- аккаунтом ровно та же роль (в profiles у четверых стоит role='student').
-- То есть ученик мог переписать программу по предмету, конфиг когнитивного
-- скрининга и банк диагностических вопросов. Проверено запросом с публичным
-- ключом из бандла: `diag_results` отдавала анониму имя человека и полные
-- результаты скрининга, `review_cards` — 251 карточку всех учеников разом.
--
-- ЧТО ЗДЕСЬ ЧИНИТСЯ. Всё, что можно закрыть, НЕ ТРОГАЯ легаси-учеников: у 26
-- из 32 нет аккаунта, они ходят под ролью `anon`, и их пути чтения (курсы,
-- уроки, домашки, прогресс) остаются как были. Это отдельная работа — переезд
-- на аккаунты, — и мешать её с этой миграцией нельзя.
--
-- ЧЕГО ЗДЕСЬ НЕТ НАМЕРЕННО:
--   • публичного чтения courses/lessons/homework/schedule_lessons — по ним
--     кабинет легаси-ученика и живёт;
--   • revoke на is_admin_user: она стоит ВНУТРИ политики task_bank_read для
--     роли public, и без EXECUTE у anon эта политика развалится (см. 0059).

-- ── Кто такой «сотрудник» ────────────────────────────────────────────────────
--
-- is_admin() читает app_metadata из JWT и в таблицы не ходит. Учитель так не
-- определяется: его роль лежит в profiles.role. SECURITY DEFINER — потому что
-- политика на самой profiles пускает только к своей строке, и обычный подзапрос
-- из другой политики читался бы через неё же.
--
-- Ученик сюда не попадает: у него profiles.role='student'. У кого строки в
-- profiles нет вовсе — тоже false, и это правильный ответ по умолчанию.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('teacher', 'admin')
  );
$$;

-- Отзыв и у PUBLIC, и у anon отдельно: у Supabase на роль anon стоит грант по
-- умолчанию (alter default privileges), и revoke только с PUBLIC его не снимает.
-- Утечки в этом нет и без отзыва — у анонима auth.uid() пуст, функция всегда
-- вернёт false, — но пусть право совпадает с замыслом.
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Легаси-ученик по ТЕКСТОВОМУ id.
--
-- В review_cards и confidence_log владелец лежит в text-колонке: там бывает и
-- uuid ученика, и имя гостя, который проходил диагностику без аккаунта.
-- Приводить такое к uuid напрямую нельзя — первая же строка с именем уронила бы
-- политику. CASE, а не `and`: он гарантирует порядок вычисления, а у AND
-- планировщик волен посчитать обе стороны.
create or replace function public.is_legacy_student_text(p text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then exists (select 1 from public.students s where s.id = p::uuid and s.auth_user_id is null)
    else false
  end;
$$;

grant execute on function public.is_legacy_student_text(text) to anon, authenticated;

-- ── Общие справочники: писать может персонал, а не любой вошедший ────────────
--
-- Таксономия предметов, конфиг скрининга, банк диагностических вопросов и
-- список тестов — данные ОБЩИЕ по замыслу: первый учитель заводит структуру,
-- остальные ею пользуются (см. curriculumStore.load — он же и засевает пустую
-- таблицу). Общее ≠ ничьё: писать в них должен персонал.

drop policy if exists "write_auth_curriculum" on public.curriculum;
create policy curriculum_write_staff on public.curriculum
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "write_auth_widgets" on public.widgets;
create policy widgets_write_staff on public.widgets
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "auth_insert" on public.screening_config;
drop policy if exists "auth_update" on public.screening_config;
drop policy if exists "auth_delete" on public.screening_config;
create policy screening_config_write_staff on public.screening_config
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "auth_insert" on public.diag_questions;
drop policy if exists "auth_update" on public.diag_questions;
drop policy if exists "auth_delete" on public.diag_questions;
create policy diag_questions_write_staff on public.diag_questions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "cdt_auth_insert" on public.custom_diag_tests;
drop policy if exists "cdt_auth_update" on public.custom_diag_tests;
drop policy if exists "cdt_auth_delete" on public.custom_diag_tests;
create policy custom_diag_tests_write_staff on public.custom_diag_tests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Модули курса: как уроки, по владельцу курса ──────────────────────────────
--
-- Было `profiles.role = 'teacher'` без всякой привязки к курсу: любой учитель
-- правил модули ЛЮБОГО чужого курса. Уроки того же курса при этом скоуплены по
-- владельцу (lessons_owner_all) — политика просто отстала от соседней.
drop policy if exists "teachers can manage course_modules" on public.course_modules;
create policy course_modules_owner_all on public.course_modules
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.created_by = auth.uid())
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.created_by = auth.uid())
  );

-- ── Результаты диагностики ───────────────────────────────────────────────────
--
-- Самые чувствительные данные в базе: имя человека и полная раскладка
-- когнитивной батареи. Читались анонимом целиком.
--
-- Вставку оставляем открытой намеренно: диагностика — это публичная воронка,
-- её проходят с лендинга до всякого аккаунта (#/diagnostic).
--
-- Аноним оставляет себе ровно один сценарий: кабинет легаси-ученика
-- спрашивает, сдан ли назначенный тест (checkAssignmentSubmitted). Ему нужны
-- строки, привязанные к ученику, — а вся анонимная воронка с именами из выдачи
-- уходит.
drop policy if exists "diag_results_select" on public.diag_results;
drop policy if exists "diag_results_update" on public.diag_results;
drop policy if exists "diag_results_delete" on public.diag_results;

create policy diag_results_select_anon on public.diag_results
  for select to anon
  using (student_id is not null and public.is_legacy_student(student_id));

create policy diag_results_select_auth on public.diag_results
  for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.students s
      where s.auth_user_id = auth.uid()
        and (s.id = diag_results.student_id or s.id = diag_results.linked_student_id))
  );

create policy diag_results_write_staff on public.diag_results
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy diag_results_delete_staff on public.diag_results
  for delete to authenticated using (public.is_staff());

-- ── Колода повторений и журнал уверенности ───────────────────────────────────
--
-- Обе таблицы отдавали аноним-ключу всё содержимое и принимали от него любую
-- правку. Владелец в них — либо ученик (uuid в text-колонке), либо имя гостя,
-- проходившего диагностику без аккаунта; гостевые строки так и остаются
-- общедоступными — секрета в них нет и запереть их не за что.
drop policy if exists "anon_read" on public.review_cards;
drop policy if exists "anon_insert" on public.review_cards;
drop policy if exists "anon_update" on public.review_cards;
drop policy if exists "auth_all" on public.review_cards;

-- Команды перечислены поимённо, а не одним FOR ALL: у анонима сейчас есть
-- select/insert/update, и FOR ALL молча выдал бы ему ещё и delete на всё.
create policy review_cards_anon_select on public.review_cards
  for select to anon
  using (anon_name is not null or public.is_legacy_student_text(student_id));

create policy review_cards_anon_insert on public.review_cards
  for insert to anon
  with check (anon_name is not null or public.is_legacy_student_text(student_id));

create policy review_cards_anon_update on public.review_cards
  for update to anon
  using (anon_name is not null or public.is_legacy_student_text(student_id))
  with check (anon_name is not null or public.is_legacy_student_text(student_id));

-- DELETE анониму РАЗРЕШАЕТСЯ — и это не расширение прав, а починка.
-- «Убрать слово насовсем» в тренажёре (forgetCard) у легаси-ученика не
-- работало вовсе: политики delete у anon не было, RLS удалял ноль строк без
-- ошибки, и функция возвращала успех. Экран убирал слово оптимистично, а после
-- перезагрузки оно возвращалось. Теперь удаление разрешено ровно на своих
-- строках.
create policy review_cards_anon_delete on public.review_cards
  for delete to anon
  using (anon_name is not null or public.is_legacy_student_text(student_id));

create policy review_cards_auth on public.review_cards
  for all to authenticated
  using (
    public.is_staff() or anon_name is not null or exists (
      select 1 from public.students s
      where s.id::text = review_cards.student_id and s.auth_user_id = auth.uid())
  )
  with check (
    public.is_staff() or anon_name is not null or exists (
      select 1 from public.students s
      where s.id::text = review_cards.student_id and s.auth_user_id = auth.uid())
  );

drop policy if exists "anon_read" on public.confidence_log;
drop policy if exists "anon_insert" on public.confidence_log;
drop policy if exists "auth_all" on public.confidence_log;

-- Журнал уверенности аноним только пишет (публичная диагностика) и читает
-- свой: update и delete ему не нужны ни в одном сценарии.
create policy confidence_log_anon_select on public.confidence_log
  for select to anon
  using (anon_name is not null or public.is_legacy_student_text(student_id));

create policy confidence_log_anon_insert on public.confidence_log
  for insert to anon
  with check (anon_name is not null or public.is_legacy_student_text(student_id));

create policy confidence_log_auth on public.confidence_log
  for all to authenticated
  using (
    public.is_staff() or anon_name is not null or exists (
      select 1 from public.students s
      where s.id::text = confidence_log.student_id and s.auth_user_id = auth.uid())
  )
  with check (
    public.is_staff() or anon_name is not null or exists (
      select 1 from public.students s
      where s.id::text = confidence_log.student_id and s.auth_user_id = auth.uid())
  );

-- ── Хранилище: картинки заданий ──────────────────────────────────────────────
--
-- У бакета task-images право ALL стояло на весь bucket без проверки владельца:
-- любой вошедший — включая ученика — мог удалить картинки чужих заданий.
-- Чтение остаётся публичным: бакет публичный по замыслу, ссылки лежат в
-- заданиях.
drop policy if exists "write task-images" on storage.objects;
create policy "write task-images" on storage.objects
  for all to authenticated
  using (bucket_id = 'task-images' and owner = auth.uid())
  with check (bucket_id = 'task-images' and owner = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- ОТКАТ
--
-- Снят из pg_policies ПЕРЕД применением — то есть возвращает ровно то, что
-- было, а не то, что помнит автор. Лежит закомментированным прямо здесь, а не
-- отдельным файлом в migrations/: файл в этой папке рано или поздно кто-нибудь
-- применит `db push`. Нужен откат — раскомментировать и выполнить.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- drop policy if exists curriculum_write_staff on public.curriculum;
-- drop policy if exists widgets_write_staff on public.widgets;
-- drop policy if exists screening_config_write_staff on public.screening_config;
-- drop policy if exists diag_questions_write_staff on public.diag_questions;
-- drop policy if exists custom_diag_tests_write_staff on public.custom_diag_tests;
-- drop policy if exists course_modules_owner_all on public.course_modules;
-- drop policy if exists diag_results_select_anon on public.diag_results;
-- drop policy if exists diag_results_select_auth on public.diag_results;
-- drop policy if exists diag_results_write_staff on public.diag_results;
-- drop policy if exists diag_results_delete_staff on public.diag_results;
-- drop policy if exists review_cards_anon_select on public.review_cards;
-- drop policy if exists review_cards_anon_insert on public.review_cards;
-- drop policy if exists review_cards_anon_update on public.review_cards;
-- drop policy if exists review_cards_anon_delete on public.review_cards;
-- drop policy if exists review_cards_auth on public.review_cards;
-- drop policy if exists confidence_log_anon_select on public.confidence_log;
-- drop policy if exists confidence_log_anon_insert on public.confidence_log;
-- drop policy if exists confidence_log_auth on public.confidence_log;
--
-- create policy anon_insert on public.confidence_log for insert to anon with check (true);
-- create policy anon_read on public.confidence_log for select to anon using (true);
-- create policy auth_all on public.confidence_log for all to authenticated using (true) with check (true);
-- create policy "teachers can manage course_modules" on public.course_modules for all to authenticated
--   using (((select profiles.role from profiles where (profiles.id = auth.uid())) = 'teacher'::text))
--   with check (((select profiles.role from profiles where (profiles.id = auth.uid())) = 'teacher'::text));
-- create policy write_auth_curriculum on public.curriculum for all to authenticated using (true) with check (true);
-- create policy cdt_auth_delete on public.custom_diag_tests for delete to authenticated using (true);
-- create policy cdt_auth_insert on public.custom_diag_tests for insert to authenticated with check (true);
-- create policy cdt_auth_update on public.custom_diag_tests for update to authenticated using (true) with check (true);
-- create policy auth_delete on public.diag_questions for delete to authenticated using (true);
-- create policy auth_insert on public.diag_questions for insert to authenticated with check (true);
-- create policy auth_update on public.diag_questions for update to authenticated using (true) with check (true);
-- create policy diag_results_delete on public.diag_results for delete to authenticated using (true);
-- create policy diag_results_select on public.diag_results for select to anon, authenticated using (true);
-- create policy diag_results_update on public.diag_results for update to authenticated using (true) with check (true);
-- create policy anon_insert on public.review_cards for insert to anon with check (true);
-- create policy anon_read on public.review_cards for select to anon using (true);
-- create policy anon_update on public.review_cards for update to anon using (true) with check (true);
-- create policy auth_all on public.review_cards for all to authenticated using (true) with check (true);
-- create policy auth_delete on public.screening_config for delete to authenticated using (true);
-- create policy auth_insert on public.screening_config for insert to authenticated with check (true);
-- create policy auth_update on public.screening_config for update to authenticated using (true) with check (true);
-- create policy write_auth_widgets on public.widgets for all to authenticated using (true) with check (true);
-- create policy "write task-images" on storage.objects for all to authenticated
--   using (bucket_id = 'task-images') with check (bucket_id = 'task-images');
