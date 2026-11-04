-- Предоценка развёрнутого ответа моделью по критериям экзамена + решение учителя.
--
-- ЗАЧЕМ. Учитель проверяет часть 2 по критериям ФИПИ: элемент за элементом.
-- Модель делает черновик этой работы — по каждому элементу «есть / нет /
-- частично» и дословную цитату из работы, — а учитель утверждает или правит.
-- Балл ученику уходит только после решения учителя (правило П3 ХимБио).
--
-- ТРИ ЧАСТИ.
--   kim_atlas  — устройство экзамена в общем виде: номер → часть, максимум,
--                правило счёта, элементы. Предметов в коде нет: новый экзамен =
--                новые строки (сид — 0104, генерирует scripts/buildKimAtlas.mjs).
--   task_bank.kim_* — ссылка задания банка на номер: exam + year + n.
--   hw_grades  — предложение модели и решение учителя по одному заданию одной
--                сдачи. Статус suggested → confirmed | changed.
--
-- ПОЧЕМУ НЕ В lesson_progress. Ученик может писать в свою строку
-- lesson_progress (политика auth_update_lp) — значит, мог бы и «утвердить»
-- себе балл. hw_grades ученику не видна вовсе, а поля модели не может
-- переписать никто, кроме функции (триггер ниже).

-- ── Атлас ─────────────────────────────────────────────────────────────────
create table if not exists public.kim_atlas (
  exam          text     not null,              -- код экзамена: '<экзамен>_<предмет>' из файла атласа
  year          int      not null,
  n             int      not null,              -- номер задания в КИМ
  part          smallint not null,
  max_points    int      not null,
  answer_type   text,
  scoring_text  text,                           -- правило начисления словами атласа
  rule          jsonb,                          -- {kind:'sum'|'ladder'|'groups', …}; null — общей шкалы нет
  elements      jsonb,                          -- [{id,label?,text}] или null — элементы из эталона задания
  element_count int,
  gates         jsonb    not null default '[]', -- [{unless, void[]}] — «без E1 не оценивается E2»
  deductions    jsonb    not null default '[]', -- [{id,text,points}] — вычеты по атласу
  teacher_notes jsonb    not null default '[]', -- что код не считает, а учитель должен помнить
  source_ref    text,
  updated_at    timestamptz not null default now(),
  primary key (exam, year, n)
);

alter table public.kim_atlas enable row level security;
drop policy if exists kim_atlas_read on public.kim_atlas;
create policy kim_atlas_read on public.kim_atlas for select to authenticated using (true);
-- Пишет только миграция (service_role / владелец схемы).

-- ── Ссылка задания банка на номер ─────────────────────────────────────────
alter table public.task_bank
  add column if not exists kim_exam text,
  add column if not exists kim_year int,
  add column if not exists kim_n    int;

-- ── Предоценка и решение ──────────────────────────────────────────────────
create table if not exists public.hw_grades (
  id            uuid primary key default gen_random_uuid(),
  progress_id   uuid not null references public.lesson_progress(id) on delete cascade,
  task_key      text not null,                  -- HardTaskDef.key
  solution_id   text not null,                  -- какой круг решения оценён
  kim_exam      text not null,
  kim_year      int  not null,
  kim_n         int  not null,
  max_points    int  not null,

  -- Предложение модели. Меняет только функция hw-grade.
  ai_elements   jsonb not null default '[]',    -- [{id,label?,text,verdict,quote}]
  ai_deductions jsonb not null default '[]',    -- [{id,found,quote}]
  ai_points     int,
  ai_model      text,
  ai_at         timestamptz,
  ai_warnings   jsonb not null default '[]',    -- нечитаемо, эталон не разбит и т.п.

  -- Решение учителя.
  status          text not null default 'suggested' check (status in ('suggested', 'confirmed', 'changed')),
  teacher_points  int,
  teacher_marks   jsonb,                        -- [{id,verdict}] — правки поверх модели
  teacher_note    text,
  decided_by      uuid references auth.users(id),
  decided_at      timestamptz,

  created_at    timestamptz not null default now(),
  unique (progress_id, task_key, solution_id)
);

create index if not exists hw_grades_progress_idx on public.hw_grades (progress_id);

alter table public.hw_grades enable row level security;

-- Видит и решает учитель группы ученика (как lesson_progress в 0034) и админ.
-- Ученику строки не видны: предварительный балл — не балл.
drop policy if exists hw_grades_teacher_read on public.hw_grades;
create policy hw_grades_teacher_read on public.hw_grades for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.lesson_progress lp
    join public.students s on s.id = lp.student_id
    where lp.id = hw_grades.progress_id
      and s.group_id = any (public.my_taught_group_ids())));

drop policy if exists hw_grades_teacher_decide on public.hw_grades;
create policy hw_grades_teacher_decide on public.hw_grades for update to authenticated
  using (public.is_admin() or exists (
    select 1 from public.lesson_progress lp
    join public.students s on s.id = lp.student_id
    where lp.id = hw_grades.progress_id
      and s.group_id = any (public.my_taught_group_ids())))
  with check (public.is_admin() or exists (
    select 1 from public.lesson_progress lp
    join public.students s on s.id = lp.student_id
    where lp.id = hw_grades.progress_id
      and s.group_id = any (public.my_taught_group_ids())));
-- INSERT/DELETE — только функция (service_role, мимо RLS).

-- Поля модели и привязку не переписывает никто, кроме service_role: учитель
-- правит СВОЁ решение, а исходное предложение остаётся как было — по нему
-- потом видно, где модель ошибалась.
create or replace function public.hw_grades_freeze_ai()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  new.progress_id   := old.progress_id;
  new.task_key      := old.task_key;
  new.solution_id   := old.solution_id;
  new.kim_exam      := old.kim_exam;
  new.kim_year      := old.kim_year;
  new.kim_n         := old.kim_n;
  new.max_points    := old.max_points;
  new.ai_elements   := old.ai_elements;
  new.ai_deductions := old.ai_deductions;
  new.ai_points     := old.ai_points;
  new.ai_model      := old.ai_model;
  new.ai_at         := old.ai_at;
  new.ai_warnings   := old.ai_warnings;
  new.created_at    := old.created_at;
  new.decided_by    := auth.uid();
  new.decided_at    := now();
  if new.teacher_points is not null and (new.teacher_points < 0 or new.teacher_points > old.max_points) then
    raise exception 'балл вне 0…%', old.max_points;
  end if;
  return new;
end $$;

drop trigger if exists hw_grades_freeze_ai on public.hw_grades;
create trigger hw_grades_freeze_ai before update on public.hw_grades
  for each row execute function public.hw_grades_freeze_ai();

-- ── Рубильник ─────────────────────────────────────────────────────────────
-- Как ai_ielts_grade (0099): работает при поднятых ОБОИХ флагах — общем
-- ai_enabled и своём. Выключено — экран проверки работает как раньше, без
-- разбора модели. Включается вручную в Админке, после «ок» Дани.
insert into public.app_flags (key, enabled, about) values
  ('ai_hw_grade', false,
   'Предоценка развёрнутых ответов ДЗ моделью по критериям экзамена (элементы, цитаты, балл по атласу). Учитель утверждает или правит. Выключено — проверка как раньше, без разбора модели.')
on conflict (key) do nothing;
