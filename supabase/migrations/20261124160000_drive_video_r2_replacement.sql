-- Остаточный egress Supabase от записей уроков.
--
-- Записи переехали в Cloudflare R2 (bucket iskra-media): раздача оттуда —
-- бесплатный egress, тогда как каждый просмотр через Edge-функцию drive-video
-- шёл трафиком Supabase (54 ГБ за полмесяца 21–23.11.2026, ограничение проекта
-- с 26.11). БД уже чистая — ни один урок не ссылается на Google Drive, все
-- переведены на R2, старый адрес Диска сохранён в снимке
-- archive.lesson_video_urls_20261124. Но устаревшие клиентские бандлы (кеш SPA +
-- закешированные старые данные урока) ДО СИХ ПОР тянут видео через drive-video
-- (8467 ответов GET|206 за сутки на 24.11). Принудительно их не обновить.
--
-- Эта read-only функция по Drive-fileId из тикета находит текущую R2-замену
-- урока (снимок → lessons по id). drive-video отдаёт старому <video> редирект на
-- R2, и ни один байт больше не идёт трафиком Supabase. Данные не меняются.
--
-- Зовёт её только Edge-функция сервисным ключом (роль service_role); anon и
-- authenticated доступа не имеют.

create or replace function public.drive_video_r2_replacement(p_file_id text)
returns text
language sql
stable
security definer
set search_path = public, archive
as $$
  select l.youtube_url
  from archive.lesson_video_urls_20261124 a
  join public.lessons l on l.id = a.id
  -- `_` в Drive-fileId — подстановочный знак LIKE: экранируем его и `\`.
  where a.youtube_url like '%' || replace(replace(p_file_id, '\', '\\'), '_', '\_') || '%' escape '\'
    and l.youtube_url like 'https://pub-%r2.dev/%'
  limit 1
$$;

revoke all on function public.drive_video_r2_replacement(text) from public;
grant execute on function public.drive_video_r2_replacement(text) to service_role;
