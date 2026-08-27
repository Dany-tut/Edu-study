-- Группы и наборы карточек: своя витрина поверх колоды повторений
--
-- ЗАЧЕМ. В тренажёре уже три источника стопок, и все три — контент в коде:
-- разговорник (survivalPhrases), наборы слов (wordPacks), гнёзда созвучий.
-- Учителю положить свою пачку карточек было некуда: он мог завести курс с
-- уроками — это час работы, — или не заводить ничего. Отсюда и просьба:
-- группа «Сверхъестественное», внутри — набор на каждый сезон.
--
-- ПОЧЕМУ ДВА УРОВНЯ, А НЕ ОДИН И НЕ ТРИ. Стопка карточек, которую человек
-- реально проходит за раз, — это 15–30 слов: набор. Наборов у одной темы
-- десятки, и плоским списком витрина превращается в свалку: полка (группа) —
-- это ровно то, что делает «Сверхъестественное · сезон 7» находимым. Третий
-- уровень (серия) не заводится таблицей намеренно: серия — это МЕТКА карточки
-- (`ep`), а не стопка. Стопка из шести слов не стоит открытия, а фильтр по
-- серии внутри набора решает ту же задачу без ещё одной сущности.
--
-- КТО ВЛАДЕЛЕЦ. Учитель (created_by) — основной путь: он собирает группу в
-- Конструкторе и назначает ученикам. Ученик-автор (author_student_id) — тот же
-- самый набор, собранный самим учеником; функция написана целиком, но
-- показывается только при поднятом флаге `student_card_sets` (см. app_flags
-- ниже, по умолчанию выключен). Ровно одно из двух полей заполнено — это и
-- проверяет card_groups_author_chk.
--
-- ЧТО ЗДЕСЬ НЕ ХРАНИТСЯ. Прогресс. Ответ по карточке уходит в review_cards, как
-- у разговорника и наборов слов: расписание повторений у ученика одно на всё, и
-- вторая колода рядом означала бы, что слово, выученное в наборе, вернётся в
-- «Повторении» как незнакомое.

-- ── Флаги приложения ─────────────────────────────────────────────────────────
--
-- ЗАЧЕМ ТАБЛИЦА, А НЕ КОНСТАНТА В КОДЕ. Флаг нужен админу, а не сборке:
-- «включить ученикам свои наборы» — это решение, которое принимают в проде и
-- отменяют в проде, не дожидаясь деплоя. Ключей будет мало, поэтому не jsonb
-- одной строкой: строка на флаг читается глазами в редакторе таблиц.
create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  -- Для чего флаг: таблицу открывают через полгода, и «student_card_sets» само
  -- по себе не говорит ничего.
  about text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.app_flags (key, enabled, about) values
  ('student_card_sets', false,
   'Ученик может собирать свои группы и наборы карточек в тренажёре. Выключено: наборы заводит только учитель.')
on conflict (key) do nothing;

alter table public.app_flags enable row level security;

-- Читают все: флаг решает, что рисовать, и запрос уходит до входа в аккаунт
-- (легаси-ученик ходит под anon). Секрета в строке «включено/выключено» нет.
drop policy if exists app_flags_read on public.app_flags;
create policy app_flags_read on public.app_flags for select to anon, authenticated using (true);

-- Пишет админ. Не is_staff(): это переключатель на весь продукт, а не настройка
-- своего кабинета — учитель не должен включать фичу всем чужим ученикам.
drop policy if exists app_flags_write on public.app_flags;
create policy app_flags_write on public.app_flags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Группа ───────────────────────────────────────────────────────────────────
create table if not exists public.card_groups (
  id uuid primary key default gen_random_uuid(),
  -- Владелец-учитель. По нему же скоупятся правки (см. политики).
  created_by uuid default auth.uid(),
  -- Ученик-автор, если группу собрал он сам (фича за флагом).
  author_student_id uuid references public.students(id) on delete cascade,
  -- Язык тренажёра, к которому группа приезжает: 'en', 'ko', 'ja', …
  -- Не курс и не предмет: витрина живёт во вкладке «Карточки» языка.
  lang text not null,
  -- Слаг предмета — только для фильтров и цвета, показ решает lang.
  subject text,
  title text not null,
  about text not null default '',
  -- Ступень по CEFR (A1…B2) — та же ось, что у разговорника. null = без метки.
  level text,
  sort integer not null default 0,
  -- Кому назначено. Пустой массив = всем ученикам владельца: типовой случай —
  -- «выложил и забыл», и заставлять учителя отмечать 24 галочки ради него
  -- значило бы, что группой не воспользуются.
  student_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint card_groups_author_chk check (
    (created_by is not null and author_student_id is null)
    or (created_by is null and author_student_id is not null)
  )
);

create index if not exists card_groups_owner_idx on public.card_groups (created_by, sort);
create index if not exists card_groups_author_idx on public.card_groups (author_student_id, sort);
create index if not exists card_groups_lang_idx on public.card_groups (lang);

-- ── Набор ────────────────────────────────────────────────────────────────────
create table if not exists public.card_sets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.card_groups(id) on delete cascade,
  title text not null,
  about text not null default '',
  level text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists card_sets_group_idx on public.card_sets (group_id, sort);

