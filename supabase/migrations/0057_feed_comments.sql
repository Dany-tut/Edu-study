-- Комментарии под материалами ленты
--
-- ЗАЧЕМ. Лента отличается от «Текстов» и «Сцен» тем, что она про сегодня — а
-- про сегодня хочется сказать вслух. Обсуждение новости на изучаемом языке
-- (или о нём) — это и есть та причина возвращаться, ради которой лента вообще
-- заводилась.
--
-- ГЛАВНОЕ РЕШЕНИЕ: ВИДИМОСТЬ ОГРАНИЧЕНА ГРУППОЙ, А НЕ ПЛАТФОРМОЙ
--
-- Соблазн сделать «как в соцсети» — общий тред на всю платформу. Так делать
-- нельзя, и не из осторожности: платформа многопользовательская (у каждого
-- учителя свои ученики, см. 0033-0037) и работает с ДЕТЬМИ. Общий тред
-- означает, что двенадцатилетний ученик одного учителя пишет двенадцатилетнему
-- ученику другого, и модерировать это некому — учитель видит только своих.
--
-- Поэтому область видимости — ГРУППА: одноклассники и их учитель. Для ученика
-- это ровно та лента, которая ему нужна («что написали наши»), а у каждого
-- треда есть взрослый, который за него отвечает.
--
-- ОТВЕТЫ — ОДИН УРОВЕНЬ. parent_id есть, но ветка от ветки не растёт: в
-- обсуждении на пятнадцать реплик третий уровень читается хуже плоского
-- списка, а модерировать его вдвое дороже.
--
-- ПИСАТЬ САМИМ (свои материалы в ленту) — это НЕ здесь. Здесь только реплики
-- под тем, что уже есть; свои посты потребуют своей таблицы и своей проверки
-- перед публикацией.
--
-- УДАЛЕНИЕ. Строки не выпиливаем, а гасим (hidden): удалённая реплика посреди
-- разговора превращает ответы на неё в бессмыслицу, а учителю нужно видеть,
-- что именно он скрыл.

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  -- id материала ленты (src/data/feed/*). Текст, а не ссылка: материалы лежат
  -- в коде, и внешнего ключа на них быть не может.
  item_id text not null,
  lang text not null default '',
  -- Область видимости. Без группы комментарий не виден никому, кроме автора:
  -- это осознанный тупик, а не дыра — писать «в никуда» нельзя.
  group_id uuid references public.groups(id) on delete cascade,
  -- Автор: ученик ИЛИ пользователь (учитель, админ). Ровно один из двух.
  student_id uuid references public.students(id) on delete cascade,
  author_user uuid,
  -- Имя на момент написания: ученика могут переименовать или удалить, а
  -- подпись под репликой должна остаться той же.
  author_name text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  -- Ответ на реплику. Второго уровня вложенности не предусмотрено.
  parent_id uuid references public.feed_comments(id) on delete cascade,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint feed_comments_author_ck check (
    (student_id is not null and author_user is null)
    or (student_id is null and author_user is not null)
  )
);

create index if not exists feed_comments_item_idx
  on public.feed_comments (item_id, group_id, created_at);

create index if not exists feed_comments_group_idx
  on public.feed_comments (group_id, created_at desc);

alter table public.feed_comments enable row level security;

-- ── Политики ────────────────────────────────────────────────────────────────
--
-- Повторяют схему lesson_progress (0034) и deck_stickers (0055): аноним — это
-- legacy-ученик без своего auth-пользователя, авторизованный — свои строки,
-- строки своих учеников (учитель через groups.created_by) и всё у админа.

drop policy if exists anon_select_fc on public.feed_comments;
drop policy if exists anon_insert_fc on public.feed_comments;

-- Аноним видит НЕ свои строки, а строки СВОЕЙ ГРУППЫ: в этом весь смысл
-- обсуждения. Скрытые реплики не показываем никому, кроме учителя.
create policy anon_select_fc on public.feed_comments for select to anon
  using (
    hidden = false
    and group_id is not null
    and exists (
      select 1 from public.students s
      where s.group_id = feed_comments.group_id
        and public.is_legacy_student(s.id)
    )
  );
create policy anon_insert_fc on public.feed_comments for insert to anon
  with check (
    student_id is not null
    and public.is_legacy_student(student_id)
    and exists (select 1 from public.students s
                where s.id = feed_comments.student_id
                  and s.group_id = feed_comments.group_id)
  );

drop policy if exists auth_select_fc on public.feed_comments;
drop policy if exists auth_insert_fc on public.feed_comments;
drop policy if exists auth_update_fc on public.feed_comments;
drop policy if exists auth_delete_fc on public.feed_comments;

create policy auth_select_fc on public.feed_comments for select to authenticated
  using (
    public.is_admin()
    -- Учитель видит всё в своих группах, включая скрытое: он и модератор.
    or exists (select 1 from public.groups g
               where g.id = feed_comments.group_id and g.created_by = auth.uid())
    -- Ученик — незакрытые реплики своей группы.
    or (hidden = false and exists (
          select 1 from public.students s
          where s.group_id = feed_comments.group_id and s.auth_user_id = auth.uid()))
  );

create policy auth_insert_fc on public.feed_comments for insert to authenticated
  with check (
    public.is_admin()
    or (author_user = auth.uid()
        and exists (select 1 from public.groups g
                    where g.id = feed_comments.group_id and g.created_by = auth.uid()))
    or (student_id is not null and exists (
          select 1 from public.students s
          where s.id = feed_comments.student_id
            and s.auth_user_id = auth.uid()
            and s.group_id = feed_comments.group_id))
  );

-- Гасит реплику учитель группы или админ. Автор своё сообщение не «скрывает»,
-- а удаляет — это разные действия, и второе ниже.
create policy auth_update_fc on public.feed_comments for update to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = feed_comments.group_id and g.created_by = auth.uid())
  );

create policy auth_delete_fc on public.feed_comments for delete to authenticated
  using (
    public.is_admin()
    or author_user = auth.uid()
    or exists (select 1 from public.groups g
               where g.id = feed_comments.group_id and g.created_by = auth.uid())
    or exists (select 1 from public.students s
               where s.id = feed_comments.student_id and s.auth_user_id = auth.uid())
  );
