-- Предоценка ДЗ: учится на поправках учителя и умеет пакетное подтверждение.
--
-- 1. ПОПРАВКИ. Учитель утвердил проверку (hw_ai_grade_confirm → confirmed |
--    changed), и его оценка или замечание разошлись с ИИ — триггер сохраняет
--    разницу по каждому разобранному заданию в hw_ai_corrections: условие,
--    ответ, балл ИИ, балл учителя, комментарий. ИМЁН И ID УЧЕНИКА ТАМ НЕТ:
--    имя ученика вычищается из текста, строка связана только с предоценкой
--    (grade_id — для дедупликации и каскадного удаления; в модель не уходит).
--    hw-grade-run подмешивает несколько последних поправок того же задания
--    или той же линии КИМ в промпт (grader.ts → pickCorrections).
--
-- 2. ПАКЕТ. «Применить все уверенные» в очереди «Нужно проверить». Уверенность
--    модель не возвращает, поэтому порог строится по тому, что grader реально
--    отдаёт (вердикты элементов, засчитано ли по цитате, источник цитаты):
--    работа уверенная, если у неё есть балл и в каждом задании КИМ все
--    элементы — чистое «есть» с найденной цитатой или «нет», без «частично»,
--    без цитат с фото (их код засчитывает не глядя), без авторских заданий,
--    которые оценивает только учитель, и не по линии, где учитель недавно
--    дважды поправлял балл ИИ. Только обычные ДЗ: у сложных оценка 1–5
--    ставится по каждому заданию на своём экране.

insert into public.app_flags (key, enabled, about) values
  ('ai_hw_learn', true,
   'Предоценка ДЗ учитывает поправки учителя: несколько последних расхождений по тому же заданию или линии КИМ уходят модели примерами (без имён и id учеников). Выключено — примеры не добавляются, поправки продолжают сохраняться.')
on conflict (key) do nothing;

create table if not exists public.hw_ai_corrections (
  id              uuid primary key default gen_random_uuid(),
  grade_id        uuid not null references public.hw_ai_grades(id) on delete cascade,
  teacher_id      uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  exam            text,
  kind            text not null,
  homework_id     uuid references public.homework(id) on delete set null,
  task_n          integer not null,
  task_key        text,
  kim_n           integer,
  statement       text not null,
  answer          text not null,
  ai_points       integer,
  ai_max          integer,
  ai_mark         integer,     -- сложное: оценка ИИ 1–5 за задание
  ai_score        integer,     -- обычное: процент ИИ за всю работу
  teacher_mark    integer,     -- сложное: оценка учителя за задание
  teacher_score   integer,     -- итог учителя за работу
  ai_comment      text not null default '',
  teacher_comment text not null default '',
  diff            text not null check (diff in ('score', 'comment')),
  created_at      timestamptz not null default now(),
  unique (grade_id, task_n)
);

create index if not exists hw_ai_corrections_teacher
  on public.hw_ai_corrections (teacher_id, subject, created_at desc);

alter table public.hw_ai_corrections enable row level security;
revoke all on public.hw_ai_corrections from anon, authenticated;
grant select on public.hw_ai_corrections to authenticated;
drop policy if exists hw_ai_corrections_teacher_read on public.hw_ai_corrections;
create policy hw_ai_corrections_teacher_read on public.hw_ai_corrections
  for select to authenticated using (teacher_id = (select auth.uid()));


-- ── Текст без разметки и без имени ученика ──────────────────────────────────

