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
