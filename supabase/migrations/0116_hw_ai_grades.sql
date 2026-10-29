-- Предоценка ДЗ ИИ по критериям ФИПИ (шаг 4 сквозного флоу ХимБио,
-- ChemBio_KB/integration/FLOW.md, «Предоценка ИИ»).
--
-- КАК ЭТО ХОДИТ. Ученик сдаёт ДЗ по химии или биологии — строка
-- lesson_progress `hw-<id>` встаёт в submitted, и триггер ниже ставит работу
-- в очередь (hw_ai_grades, status pending). Очередь разбирает сторож на Маке
-- Дани (scripts/hw-grade/hw-grade-watch.py): берёт работу через Edge Function hw-grade,
-- запускает Claude Code по подписке и сдаёт ответ по критериям. Балл считает
-- функция, а не модель (П3). Учитель видит «ИИ предложил N баллов» на экране
-- проверки и жмёт «Ок» или правит — hw_ai_grade_confirm() отмечает решение.
--
-- Статусы: pending → working (Мак взял) → graded (ждёт ок учителя)
--   → confirmed (учитель принял балл ИИ) | changed (поставил свой).
--   error — Claude не справился; skipped — учитель проверил раньше ИИ
--   или в сдаче нет ответов (старая сдача без снимка);
--   dismissed — ИИ оценил, но учитель проверил, не открыв предложение.
-- Пересдача (работа снова submitted) возвращает строку в pending.
--
-- ИМЁН УЧЕНИКОВ ЗДЕСЬ НЕТ и в модель они не уходят (П3).
-- Зависит от 0115 (chembio_dirty, сводка с названием ДЗ).

insert into public.app_flags (key, enabled, about) values
  ('ai_hw_grade', true,
   'Предоценка ДЗ по химии и биологии по критериям ФИПИ: сданная работа встаёт в очередь, её оценивает Claude, балл утверждает учитель. Выключено — новые сдачи в очередь не встают.')
on conflict (key) do nothing;

