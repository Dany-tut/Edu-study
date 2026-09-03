-- Промежуточное сохранение диагностики: ответ ушёл — ответ сохранён.
--
-- ПОЧЕМУ. Результат писался ОДИН раз, после последнего вопроса. Закрыл вкладку
-- на предпоследнем — не осталось ничего: ни ответов, ни того факта, что человек
-- вообще начинал. Для теста на полчаса это дорого, а для учителя ещё и слепое
-- пятно: «не проходил» и «бросил на середине» выглядели одинаково.
--
-- ПОЧЕМУ ЧЕРЕЗ RPC, А НЕ ПОЛИТИКОЙ НА UPDATE. Дописывать свою строку должен
-- уметь аноним: диагностику проходят по общей ссылке, без аккаунта. Прямой
-- UPDATE ему открыть нельзя — политика не умеет спрашивать «твоя ли это
-- строка», у анонима нет удостоверения. Поэтому владение подтверждается
-- секретом: клиент придумывает токен (uuid), держит его у себя и присылает
-- при каждой записи. Дверь одна и узкая — функция ниже, security definer,
-- как уже сделано для порядка курсов (0080).
--
-- ЧТО ТОКЕН НЕ ЗАЩИЩАЕТ. Подделать чужую строку по-прежнему нельзя (uuid не
-- угадывается), но завести свою может кто угодно — ровно как и раньше, вставка
-- анониму и так была открыта политикой `with check (true)`. Эта миграция не
-- расширяет доступ, она лишь переносит запись в контролируемое место.
--
-- ЗАВЕРШЁННЫЙ ПРОГОН НЕ ПЕРЕПИСЫВАЕТСЯ: у обновления стоит условие
-- `where completed = false`. Иначе владелец токена мог бы вечно править уже
-- сданный результат.

alter table public.diag_results
  add column if not exists owner_token text,
  add column if not exists answered    int,
  add column if not exists total       int,
  -- default true: всё, что лежало до этой миграции, — законченные прогоны.
  add column if not exists completed   boolean not null default true;

-- Частичный уникальный: у старых строк токена нет, и они не должны мешать.
create unique index if not exists diag_results_owner_token_key
  on public.diag_results (owner_token) where owner_token is not null;

-- Учителю почти всегда нужны только завершённые — отдельным индексом.
create index if not exists diag_results_completed_idx
  on public.diag_results (subject, completed);

create or replace function public.save_diag_progress(
  p_token         text,
  p_name          text,
  p_subject       text,
  p_results       jsonb,
  p_answers       jsonb,
  p_student_id    uuid,
  p_assignment_id uuid,
  p_score_pct     int,
  p_answered      int,
  p_total         int,
  p_completed     boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Токен короче 16 символов — это не uuid, а попытка перебора.
  if p_token is null or length(p_token) < 16 then
    raise exception 'save_diag_progress: bad owner token';
  end if;

  insert into public.diag_results as d (
    owner_token, name, subject, results, answers,
    linked_student_id, student_id, assignment_id,
    score_pct, answered, total, completed
  ) values (
    p_token, p_name, p_subject, coalesce(p_results, '{}'::jsonb), coalesce(p_answers, '{}'::jsonb),
    p_student_id, p_student_id, p_assignment_id,
    p_score_pct, p_answered, p_total, coalesce(p_completed, false)
  )
  -- Условие индекса приходится повторить: под ЧАСТИЧНЫЙ уникальный индекс
  -- Postgres цель конфликта сам не подбирает и падает с 42P10.
  on conflict (owner_token) where owner_token is not null do update set
    -- Предмет, ученик и назначение проставляются при заведении строки и дальше
    -- не меняются: подменять их на ходу токен права не даёт.
    name       = excluded.name,
    results    = excluded.results,
    answers    = excluded.answers,
    score_pct  = excluded.score_pct,
    answered   = excluded.answered,
    total      = excluded.total,
    completed  = excluded.completed
  where d.completed = false;
end
$$;

revoke all on function public.save_diag_progress(text, text, text, jsonb, jsonb, uuid, uuid, int, int, int, boolean) from public;
grant execute on function public.save_diag_progress(text, text, text, jsonb, jsonb, uuid, uuid, int, int, int, boolean) to anon, authenticated;
