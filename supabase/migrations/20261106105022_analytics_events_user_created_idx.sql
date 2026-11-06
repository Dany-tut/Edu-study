-- Stata: последнее «живое» событие пользователя за несколько чтений индекса
-- вместо проверки на автотест по всем его событиям за 30 дней.
create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);
