-- Привязка задания банка к уроку курса (lesson_id = short_id урока, e.g. 'acc-ru-5').
--
-- ЗАЧЕМ. Бухгалтерия и другие курсовые предметы показывают ученику в тренажёре
-- только задания из пройденных уроков. Без lesson_id невозможно отфильтровать
-- серверной стороной — все задания уезжают в браузер вместе с ответами.
--
-- Для экзаменационных предметов (химия, биология) столбец остаётся NULL:
-- их задания не привязаны к урокам.
--
-- Индекс по (subject, lesson_id) ускоряет запросы «задания бухгалтерии для
-- уроков acc-ru-0, acc-ru-1, …» и не замедляет существующие запросы.

alter table public.task_bank
  add column if not exists lesson_id text;

create index if not exists idx_task_bank_subject_lesson
  on public.task_bank (subject, lesson_id)
  where lesson_id is not null;