create table if not exists public.hw_ai_grades (
  id            uuid primary key default gen_random_uuid(),
  progress_id   uuid not null unique references public.lesson_progress(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  lesson_ref    text not null,
  homework_id   uuid references public.homework(id) on delete cascade,
  teacher_id    uuid references auth.users(id) on delete cascade,
  subject       text not null,          -- chemistry | biology
  exam          text,                   -- ege | oge | null
  status        text not null default 'pending'
                check (status in ('pending', 'working', 'graded', 'confirmed', 'changed',
                                  'error', 'skipped', 'dismissed')),
  submitted_at  timestamptz not null default now(),
  claimed_at    timestamptz,
  -- Ответ модели по заданиям и элементам критериев — как пришёл, плюс что
  -- засчитал код (counted) и сколько баллов вышло (points).
  result        jsonb,
  primary_score integer,                -- первичный балл по ФИПИ
  max_score     integer,                -- максимум первичных за эти задания
  score         integer,                -- предложение в шкале экрана проверки, 0–100
  comment       text,                   -- комментарий ученику от ИИ
  model         text,
  graded_at     timestamptz,
  error         text,
  final_score   integer,                -- что поставил учитель
  confirmed_by  uuid references auth.users(id) on delete set null,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists hw_ai_grades_queue on public.hw_ai_grades (status, submitted_at);
create index if not exists hw_ai_grades_teacher on public.hw_ai_grades (teacher_id, status);

alter table public.hw_ai_grades enable row level security;
revoke all on public.hw_ai_grades from anon, authenticated;
grant select on public.hw_ai_grades to authenticated;

-- Учитель видит предоценки своих групп. Пишут только функция (service_role)
-- и hw_ai_grade_confirm() ниже.
drop policy if exists hw_ai_grades_teacher_read on public.hw_ai_grades;
create policy hw_ai_grades_teacher_read on public.hw_ai_grades
  for select to authenticated
  using (teacher_id = (select auth.uid()));


-- ── Очередь: сдача → pending ────────────────────────────────────────────────

create or replace function public.hw_ai_grade_track()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  hw uuid;
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

  if NEW.status <> 'submitted' or NEW.lesson_ref !~ '^hw-[0-9a-f-]{36}$' then
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

  hw := substring(NEW.lesson_ref from 4)::uuid;
  select gr.created_by,
         case gr.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
         case gr.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    into g
    from homework h join groups gr on gr.id = h.group_id
   where h.id = hw;
  if g.subj is null then
    return null;  -- не ХимБио или ДЗ нет
  end if;

  insert into hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                            subject, exam, status, submitted_at)
  values (NEW.id, NEW.student_id, NEW.lesson_ref, hw, g.created_by, g.subj, g.exam,
          'pending', coalesce(NEW.updated_at, now()))
  on conflict (progress_id) do update
     set status = 'pending', submitted_at = excluded.submitted_at,
         subject = excluded.subject, exam = excluded.exam, teacher_id = excluded.teacher_id,
         claimed_at = null, result = null, primary_score = null, max_score = null,
         score = null, comment = null, model = null, graded_at = null, error = null,
         final_score = null, confirmed_by = null, confirmed_at = null, updated_at = now();
  return null;
end; $$;

drop trigger if exists hw_ai_grade_track on public.lesson_progress;
create trigger hw_ai_grade_track
  after insert or update of status, attachments, comment on public.lesson_progress
  for each row execute function public.hw_ai_grade_track();


-- ── Решение учителя ─────────────────────────────────────────────────────────
--
-- Зовётся после записи проверки (reviewHomework): балл ученику уже ушёл
-- прежним путём, здесь только отметка «ИИ → учитель» для журнала и сводки.

create or replace function public.hw_ai_grade_confirm(p_id uuid, p_score integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update hw_ai_grades
     set status = case when p_score = score then 'confirmed' else 'changed' end,
         final_score = p_score,
         confirmed_by = auth.uid(),
         confirmed_at = now(),
         updated_at = now()
   where id = p_id
     and teacher_id = auth.uid()
     and status in ('graded', 'dismissed');
  if not found then
    raise exception 'предоценки нет или она не ждёт решения';
  end if;
end; $$;

revoke all on function public.hw_ai_grade_confirm(uuid, integer) from public, anon;
grant execute on function public.hw_ai_grade_confirm(uuid, integer) to authenticated;


-- ── Сводка в Таскли: живое обновление ───────────────────────────────────────

create or replace function public.hw_ai_grade_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid := coalesce(NEW.teacher_id, OLD.teacher_id);
begin
  if t is not null and exists (select 1 from chembio_taskly_teachers where teacher_id = t) then
    insert into chembio_dirty(teacher_id) values (t) on conflict (teacher_id) do nothing;
  end if;
  return null;
end; $$;

drop trigger if exists chembio_dirty on public.hw_ai_grades;
create trigger chembio_dirty after insert or update of status or delete on public.hw_ai_grades
  for each row execute function public.hw_ai_grade_dirty();


-- ── chembio_day_summary: ai_graded из hw_ai_grades ──────────────────────────
--
-- Тело — из 0115 без изменений, кроме review.ai_graded: сколько работ ИИ
-- оценил и они ждут ок учителя (предоценка graded, работа ещё submitted).

create or replace function public.chembio_day_summary(
  p_teacher uuid,
  p_date    date default (now() at time zone 'Europe/Moscow')::date,
  p_link    text default 'https://edu-study-app.vercel.app/#/teacher/homework'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with my_groups as (
    select g.*,
           case g.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
           case g.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    from groups g
    where g.created_by = p_teacher
  ),
  my_students as (
    select s.id, s.group_id from students s join my_groups g on g.id = s.group_id
  ),
  current_hw as (
    select distinct on (h.group_id) h.*
    from homework h
    join my_groups g on g.id = h.group_id
    where h.status <> 'closed'
      and not g.is_individual
      and g.subj is not null
    order by h.group_id, h.assigned_at desc nulls last, h.created_at desc
  ),
  group_rows as (
    select g.name, g.id,
           jsonb_strip_nulls(jsonb_build_object(
             'id', g.id,
             'title', g.name,
             'subject', g.subj,
             'exam', g.exam,
             'homework', jsonb_strip_nulls(jsonb_build_object(
               -- Название ДЗ — ровно как учитель написал его в Искре
               -- («ДЗ Атомы», «ДЗ Атомы 2»). Пустое — поля нет.
               'title', nullif(btrim(h.title), ''),
               'submitted', (select count(distinct lp.student_id)
                             from lesson_progress lp
                             join my_students s on s.id = lp.student_id and s.group_id = g.id
                             where lp.lesson_ref = 'hw-' || h.id
                               and lp.status in ('submitted', 'returned', 'completed')),
               'total', (select count(*) from my_students s where s.group_id = g.id)
             ))
           )) as row
    from current_hw h join my_groups g on g.id = h.group_id
  ),
  awaiting as (
    select count(*) as n
    from lesson_progress lp
    join my_students s on s.id = lp.student_id
    where lp.status = 'submitted'
      and (
        lp.lesson_ref like '%-hard'
        or exists (select 1 from homework h
                   where 'hw-' || h.id = lp.lesson_ref and h.status <> 'closed')
        or (lp.lesson_ref not like 'hw-%' and coalesce(lp.comment, '') <> '')
      )
  ),
  ai_graded as (
    select count(*) as n
    from hw_ai_grades a
    join lesson_progress lp on lp.id = a.progress_id
    where a.teacher_id = p_teacher
      and a.status = 'graded'
      and lp.status = 'submitted'
  ),
  lesson_rows as (
    select distinct
           sl.time_start,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date = p_date
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
      and (g.id is not null
           or sl.student_id in (select id from my_students))
  )
  select jsonb_build_object(
    'version', 1,
    'date', to_char(p_date, 'YYYY-MM-DD'),
    'updated', to_char(now() at time zone 'Europe/Moscow', 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
    'source', 'iskra',
    'groups', coalesce((select jsonb_agg(row order by name) from group_rows), '[]'::jsonb),
    'review', jsonb_build_object(
      'ai_graded', (select n from ai_graded),
      'awaiting', (select n from awaiting)
    ),
    'lessons', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'at', to_char(p_date, 'YYYY-MM-DD') || 'T' || lpad(time_start, 5, '0') || ':00+03:00',
               'group', label,
               'group_id', gid
             )) order by lpad(time_start, 5, '0'), label)
      from lesson_rows
    ), '[]'::jsonb),
    'link', p_link
  );
$$;

revoke all on function public.chembio_day_summary(uuid, date, text) from public, anon, authenticated;
grant execute on function public.chembio_day_summary(uuid, date, text) to service_role;


-- Работы, которые уже лежат на проверке, — тоже в очередь: иначе предоценка
-- появилась бы только у следующих сдач.
insert into public.hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                                 subject, exam, status, submitted_at)
select lp.id, lp.student_id, lp.lesson_ref, h.id, gr.created_by,
       case gr.subject when 'Химия' then 'chemistry' else 'biology' end,
       case gr.level when 'ЕГЭ' then 'ege' when 'ОГЭ' then 'oge' end,
       'pending', lp.updated_at
from lesson_progress lp
join homework h on 'hw-' || h.id = lp.lesson_ref
join groups gr on gr.id = h.group_id
where lp.status = 'submitted'
  and gr.subject in ('Химия', 'Биология')
  and h.status <> 'closed'
on conflict (progress_id) do nothing;