create or replace function iskra_private.hw_ai_plain(p text)
returns text language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(
    replace(replace(replace(replace(replace(
      regexp_replace(regexp_replace(coalesce(p, ''), '<br\s*/?>|</(p|div|li)>', ' ', 'gi'), '<[^>]+>', '', 'g'),
      '&nbsp;', ' '), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&amp;', '&'),
    '\s+', ' ', 'g')), 1500)
$$;

-- Имя и фамилия ученика (с окончаниями: «Маша» → «Маши», «Машей») и почты
-- заменяются в тексте. Короткие слова (< 3 букв) не трогаем.
create or replace function iskra_private.hw_ai_scrub(p text, p_name text)
returns text language plpgsql immutable set search_path = '' as $$
declare w text; stem text; r text := coalesce(p, '');
begin
  r := regexp_replace(r, '[^[:space:]@]+@[^[:space:]@]+', '[почта]', 'g');
  foreach w in array regexp_split_to_array(btrim(coalesce(p_name, '')), '[[:space:]]+') loop
    w := regexp_replace(w, '[^[:alpha:]-]', '', 'g');
    continue when length(w) < 3;
    stem := case when length(w) >= 4 then left(w, length(w) - 1) else w end;
    r := regexp_replace(r,
      '(^|[^[:alpha:]])' || regexp_replace(stem, '([.*+?^${}()|\[\]\\-])', '\\\1', 'g') || '[[:alpha:]]{0,4}(?![[:alpha:]])',
      '\1ученик', 'gi');
  end loop;
  return r;
end; $$;

create or replace function iskra_private.hw_ai_html(p text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(replace(replace(coalesce(p, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;'), E'\n', '<br>')
$$;

revoke all on function iskra_private.hw_ai_plain(text) from public, anon, authenticated;
revoke all on function iskra_private.hw_ai_scrub(text, text) from public, anon, authenticated;
revoke all on function iskra_private.hw_ai_html(text) from public, anon, authenticated;


-- ── Захват поправок ─────────────────────────────────────────────────────────

create or replace function iskra_private.hw_ai_capture_corrections()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record; t jsonb; inp jsonb; last_c jsonb;
  t_comment text; ai_comment text; t_mark integer; d text; n_rows integer := 0;
begin
  if NEW.status not in ('confirmed', 'changed') or OLD.status is not distinct from NEW.status then return null; end if;
  if NEW.result is null or jsonb_typeof(NEW.result->'tasks') is distinct from 'array' then return null; end if;
  select lp.review_comment, lp.review_attachments, s.name into p
    from lesson_progress lp join students s on s.id = lp.student_id
   where lp.id = NEW.progress_id;
  if not found then return null; end if;

  for t in select value from jsonb_array_elements(NEW.result->'tasks') loop
    exit when n_rows >= 8;
    -- Машинная проверка без разбора — ИИ там ничего не утверждал.
    continue when jsonb_array_length(coalesce(t->'elements', '[]'::jsonb)) = 0;
    select value into inp from jsonb_array_elements(coalesce(NEW.result->'inputs', '[]'::jsonb))
     where (value->>'n')::int = (t->>'n')::int limit 1;
    continue when inp is null;
    ai_comment := coalesce(t->>'comment', '');
    d := null; t_mark := null;
    if NEW.kind = 'hard' then
      select c.value into last_c
        from jsonb_array_elements(coalesce(p.review_attachments->'tasks', '[]'::jsonb)) b,
             jsonb_array_elements(coalesce(b.value->'comments', '[]'::jsonb)) c
       where b.value->>'key' = t->>'key'
       order by c.value->>'at' desc limit 1;
      if jsonb_typeof(last_c->'score') = 'number' then t_mark := round((last_c->>'score')::numeric)::int; end if;
      t_comment := iskra_private.hw_ai_plain(last_c->>'comment');
      if t_mark is not null and jsonb_typeof(t->'mark') = 'number' and t_mark <> (t->>'mark')::int then d := 'score';
      elsif length(t_comment) >= 20 and position(lower(ai_comment) in lower(t_comment)) = 0 then d := 'comment';
      end if;
    else
      t_comment := iskra_private.hw_ai_plain(p.review_comment);
      if NEW.final_score is distinct from NEW.score then d := 'score';
      elsif length(t_comment) >= 20 and coalesce(NEW.comment, '') <> ''
            and position(lower(iskra_private.hw_ai_plain(NEW.comment)) in lower(t_comment)) = 0 then d := 'comment';
      end if;
    end if;
    continue when d is null;

    insert into hw_ai_corrections (grade_id, teacher_id, subject, exam, kind, homework_id, task_n, task_key, kim_n,
      statement, answer, ai_points, ai_max, ai_mark, ai_score, teacher_mark, teacher_score,
      ai_comment, teacher_comment, diff)
    values (NEW.id, NEW.teacher_id, NEW.subject, NEW.exam, NEW.kind, NEW.homework_id, (t->>'n')::int, t->>'key',
      case when jsonb_typeof(t->'kim_n') = 'number' then (t->>'kim_n')::int end,
      left(iskra_private.hw_ai_scrub(inp->>'statement', p.name), 1500),
      left(iskra_private.hw_ai_scrub(inp->>'answer', p.name), 1500),
      (t->>'points')::int, (t->>'max_points')::int,
      case when jsonb_typeof(t->'mark') = 'number' then (t->>'mark')::int end,
      NEW.score, t_mark, NEW.final_score,
      left(iskra_private.hw_ai_scrub(ai_comment, p.name), 1000),
      left(iskra_private.hw_ai_scrub(t_comment, p.name), 1200), d)
    on conflict (grade_id, task_n) do update set
      statement = excluded.statement, answer = excluded.answer, kim_n = excluded.kim_n,
      ai_points = excluded.ai_points, ai_max = excluded.ai_max, ai_mark = excluded.ai_mark,
      ai_score = excluded.ai_score, teacher_mark = excluded.teacher_mark, teacher_score = excluded.teacher_score,
      ai_comment = excluded.ai_comment, teacher_comment = excluded.teacher_comment, diff = excluded.diff,
      created_at = now();
    n_rows := n_rows + 1;
  end loop;
  return null;
end; $$;

revoke all on function iskra_private.hw_ai_capture_corrections() from public, anon, authenticated;
drop trigger if exists hw_ai_capture_corrections on public.hw_ai_grades;
create trigger hw_ai_capture_corrections after update of status on public.hw_ai_grades
  for each row execute function iskra_private.hw_ai_capture_corrections();


-- ── Уверенность предоценки ──────────────────────────────────────────────────
--
-- null — уверенная. Иначе код причины: hard | no_score | author | photo |
-- partial | quote | line. Держать в согласии с src/lib/aiBatch.ts (подписи).

create or replace function iskra_private.hw_ai_grade_doubt(p_kind text, p_result jsonb, p_score integer, p_teacher uuid, p_subject text)
returns text language plpgsql stable security definer set search_path = public as $$
declare t jsonb; e jsonb; scored integer := 0;
begin
  if p_kind is distinct from 'basic' then return 'hard'; end if;
  if p_score is null or jsonb_typeof(p_result->'tasks') is distinct from 'array' then return 'no_score'; end if;
  for t in select value from jsonb_array_elements(p_result->'tasks') loop
    if coalesce((t->>'max_points')::int, 0) = 0 then
      -- Авторское задание с разбором: балл за него ставит только учитель.
      if jsonb_array_length(coalesce(t->'elements', '[]'::jsonb)) > 0 then return 'author'; end if;
      continue;
    end if;
    scored := scored + 1;
    for e in select value from jsonb_array_elements(coalesce(t->'elements', '[]'::jsonb)) loop
      if e->>'from' = 'photo' then return 'photo'; end if;
      if e->>'verdict' = 'partial' then return 'partial'; end if;
      if e->>'verdict' = 'yes' and e->'counted' is distinct from 'true'::jsonb then return 'quote'; end if;
    end loop;
    if (select count(*) from hw_ai_corrections c
         where c.teacher_id = p_teacher and c.subject = p_subject and c.diff = 'score'
           and c.kim_n = (t->>'kim_n')::int and c.created_at > now() - interval '60 days') >= 2 then
      return 'line';
    end if;
  end loop;
  if scored = 0 then return 'no_score'; end if;
  return null;
end; $$;

revoke all on function iskra_private.hw_ai_grade_doubt(text, jsonb, integer, uuid, text) from public, anon, authenticated;


-- ── Пакет: что применится ───────────────────────────────────────────────────

create or replace function public.hw_ai_grade_batch_preview()
returns table (id uuid, progress_id uuid, score integer, doubt text)
language sql stable security definer set search_path = public as $$
  select g.id, g.progress_id, g.score,
         iskra_private.hw_ai_grade_doubt(g.kind, g.result, g.score, g.teacher_id, g.subject)
    from hw_ai_grades g
    join lesson_progress lp on lp.id = g.progress_id and lp.status = 'submitted'
   where g.teacher_id = (select auth.uid())
     and g.status = 'graded'
     and (lp.attachments->>'attemptId') is not distinct from (g.result->>'attempt_id')
   order by g.submitted_at
$$;

revoke all on function public.hw_ai_grade_batch_preview() from public, anon;
grant execute on function public.hw_ai_grade_batch_preview() to authenticated;


-- ── Пакет: применить ────────────────────────────────────────────────────────
--
-- Каждая работа перепроверяется здесь же: уверенность, владелец, работа всё
-- ещё ждёт проверки и это та же попытка, что видел ИИ. Запись — как обычная
-- проверка учителя (completed + балл + комментарий ИИ от имени учителя), затем
-- отметка confirmed. Возвращает id применённых предоценок.

create or replace function public.hw_ai_grade_apply_batch(p_ids uuid[])
returns uuid[] language plpgsql security definer set search_path = public as $$
declare g record; applied uuid[] := '{}'; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 200 then raise exception 'too_many'; end if;
  for g in select h.* from hw_ai_grades h
            where h.id = any(p_ids) and h.teacher_id = uid and h.status = 'graded'
            order by h.submitted_at for update loop
    continue when iskra_private.hw_ai_grade_doubt(g.kind, g.result, g.score, g.teacher_id, g.subject) is not null;
    update lesson_progress
       set status = 'completed', score = g.score,
           review_comment = case when coalesce(btrim(g.comment), '') = '' then null
                                 else '<p>' || iskra_private.hw_ai_html(btrim(g.comment)) || '</p>' end,
           review_attachments = null
     where id = g.progress_id and status = 'submitted'
       and (attachments->>'attemptId') is not distinct from (g.result->>'attempt_id');
    continue when not found;
    update hw_ai_grades
       set status = 'confirmed', final_score = g.score, confirmed_by = uid,
           confirmed_at = now(), updated_at = now()
     where id = g.id;
    applied := applied || g.id;
  end loop;
  return applied;
end; $$;

revoke all on function public.hw_ai_grade_apply_batch(uuid[]) from public, anon;
grant execute on function public.hw_ai_grade_apply_batch(uuid[]) to authenticated;
