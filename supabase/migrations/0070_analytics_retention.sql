-- Срок хранения телеметрии и уборка брошенных таблиц.
--
-- ЧТО ИЗМЕРЕНО (27.08.2026). `analytics_events` — 103 199 строк и 43 МБ при
-- размере всей базы 74 МБ, то есть больше половины. Данные копятся с 29 июня,
-- срока хранения нет никакого.
--
-- ПОЧЕМУ НЕ «УДАЛЯТЬ СТАРШЕ 90 ДНЕЙ». Такое правило сегодня не удалило бы НИ
-- ОДНОЙ строки: самой старой записи 59 дней. Оно выглядит как решение и не
-- делает ничего. Считать надо не по возрасту, а по тому, ЧТО именно копится:
--
--   heartbeat    49 168   13 МБ   47.6%
--   click        19 936  6.7 МБ   19.3%
--   rage_click   16 683  5.3 МБ   16.2%
--   ─────────────────────────────────────
--   всё остальное вместе          ~17%
--
-- Восемьдесят три процента таблицы — поведенческий поток: тепловые карты и
-- «где человек бесится». Его смотрят за последние дни и никогда — за прошлый
-- квартал. А бизнес-события (вход, урок, тренажёр, ошибки) занимают шестую
-- часть места и нужны надолго: по ним считается воронка.
--
-- Отсюда два разных срока, а не один общий.
--
-- ЧЕГО ЗДЕСЬ НЕТ. Удаления мусорных уроков из прода: это контент, и решать,
-- что из восемнадцати «кусок говно» удалять, должен человек, а не миграция.

-- ── 1. Расписание: pg_cron ───────────────────────────────────────────────────
--
-- В проекте расширение не включено. На Supabase оно ставится из SQL-редактора
-- (или через Database → Extensions) — здесь строка на месте, чтобы миграция
-- была самодостаточной.
create extension if not exists pg_cron with schema extensions;

-- ── 2. Правило ───────────────────────────────────────────────────────────────
create or replace function public.prune_analytics()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  removed integer;
begin
  -- Поток поведения: две недели. Дальше он не нужен ни одному экрану.
  delete from public.analytics_events
   where event in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '14 days';
  get diagnostics removed = row_count;

  -- Всё остальное — полгода: воронку смотрят по кварталам.
  delete from public.analytics_events
   where event not in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '180 days';
  get diagnostics removed = removed + row_count;

  return removed;
end $$;

revoke execute on function public.prune_analytics() from public, anon, authenticated;

-- Раз в сутки в 03:20 UTC — глубокая ночь и в Москве, и в Сеуле.
select cron.schedule('prune-analytics', '20 3 * * *', $$select public.prune_analytics()$$);

-- ── 3. Первый прогон ─────────────────────────────────────────────────────────
--
-- По замеру на 27.08.2026 снимает около 70 тысяч строк (порядка 20 МБ).
-- VACUUM FULL здесь не зовём: он берёт исключительную блокировку на таблицу,
-- а место всё равно переиспользуется под новые события.
select public.prune_analytics();

-- ── 4. Брошенные таблицы-бэкапы ──────────────────────────────────────────────
--
-- Пять штук, вместе 464 КБ — дело не в размере. У них включён RLS и ноль
-- политик, поэтому они висят в advisors как «RLS Enabled No Policy» и
-- заслоняют собой настоящие находки. Снимки делались перед правками курсов
-- 25.08 и уже неактуальны.
drop table if exists public._bak_20260825_modules;
drop table if exists public._bak_20260825_lesson_mod;
drop table if exists public._bak_20260825_courses;
drop table if exists public._backup_kotp_homework;
drop table if exists public._backup_kotp_dupes;

-- ─────────────────────────────────────────────────────────────────────────────
-- ОТКАТ
-- ─────────────────────────────────────────────────────────────────────────────
--
-- select cron.unschedule('prune-analytics');
-- drop function if exists public.prune_analytics();
--
-- Удалённые события и снимки не восстанавливаются: если они ещё нужны, снимите
-- дамп ДО применения.
