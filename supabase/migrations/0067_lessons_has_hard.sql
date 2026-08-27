-- Лёгкий признак «у урока есть сложный уровень».
--
-- Трек рисует спутник-звезду через lessonHasHardLevel (data/lessonContent.ts).
-- Пока курс приезжал целиком, тот читал homework.hwTasks[].isHard. Теперь
-- колонка homework в кабинет ученика не едет вовсе (3,5 МБ по базе против
-- 6,6 КБ у соседних), и «домашки нет» стало неотличимо от «домашку ещё не
-- спросили»: звезда либо гасла у всех, либо горела у всех.
--
-- Колонка ПОВТОРЯЕТ логику lessonHasHardLevel целиком, а не только поиск
-- isHard. У старых сгенерированных ДЗ (химия, биология, AP) авторских заданий
-- нет вообще, и хард у них есть всегда — если считать только isHard, звезда
-- пропала бы у всех химических курсов разом.
--
-- Считать признак прямо в GENERATED-выражении нельзя: подзапросы там
-- запрещены, поэтому разбор массива вынесен в immutable-функцию.
--
-- По базе на 26.08.2026: 1332 урока, из них 1209 с авторскими заданиями (хард
-- у 22) и 123 без заданий (хард по умолчанию). Итого колонка true у 145.

create or replace function public.lesson_hw_has_hard(hw jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(hw -> 'hwTasks') = 'array' and jsonb_array_length(hw -> 'hwTasks') > 0
      then coalesce((
        select bool_or(t -> 'isHard' = 'true'::jsonb)
        from jsonb_array_elements(hw -> 'hwTasks') as t
      ), false)
    -- Нет авторских заданий → домашка генерируется, а у генерируемой хард есть.
    else true
  end
$$;

alter table public.lessons
  add column if not exists has_hard boolean
  generated always as (public.lesson_hw_has_hard(homework)) stored;

comment on column public.lessons.has_hard is
  'Есть ли у урока сложный уровень (зеркало lessonHasHardLevel). Нужен треку ученика, чтобы не тянуть колонку homework целиком.';
