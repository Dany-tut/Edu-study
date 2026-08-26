-- Лёгкий признак «у урока есть сложный уровень».
--
-- Трек рисует спутник-звезду через lessonHasHardLevel (data/lessonContent.ts),
-- а тот читает homework.hwTasks[].isHard. С тех пор как вход ученика перестал
-- везти колонку homework (она весит 3,5 МБ по базе против 6,6 КБ у соседних),
-- трек про хард ничего не знает: «домашки нет» и «домашку ещё не спросили»
-- выглядят одинаково, и звезда либо гаснет у всех, либо горит у всех.
--
-- Считать признак на лету нельзя: в GENERATED-выражении подзапросы запрещены,
-- поэтому разбор массива вынесен в immutable-функцию.
--
-- По базе на 26.08.2026 хард есть у 22 уроков из 1332 — колонка почти вся
-- false, места не стоит.

create or replace function public.lesson_hw_has_hard(hw jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select bool_or(t -> 'isHard' = 'true'::jsonb)
    from jsonb_array_elements(
      case when jsonb_typeof(hw -> 'hwTasks') = 'array' then hw -> 'hwTasks' else '[]'::jsonb end
    ) as t
  ), false)
$$;

alter table public.lessons
  add column if not exists has_hard boolean
  generated always as (public.lesson_hw_has_hard(homework)) stored;

comment on column public.lessons.has_hard is
  'Есть ли среди homework.hwTasks задание с isHard. Нужен треку ученика, чтобы не тянуть всю колонку homework.';
