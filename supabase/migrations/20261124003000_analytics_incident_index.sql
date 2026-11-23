-- Админка → Аналитика → Диагностика висела на «Загрузке»: выборка последних
-- 500 сбоев шла по analytics_events_created_idx и отбрасывала ~20 тыс. строк
-- api_request/heartbeat, читая тяжёлый meta с диска (~11 с > statement_timeout 8 с).
-- Частичный индекс только по событиям-сбоям: 30/90 дней — ~0,1 с под RLS админа.
-- Список обязан совпадать с INCIDENT_EVENTS + 'network_offline'
-- (src/lib/incidentTelemetry.ts, AnalyticsDiagnostics.tsx). Новое событие вне
-- списка запрос не сломает, но вернёт медленный план — дополните индекс.
-- Применено на проде 24.11.2026 через CREATE INDEX CONCURRENTLY; здесь IF NOT EXISTS.
create index if not exists analytics_events_incident_created_idx
  on public.analytics_events using btree (created_at desc)
  where event = any ('{db_error,js_error,promise_rejection,react_crash,widget_crash,native_crash,bootstrap_error,api_slow,api_stalled,ui_freeze,ui_loading_stalled,ui_blank,operation_failed,auth_failed,auth_stalled,resource_error,video_buffering_start,video_buffering_end,video_unexpected_seek,video_playback_error,video_playback_retry,video_dropped_frames,network_offline}'::text[]);
