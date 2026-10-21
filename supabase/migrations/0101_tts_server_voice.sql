-- Озвучка с сервера — запасной голос для устройств, где синтез в браузере молчит.
--
-- ЗАЧЕМ. На части айфонов (21.10.2026, iOS 18.7 / Safari 27.2) Web Speech
-- проходит фразу целиком — onstart, onboundary, onend, ошибок нет, — а звука
-- нет никаким голосом, хотя <audio> и YouTube на том же телефоне звучат. Для
-- таких устройств фраза синтезируется на сервере (Edge Function `tts`) и
-- играется медиаэлементом.
--
-- ЧТО ЗДЕСЬ.
-- 1. Рубильник `ai_tts`: синтез платный (Google Cloud TTS), поэтому он живёт
--    рядом с остальными `ai_*` в Админка → Обзор → «Расход на ИИ». Работает при
--    поднятых ОБОИХ флагах — общем `ai_enabled` и своём. Выключен — готовое
--    аудио из кэша всё равно отдаётся (оно уже оплачено), новое не синтезируется.
-- 2. Публичный бакет `tts`: готовые mp3 по хешу (голос + скорость + текст).
--    Фразы наборов одни и те же у всех учеников, поэтому платим за фразу один
--    раз. Пишет только функция ключом service role, читают все по прямой ссылке.
-- 3. `tts_spend` — сколько знаков синтезировано за день: функция не начинает
--    новый синтез сверх дневного потолка (TTS_DAILY_CHARS в секретах функции).
insert into public.app_flags (key, enabled, about) values
  ('ai_tts', true,
   'Озвучка с сервера (Google Cloud TTS) для устройств, где голос браузера молчит. Выключено: звучит только то, что уже лежит в кэше.')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts', 'tts', true, 2097152, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.tts_spend (
  day   date primary key,
  chars integer not null default 0
);

-- Только для функции (service role обходит RLS); снаружи таблица закрыта.
alter table public.tts_spend enable row level security;

-- Прибавка одним запросом: два ученика, нажавшие «Послушать» одновременно,
-- не должны затирать счёт друг друга.
create or replace function public.tts_spend_add(n integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.tts_spend (day, chars) values (current_date, n)
  on conflict (day) do update set chars = public.tts_spend.chars + excluded.chars
  returning chars;
$$;

revoke all on function public.tts_spend_add(integer) from public, anon, authenticated;
