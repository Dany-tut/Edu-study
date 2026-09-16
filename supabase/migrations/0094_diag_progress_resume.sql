-- Продолжить недопройденную диагностику: по ссылке учителя или на том же устройстве.
--
-- ПОЧЕМУ. Ход прохождения жил только во вкладке (sessionStorage). Закрыл её —
-- по ссылке тест начинался заново, а брошенный прогон оставался в таблице
-- учителя отдельной строкой рядом с новым. Строка в базе при этом уже была —
-- с ответами, дописанная после каждого вопроса (0082). Не хватало только
-- двери, через которую её можно прочитать обратно.
--
-- ВЛАДЕНИЕ — ТЕМ ЖЕ ТОКЕНОМ, что и запись (0082): аноним без аккаунта, SELECT
-- ему по политике не положен, поэтому одна узкая security definer функция.
-- Токен знает сам ученик (его устройство) и учитель (видит строку в таблице
-- и отдаёт ссылку «Продолжить»). uuid не угадывается.
--
-- СБРОС. «Начать заново» на устройстве, где лежит брошенный прогон, удаляет
-- его — иначе в таблице снова две строки. Удаляется только незаконченный:
-- сданный результат токен удалить не даёт.

create or replace function public.load_diag_progress(p_token text)
returns table (
  name          text,
  subject       text,
  answers       jsonb,
  completed     boolean,
  student_id    uuid,
  assignment_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select d.name, d.subject, d.answers, d.completed, d.student_id, d.assignment_id
  from public.diag_results d
  where p_token is not null and length(p_token) >= 16 and d.owner_token = p_token
  limit 1
$$;

create or replace function public.discard_diag_progress(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.diag_results
  where p_token is not null and length(p_token) >= 16
    and owner_token = p_token and completed = false
$$;

revoke all on function public.load_diag_progress(text) from public;
revoke all on function public.discard_diag_progress(text) from public;
grant execute on function public.load_diag_progress(text) to anon, authenticated;
grant execute on function public.discard_diag_progress(text) to anon, authenticated;
