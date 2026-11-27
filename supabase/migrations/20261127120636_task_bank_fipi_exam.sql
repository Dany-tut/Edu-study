-- Банк заданий различает экзамен, год КИМ и кодификатор (банк ФИПИ)
-- Применена на проде 27.11.2026 (версия 20261127120636, «да» Дани через оператора).
--
-- ЗАЧЕМ. Тренажёр химии и биологии наполняется заданиями открытого банка ФИПИ
-- (ЕГЭ и ОГЭ, КИМ 2026, концепт — Figma «Искра», стр. 27, согласован Дани
-- 27.11.2026). В task_bank не было ни экзамена (ЕГЭ и ОГЭ неразличимы), ни года
-- КИМ, ни кодов кодификатора (КЭС), ни ссылки на задание ФИПИ — по ней импорт
-- защищается от дублей и сверяет ответ с ключом ФИПИ.
--
-- ЧТО МИГРАЦИЯ ДЕЛАЕТ. Только добавляет колонки с безопасными значениями по
-- умолчанию и индексы. Существующие строки получают exam='ege', kim_year=NULL
-- (год неизвестен — «вне КИМ»), kes='{}' — ровно то, что о них известно.
--
-- ЧЕГО НЕ ДЕЛАЕТ. Не меняет и не удаляет ни одной строки и ни одной колонки,
-- не трогает RLS. task_bank уже под историей (iskra_history.row_versions,
-- 20261122031218) — новые колонки попадают в old_row автоматически (to_jsonb).
-- Откат — drop этих колонок и индексов (данные импорта ФИПИ при этом теряются,
-- поэтому только вместе с удалением импортированных строк по source).

alter table public.task_bank
  add column if not exists exam       text not null default 'ege',
  add column if not exists kim_year   smallint,
  add column if not exists kes        text[] not null default '{}',
  add column if not exists fipi_id    text,
  add column if not exists fipi_guid  text,
  add column if not exists scoring    text;

alter table public.task_bank
  drop constraint if exists task_bank_exam_check;
alter table public.task_bank
  add constraint task_bank_exam_check check (exam in ('ege', 'oge'));

alter table public.task_bank
  drop constraint if exists task_bank_scoring_check;
alter table public.task_bank
  add constraint task_bank_scoring_check check (
    scoring is null or scoring in ('all_or_nothing', 'per_item', 'ege_minus_one', 'one_error_minus_one', 'criteria', 'none')
  );

comment on column public.task_bank.exam is 'ege | oge';
comment on column public.task_bank.kim_year is 'Год КИМ ФИПИ (2026, 2027…); NULL — вне КИМ';
comment on column public.task_bank.kes is 'Коды кодификатора ФИПИ (КЭС), например {2.2,2.3}';
comment on column public.task_bank.fipi_id is 'Номер задания в открытом банке ФИПИ (6 hex), например FCE64A';
comment on column public.task_bank.fipi_guid is 'GUID задания ФИПИ — для сверки ответа с ключом';
comment on column public.task_bank.scoring is 'Правило баллов, названия как в Тестли (lib/tests.ts): all_or_nothing, per_item, ege_minus_one (2 балла без ошибок, 1 при одной), one_error_minus_one, criteria (часть 2, самопроверка), none';

create unique index if not exists task_bank_fipi_guid_uidx on public.task_bank (fipi_guid) where fipi_guid is not null;
create index if not exists task_bank_exam_year_line_idx on public.task_bank (subject, exam, kim_year, line);
create index if not exists task_bank_kes_gin on public.task_bank using gin (kes);
