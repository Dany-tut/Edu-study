-- Закрыть анонимный доступ «легаси-ученика».
--
-- ЧТО БЫЛО. У 26 из 32 учеников не было аккаунта: кабинет ходил в базу под
-- ролью `anon`, а двадцать политик разрешали это через `is_legacy_student()`.
-- Функция отвечает на вопрос «у этого ученика нет аккаунта?», а не «это ты?» —
-- то есть истинна для ЛЮБОГО такого ученика. Итог: с публичным ключом, который
-- лежит в бандле и виден в исходниках страницы, читались чужие ответы,
-- прогресс, уведомления и карточки. Это не теоретическая дыра: любой, кто
-- открыл сайт, мог достать данные всех учеников без аккаунта.
--
-- ПОЧЕМУ ТОЛЬКО СЕЙЧАС. Убрать политики раньше значило отрезать этим 26 доступ
-- вовсе. Сегодня (03.09.2026) `select count(*) from students where auth_user_id
-- is null` возвращает 0: 25 аккаунтов завела provision-student-account, 26-я
-- карточка (тестовая, с почтой владельца) привязана к его учётке вручную.
--
-- ПОЧЕМУ ЭТО НЕ ПРОСТО УБОРКА МЁРТВОГО КОДА. Все три функции проверяют
-- `auth_user_id is null`, поэтому прямо сейчас политики уже никого не
-- пропускают. Но карточка ученика заводится РАНЬШЕ аккаунта: как только
-- преподаватель нажмёт «+ Ученик», появится строка с пустым auth_user_id — и
-- дыра откроется снова, сама, без единой правки кода. Поэтому механизм
-- удаляется целиком, вместе с функциями, а не оставляется «спящим».
--
-- ЧТО СОХРАНЕНО. Гостевой тренажёр: присланная ссылка открывается без
-- аккаунта, и гость копит колоду. Его строки помечены `anon_name`, а не
-- student_id, поэтому у review_cards и confidence_log остаётся ровно эта
-- ветка — из условий вырезается только легаси-половина.

-- ── 1. Политики, которые существовали только ради легаси ──────────────────

drop policy if exists card_groups_write_anon on public.card_groups;
drop policy if exists card_sets_write_anon   on public.card_sets;
drop policy if exists set_cards_write_anon   on public.set_cards;

drop policy if exists anon_insert_ds on public.deck_stickers;
drop policy if exists anon_select_ds on public.deck_stickers;

drop policy if exists diag_results_select_anon on public.diag_results;
drop policy if exists groups_read_anon_legacy  on public.groups;

drop policy if exists anon_insert_lp on public.lesson_progress;
drop policy if exists anon_select_lp on public.lesson_progress;
drop policy if exists anon_update_lp on public.lesson_progress;

drop policy if exists notif_select_anon on public.notifications;
drop policy if exists notif_update_anon on public.notifications;

drop policy if exists anon_select_ta on public.test_assignments;

-- ── 2. Политики гостя: вырезать легаси-ветку, гостевую оставить ───────────

-- Стопки: свои (автор — вошедший) и общие (автора нет). Колод учеников без
-- аккаунта больше не существует.
drop policy if exists card_groups_read on public.card_groups;
create policy card_groups_read on public.card_groups
  for select to anon, authenticated
  using (
    author_student_id is null
    or exists (
      select 1 from public.students s
      where s.id = card_groups.author_student_id and s.auth_user_id = auth.uid()
    )
  );

-- Гость помечает свои строки anon_name — по нему и пускаем.
drop policy if exists confidence_log_anon_select on public.confidence_log;
create policy confidence_log_anon_select on public.confidence_log
  for select to anon using (anon_name is not null);

drop policy if exists confidence_log_anon_insert on public.confidence_log;
create policy confidence_log_anon_insert on public.confidence_log
  for insert to anon with check (anon_name is not null);

drop policy if exists review_cards_anon_select on public.review_cards;
create policy review_cards_anon_select on public.review_cards
  for select to anon using (anon_name is not null);

drop policy if exists review_cards_anon_insert on public.review_cards;
create policy review_cards_anon_insert on public.review_cards
  for insert to anon with check (anon_name is not null);

drop policy if exists review_cards_anon_update on public.review_cards;
create policy review_cards_anon_update on public.review_cards
  for update to anon using (anon_name is not null) with check (anon_name is not null);

drop policy if exists review_cards_anon_delete on public.review_cards;
create policy review_cards_anon_delete on public.review_cards
  for delete to anon using (anon_name is not null);

-- ── 3. Сами функции ──────────────────────────────────────────────────────
-- Удаляются последними: пока на них ссылалась хоть одна политика, Postgres
-- не дал бы их убрать. Дойти сюда — и есть доказательство, что ссылок нет.

drop function if exists public.is_legacy_student(uuid);
drop function if exists public.is_legacy_student_text(text);
drop function if exists public.group_has_legacy_student(uuid);

-- ── 4. Вход по паролю в открытом виде ────────────────────────────────────
--
-- `student_login(email, password)` сравнивала `temp_password = p_password`
-- прямым равенством и была доступна анониму: перебор пароля не стоил ничего,
-- ни хеша, ни ограничения попыток. Держали её ради тех же 26 — в
-- StudentLoginPage она стояла запасным путём, если обычная авторизация не
-- прошла. Теперь у всех есть настоящий аккаунт с тем же логином и паролем,
-- поэтому обычный путь срабатывает первым и всегда.
--
-- Столбец students.temp_password остаётся: преподаватель должен видеть пароль
-- ученика, чтобы продиктовать его заново. Это осознанное решение владельца
-- (28.08.2026), и от удаления функции оно не меняется — пароль теперь просто
-- нигде не сравнивается запросом из браузера.

drop function if exists public.student_login(text, text);