-- ── Карточка ─────────────────────────────────────────────────────────────────
--
-- Поля повторяют Phrase (data/survivalPhrases.ts) один в один, и это не
-- совпадение: витрина, свайп-колода, озвучка и расписание уже написаны над этим
-- типом. Своя форма карточки означала бы вторую копию всей стопки.
create table if not exists public.set_cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.card_sets(id) on delete cascade,
  term text not null,
  ru text not null,
  -- Чтение (романизация/транскрипция). У латиницы пусто.
  reading text,
  -- Когда так не говорят, чем отличается от соседнего слова.
  note text,
  -- Откуда слово: «S05E04», «гл. 3», «интервью». Метка, а не связь: витрина
  -- показывает её чипсом и фильтрует по ней внутри набора.
  ep text,
  -- Пример употребления: предложение, чтение, перевод — форма PhraseExample.
  ex jsonb,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists set_cards_set_idx on public.set_cards (set_id, sort);

-- ── Политики ─────────────────────────────────────────────────────────────────
--
-- ЧТЕНИЕ ОТКРЫТО, как у courses/lessons: кабинет легаси-ученика ходит под anon
-- (26 из 32 учеников без аккаунта, см. 0068), и закрыть чтение здесь значило бы
-- показать им пустую витрину. Учебный материал секретом не является; отсев
-- «моё/не моё» делает клиент по student_ids.
--
-- ИСКЛЮЧЕНИЕ — наборы, собранные учеником: это личное. Их читает автор (свою
-- строку легаси-ученик доказывает через is_legacy_student) и персонал.
alter table public.card_groups enable row level security;
alter table public.card_sets enable row level security;
alter table public.set_cards enable row level security;

drop policy if exists card_groups_read on public.card_groups;
create policy card_groups_read on public.card_groups for select to anon, authenticated
  using (
    author_student_id is null
    or public.is_legacy_student(author_student_id)
    or exists (select 1 from public.students s
               where s.id = card_groups.author_student_id and s.auth_user_id = auth.uid())
  );

drop policy if exists card_sets_read on public.card_sets;
create policy card_sets_read on public.card_sets for select to anon, authenticated
  using (exists (select 1 from public.card_groups g where g.id = card_sets.group_id));

drop policy if exists set_cards_read on public.set_cards;
create policy set_cards_read on public.set_cards for select to anon, authenticated
  using (exists (select 1 from public.card_sets s where s.id = set_cards.set_id));

-- Пишет владелец: учитель — свои группы, ученик — свои. Персонал-админ — всё
-- (is_admin внутри is_staff), иначе поддержка не сможет починить чужую опечатку.
drop policy if exists card_groups_write on public.card_groups;
create policy card_groups_write on public.card_groups for all to authenticated
  using (created_by = auth.uid() or public.is_admin()
    or exists (select 1 from public.students s
               where s.id = card_groups.author_student_id and s.auth_user_id = auth.uid()))
  with check (created_by = auth.uid() or public.is_admin()
    or exists (select 1 from public.students s
               where s.id = card_groups.author_student_id and s.auth_user_id = auth.uid()));

-- Легаси-ученик (без аккаунта) пишет свои группы под anon — иначе фича за
-- флагом окажется доступна меньшинству с аккаунтами. Чужую строку он не
-- тронет: is_legacy_student проверяет и существование, и отсутствие аккаунта,
-- а own-ность обеспечивает то, что id сессии лежит только у него.
drop policy if exists card_groups_write_anon on public.card_groups;
create policy card_groups_write_anon on public.card_groups for all to anon
  using (public.is_legacy_student(author_student_id))
  with check (public.is_legacy_student(author_student_id));

-- Набор и карточка наследуют право от группы: отдельного владельца у них нет.
drop policy if exists card_sets_write on public.card_sets;
create policy card_sets_write on public.card_sets for all to authenticated
  using (exists (select 1 from public.card_groups g
                 where g.id = card_sets.group_id
                   and (g.created_by = auth.uid() or public.is_admin()
                        or exists (select 1 from public.students s
                                   where s.id = g.author_student_id and s.auth_user_id = auth.uid()))))
  with check (exists (select 1 from public.card_groups g
                 where g.id = card_sets.group_id
                   and (g.created_by = auth.uid() or public.is_admin()
                        or exists (select 1 from public.students s
                                   where s.id = g.author_student_id and s.auth_user_id = auth.uid()))));

drop policy if exists card_sets_write_anon on public.card_sets;
create policy card_sets_write_anon on public.card_sets for all to anon
  using (exists (select 1 from public.card_groups g
                 where g.id = card_sets.group_id and public.is_legacy_student(g.author_student_id)))
  with check (exists (select 1 from public.card_groups g
                 where g.id = card_sets.group_id and public.is_legacy_student(g.author_student_id)));

drop policy if exists set_cards_write on public.set_cards;
create policy set_cards_write on public.set_cards for all to authenticated
  using (exists (select 1 from public.card_sets cs join public.card_groups g on g.id = cs.group_id
                 where cs.id = set_cards.set_id
                   and (g.created_by = auth.uid() or public.is_admin()
                        or exists (select 1 from public.students s
                                   where s.id = g.author_student_id and s.auth_user_id = auth.uid()))))
  with check (exists (select 1 from public.card_sets cs join public.card_groups g on g.id = cs.group_id
                 where cs.id = set_cards.set_id
                   and (g.created_by = auth.uid() or public.is_admin()
                        or exists (select 1 from public.students s
                                   where s.id = g.author_student_id and s.auth_user_id = auth.uid()))));

drop policy if exists set_cards_write_anon on public.set_cards;
create policy set_cards_write_anon on public.set_cards for all to anon
  using (exists (select 1 from public.card_sets cs join public.card_groups g on g.id = cs.group_id
                 where cs.id = set_cards.set_id and public.is_legacy_student(g.author_student_id)))
  with check (exists (select 1 from public.card_sets cs join public.card_groups g on g.id = cs.group_id
                 where cs.id = set_cards.set_id and public.is_legacy_student(g.author_student_id)));
