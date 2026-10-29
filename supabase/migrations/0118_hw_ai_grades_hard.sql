-- Предоценка ИИ и для сложных заданий: фото, доска и текст решения
-- (продолжение 0116).
--
-- Сложные задания живут в своей строке lesson_progress `<урок>-hard`
-- (`hw-<id>-hard` у домашки вне курса): по каждому заданию — круги «решение
-- ученика → ответ учителя», в решении текст, фото и доска (data URL в
-- attachments). Учитель ставит оценку 1–5 за задание, поэтому ИИ считает
-- первичные баллы ФИПИ и переводит их в оценку по проценту, как в контрольной
-- Тестли (supabase/functions/hw-grade/grader.ts → markOf).
--
-- Новое решение меняет attachments — работа снова встаёт в очередь, и ИИ
-- смотрит только задания, где последнее слово за учеником.

alter table public.hw_ai_grades
  add column if not exists kind text not null default 'basic'
    check (kind in ('basic', 'hard'));

create or replace function public.hw_ai_grade_track()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  hw uuid;
  base text;
  hard boolean;
begin
  -- Работа ушла из submitted (учитель проверил): незавершённая предоценка
  -- больше не нужна.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted' and NEW.status <> 'submitted' then
    update hw_ai_grades
       set status = case status when 'graded' then 'dismissed' else 'skipped' end,
           updated_at = now()
     where progress_id = NEW.id
       and status in ('pending', 'working', 'graded', 'error');
    return null;
  end if;

  hard := NEW.lesson_ref like '%-hard';
  if NEW.status <> 'submitted' or not (hard or NEW.lesson_ref ~ '^hw-[0-9a-f-]{36}$') then
    return null;
  end if;
  -- Та же сдача без изменений (повторная запись статуса) — очередь не трогаем.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted'
     and OLD.attachments is not distinct from NEW.attachments
     and OLD.comment is not distinct from NEW.comment then
    return null;
  end if;
  if not exists (select 1 from app_flags where key = 'ai_hw_grade' and enabled) then
    return null;
  end if;

  -- Предмет и учитель — по группе ученика; домашка (условия, эталоны) —
  -- по ключу `hw-<id>` или по уроку, к которому она привязана.
  select gr.created_by, gr.id as group_id,
         case gr.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
         case gr.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    into g
    from students s join groups gr on gr.id = s.group_id
   where s.id = NEW.student_id;
  if g.subj is null then
    return null;  -- не ХимБио
  end if;

  base := case when hard then left(NEW.lesson_ref, length(NEW.lesson_ref) - 5) else NEW.lesson_ref end;
  if base ~ '^hw-[0-9a-f-]{36}$' then
    hw := substring(base from 4)::uuid;
  else
    select h.id into hw from homework h
     where h.lesson_id::text = base and h.group_id = g.group_id
     order by h.created_at desc limit 1;
  end if;
  if not hard and not exists (select 1 from homework where id = hw) then
    return null;
  end if;

  insert into hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                            kind, subject, exam, status, submitted_at)
  values (NEW.id, NEW.student_id, NEW.lesson_ref, hw, g.created_by,
          case when hard then 'hard' else 'basic' end, g.subj, g.exam,
          'pending', coalesce(NEW.updated_at, now()))
  on conflict (progress_id) do update
     set status = 'pending', submitted_at = excluded.submitted_at, kind = excluded.kind,
         homework_id = excluded.homework_id,
         subject = excluded.subject, exam = excluded.exam, teacher_id = excluded.teacher_id,
         claimed_at = null, result = null, primary_score = null, max_score = null,
         score = null, comment = null, model = null, graded_at = null, error = null,
         final_score = null, confirmed_by = null, confirmed_at = null, updated_at = now();
  return null;
end; $$;

-- Сложные задания, которые уже ждут проверки, — тоже в очередь.
insert into public.hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                                 kind, subject, exam, status, submitted_at)
select lp.id, lp.student_id, lp.lesson_ref, null, gr.created_by, 'hard',
       case gr.subject when 'Химия' then 'chemistry' else 'biology' end,
       case gr.level when 'ЕГЭ' then 'ege' when 'ОГЭ' then 'oge' end,
       'pending', lp.updated_at
from lesson_progress lp
join students s on s.id = lp.student_id
join groups gr on gr.id = s.group_id
where lp.status = 'submitted'
  and lp.lesson_ref like '%-hard'
  and gr.subject in ('Химия', 'Биология')
on conflict (progress_id) do nothing;
