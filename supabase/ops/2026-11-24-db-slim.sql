-- Ужимание базы 24.11.2026 (лимит Supabase Free 500 МБ, было ~460 МБ).
-- Запускать ТОЛЬКО после проверенной копии:
--   ~/Backups/iskra-db-slim-2026-11-24.dump (analytics_events + cron.job_run_details).
-- Пользовательские учебные данные не затрагиваются.

-- 1. Успешные быстрые api_request: телеметрия «запрос прошёл», ~68 % строк
--    analytics_events. Ошибки (статус 0 или 400+) и медленные (от 3 с) остаются.
--    С коммита db-slim клиент такие события больше не пишет.
delete from public.analytics_events
where event = 'api_request'
  and coalesce(meta->>'status', '') ~ '^[1-3][0-9]{2}$'
  and not (coalesce(meta->>'duration_ms', '') ~ '^[0-9]{1,9}(\.[0-9]+)?$'
           and (meta->>'duration_ms')::numeric >= 3000);

-- 1а. iskra_private.stata_user_seen ссылается на событие (ON DELETE CASCADE):
--     пересобрать «последний визит» тем же правилом, что и в 20261124042105.
insert into iskra_private.stata_user_seen(user_id, event_id, last_seen)
select u.user_id, l.id, l.created_at from (
  with recursive ids as (
   (select user_id from public.analytics_events where user_id is not null order by user_id limit 1)
   union all
   select (select e.user_id from public.analytics_events e where e.user_id>ids.user_id order by e.user_id limit 1) from ids where ids.user_id is not null
  ) select user_id from ids where user_id is not null
) u cross join lateral (
  select e.id, e.created_at from public.analytics_events e
  where e.user_id=u.user_id and e.created_at>now()-interval '30 days' and e.created_at<=now()
   and not public.stata_iskra_automated(e.event,e.meta,e.ua)
  order by e.created_at desc limit 1
) l
on conflict (user_id) do update set event_id=excluded.event_id, last_seen=excluded.last_seen
 where iskra_private.stata_user_seen.last_seen < excluded.last_seen;

-- 2. Журнал запусков pg_cron: хранить 7 дней, чистить каждую ночь.
delete from cron.job_run_details where end_time < now() - interval '7 days';
select cron.schedule('cron-log-cleanup', '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

-- 3. Почти не используемые индексы analytics_events (6, 33 и 49 обращений
--    за всё время). Определения для восстановления:
--    CREATE INDEX analytics_events_real_page_cover_idx ON public.analytics_events USING btree (created_at DESC) INCLUDE (path, role, event) WHERE ((path IS NOT NULL) AND analytics_is_real_traffic(meta));
--    CREATE INDEX analytics_events_role_created_idx ON public.analytics_events USING btree (role, created_at DESC);
--    CREATE INDEX analytics_events_session_idx ON public.analytics_events USING btree (session_id);
drop index if exists public.analytics_events_real_page_cover_idx;
drop index if exists public.analytics_events_role_created_idx;
drop index if exists public.analytics_events_session_idx;

-- 4. Вернуть место на диске: ОТДЕЛЬНЫМ запуском (VACUUM не работает внутри
--    транзакции). Таблица событий блокируется на несколько секунд.
-- vacuum full public.analytics_events;
