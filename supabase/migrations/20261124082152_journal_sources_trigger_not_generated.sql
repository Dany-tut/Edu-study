-- Источники заданий журнала: вычисляемые столбцы пересчитывались при ЛЮБОМ
-- обновлении урока (~2,7 мс на урок, полное сохранение курса на 301 урок —
-- +0,8 с). Теперь это обычные столбцы (значения сохраняются, снятие выражения
-- ничего не удаляет), их заполняет триггер — один разбор домашки и только
-- когда homework действительно изменился. Журнал сверен: 0 расхождений.
alter table public.lessons
  alter column journal_hw_sources drop expression,
  alter column journal_rec_sources drop expression,
  alter column journal_extra_sources drop expression;
create or replace function public.lessons_journal_sources_sync() returns trigger language plpgsql set search_path to '' as $$
declare s jsonb;
begin
  if tg_op = 'INSERT' or new.homework is distinct from old.homework then
    s := public.teacher_journal_homework_summary_v1(new.homework);
    new.journal_hw_sources := public.teacher_journal_task_sources_v2(s -> 'hwTasks');
    new.journal_rec_sources := public.teacher_journal_task_sources_v2(s -> 'recHwTasks');
    new.journal_extra_sources := public.teacher_journal_extra_sources_v2(nullif(s -> 'extraHw', 'null'::jsonb));
  end if;
  return new;
end $$;
create trigger lessons_journal_sources_sync before insert or update of homework on public.lessons
  for each row execute function public.lessons_journal_sources_sync();
