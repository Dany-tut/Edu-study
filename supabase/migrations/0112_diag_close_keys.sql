-- Второй шаг 0111: ключи диагностик закрываются.
--
-- Применять ПОСЛЕ выката клиента, который берёт вопросы из get_diag_questions:
-- старая сборка читала diag_questions напрямую и без этой таблицы показывала
-- бы «Тест не найден». Почему и что именно — в шапке 0111.

-- ── Ключи — только staff ────────────────────────────────────────────────────

drop policy if exists anon_read on public.diag_questions;
drop policy if exists auth_read on public.diag_questions;
drop policy if exists diag_questions_read_staff on public.diag_questions;
create policy diag_questions_read_staff on public.diag_questions
  for select to authenticated using (public.is_staff());
revoke all on public.diag_questions from anon;

-- ── Прямая вставка — только скринингу ───────────────────────────────────────

drop policy if exists diag_results_insert on public.diag_results;
create policy diag_results_insert on public.diag_results
  for insert to anon, authenticated with check (subject = 'logic');

-- ── Сданный прогон: присланное не пересчитывается ──────────────────────────
--
-- В 0111 повторный вызов по сданному токену строку не трогал, но балл в ответе
-- считал по ответам, слитым с присланными. Прислал после сдачи «kopl-3: 0» —
-- балл вырос — значит, верно: оракул по одному вопросу. Найдено проверкой
-- после применения 0111.

create or replace function public.save_diag_progress(
  p_token         text,
  p_name          text,
  p_subject       text,
  p_results       jsonb,     -- не используется: считает база
  p_answers       jsonb,
  p_student_id    uuid,
  p_assignment_id uuid,
  p_score_pct     int,       -- не используется
  p_answered      int,       -- не используется
  p_total         int,       -- не используется
  p_completed     boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       public.diag_results;
  v_subject   text;
  v_student   uuid;
  v_assign    uuid;
  v_feedback  boolean;
  v_answers   jsonb;
  v_completed boolean;
  v_results   jsonb := '{}'::jsonb;
  v_fb        jsonb := '{}'::jsonb;
  v_answered  int := 0;
  v_correct   int := 0;
  v_total     int := 0;
  v_score     int;
  v_type      text;
  q           public.diag_questions;
  a           jsonb;
  ok          boolean;
  sec         jsonb;
begin
  -- Токен короче 16 символов — это не uuid, а попытка перебора.
  if p_token is null or length(p_token) < 16 then
    raise exception 'save_diag_progress: bad owner token';
  end if;

  select * into v_row from public.diag_results where owner_token = p_token for update;

  -- Предмет, ученик и назначение берутся при заведении строки и дальше не
  -- меняются: подменять их на ходу токен права не даёт.
  v_subject := coalesce(v_row.subject, p_subject);
  if v_row.owner_token is not null then
    v_student := v_row.student_id;
    v_assign  := v_row.assignment_id;
  else
    v_student := p_student_id;
    -- Назначение — только настоящее и на этот же тест: по нему открывается
    -- обратная связь с верными ответами.
    select ta.id into v_assign from public.test_assignments ta
    where ta.id = p_assignment_id and ta.subject = v_subject;
  end if;
  v_feedback := v_assign is not null;

  -- Записанный ответ не переписывается: старое значение побеждает при слиянии.
  -- У сданного прогона присланное не учитывается вовсе: иначе ответ функции
  -- (пересчитанный балл) выдавал бы верность новых ответов.
  v_answers := case
    when coalesce(v_row.completed, false) then v_row.answers
    else case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end
         || coalesce(v_row.answers, '{}'::jsonb)
  end;
  v_completed := coalesce(v_row.completed, false) or coalesce(p_completed, false);

  for q in select * from public.diag_questions where subject = v_subject order by position loop
    v_total := v_total + 1;
    a := v_answers -> q.id;
    -- Брошенный на середине прогон считается только по отвеченным: иначе 3/36
    -- вместо 3/3 по первой системе читалось бы как провал.
    if a is null and not v_completed then continue; end if;
    ok := public.diag_is_correct(q, a);
    if a is not null then v_answered := v_answered + 1; end if;
    if ok then v_correct := v_correct + 1; end if;
    sec := coalesce(v_results -> q.section, '{"correct":0,"total":0}'::jsonb);
    v_results := v_results || jsonb_build_object(q.section, jsonb_build_object(
      'correct', (sec->>'correct')::int + ok::int,
      'total',   (sec->>'total')::int + 1));
    if v_feedback and a is not null then
      v_fb := v_fb || jsonb_build_object(q.id, jsonb_build_object(
        'correct', ok,
        'label', coalesce(public.diag_correct_label(q), '')));
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'save_diag_progress: unknown test %', v_subject;
  end if;

  v_score := case
    when v_completed then round(v_correct * 100.0 / v_total)
    when v_answered > 0 then round(v_correct * 100.0 / v_answered)
    else 0 end;

  -- Сданный прогон не переписывается — только отдаём его итог (повтор отправки).
  if not coalesce(v_row.completed, false) then
    insert into public.diag_results as d (
      owner_token, name, subject, results, answers,
      linked_student_id, student_id, assignment_id,
      score_pct, answered, total, completed
    ) values (
      p_token, p_name, v_subject, v_results, v_answers,
      v_student, v_student, v_assign,
      v_score, case when v_completed then v_total else v_answered end, v_total, v_completed
    )
    -- Условие индекса приходится повторить: под ЧАСТИЧНЫЙ уникальный индекс
    -- Postgres цель конфликта сам не подбирает и падает с 42P10.
    on conflict (owner_token) where owner_token is not null do update set
      name      = excluded.name,
      results   = excluded.results,
      answers   = excluded.answers || d.answers,
      score_pct = excluded.score_pct,
      answered  = excluded.answered,
      total     = excluded.total,
      completed = excluded.completed
    where d.completed = false;

    -- Балл в карточку ученика — только по назначению, где он и правда есть.
    if v_completed and v_assign is not null and v_student is not null then
      select ta.assign_type into v_type from public.test_assignments ta
      where ta.id = v_assign
        and (v_student = any(ta.student_ids) or exists (
          select 1 from public.students s where s.id = v_student and s.group_id = any(ta.group_ids)));
      if v_type = 'trial' then
        update public.students set trial_score = v_score where id = v_student;
      elsif v_type is not null then
        update public.students set test_score = v_score where id = v_student;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'completed', v_completed,
    'answered',  v_answered,
    'total',     v_total,
    -- По общей ссылке разбивка — только после сдачи: на ходу она выдавала бы
    -- верность каждого ответа.
    'results',   case when v_completed or v_feedback then v_results end,
    'score_pct', case when v_completed or v_feedback then v_score end,
    'feedback',  case when v_feedback then v_fb end
  );
end
$$;
