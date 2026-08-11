-- Стикер за выученную стопку фраз
--
-- ЗАЧЕМ ОТДЕЛЬНАЯ ТАБЛИЦА. Коллекция стикеров до сих пор ВЫВОДИЛАСЬ из проверки
-- сложных заданий (lesson_progress.review_attachments): своего хранилища у
-- стикеров нет, и это работало, пока источник был один. У стопки такого следа в
-- базе нет — прогон живёт в review_cards как расписание повторений, а факт
-- «тема закрыта без единого промаха» нигде не фиксируется. Держать его в
-- localStorage нельзя: награда пропадёт при заходе с телефона и при чистке кэша.
--
-- UNIQUE (student_id, deck_key) — это и есть правило «один раз на тему». Стопку
-- можно перепройти сколько угодно раз, и без ограничения на уровне БД стикеры
-- фармились бы одним и тем же чистым прогоном; проверка в коде от гонки двух
-- вкладок не спасает, а уникальный индекс спасает.

create table if not exists public.deck_stickers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  -- Ключ стопки: 'sv:<книга>:<тема>'. Направление показа (прямое/обратное) в
  -- ключ НЕ входит — это один и тот же материал, и обратный прогон не должен
  -- выдавать второй стикер за ту же тему.
  deck_key text not null,
  deck_title text not null default '',
  subject text,
  score smallint not null check (score between 1 and 5),
  -- Размер стопки на момент выдачи: из него посчитан балл, и по нему видно,
  -- за что стикер, даже если тема потом выросла.
  cards smallint not null default 0,
  earned_at timestamptz not null default now(),
  unique (student_id, deck_key)
);

create index if not exists deck_stickers_student_idx
  on public.deck_stickers (student_id, earned_at desc);

alter table public.deck_stickers enable row level security;

-- Политики слово в слово повторяют lesson_progress (0034): аноним — только
-- строки legacy-учеников, авторизованный — свои плюс своих учеников (учитель
-- заходит через groups.created_by), админ — всё.
drop policy if exists anon_insert_ds on public.deck_stickers;
drop policy if exists anon_select_ds on public.deck_stickers;
create policy anon_insert_ds on public.deck_stickers for insert to anon
  with check (public.is_legacy_student(student_id));
create policy anon_select_ds on public.deck_stickers for select to anon
  using (public.is_legacy_student(student_id));

drop policy if exists auth_insert_ds on public.deck_stickers;
drop policy if exists auth_select_ds on public.deck_stickers;
create policy auth_select_ds on public.deck_stickers for select to authenticated
  using (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = deck_stickers.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))));
create policy auth_insert_ds on public.deck_stickers for insert to authenticated
  with check (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = deck_stickers.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))));

-- UPDATE/DELETE не заводим сознательно: выданный стикер не редактируется и не
-- отзывается. Понадобится ручная правка — она идёт через сервисный ключ.
