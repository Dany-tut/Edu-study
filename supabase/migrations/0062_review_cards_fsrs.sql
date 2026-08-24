-- FSRS-состояние карточек повторения (см. src/lib/fsrs.ts, src/lib/reviewScheduler.ts)
--
-- ПОЧЕМУ ДВЕ НОВЫЕ КОЛОНКИ, А НЕ JSONB. review_cards и так плоская таблица
-- (ease/interval_days/reps/lapses по одной колонке на поле) — заводить jsonb
-- ради двух float'ов ломало бы этот стиль и потребовало бы кастовать типы на
-- каждом select. Обе nullable и без дефолта: NULL — это ЛЕГАЛЬНОЕ состояние
-- «карточка ещё не мигрировала на FSRS», а не забытая инициализация. Миграция
-- происходит на лету при первом ревью такой карточки (fsrsFromSm2 в fsrs.ts) —
-- никакого backfill-скрипта здесь нет и не нужно.
--
-- Диапазоны отражают модель: stability — дни до падения retrievability к 90%,
-- неотрицательное число без верхней границы в схеме (программный потолок 100
-- лет живёт в коде, в схеме не дублируем); difficulty — 1..10 по определению
-- FSRS-4.5, ограничение задаём в БД, чтобы кривые данные не проскочили мимо
-- клиента (например, ручной SQL от будущего скрипта миграции).

alter table public.review_cards
  add column if not exists stability  real,
  add column if not exists difficulty real;

alter table public.review_cards
  add constraint review_cards_stability_nonneg  check (stability  is null or stability  >= 0),
  add constraint review_cards_difficulty_range   check (difficulty is null or (difficulty between 1 and 10));
