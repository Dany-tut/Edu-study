-- The rollup cache is populated incrementally by the insert trigger. Do not run
-- a broad backfill scan during the daily retention job after initial catch-up.
revoke all on function iskra_private.capture_analytics_overview_event() from public, anon, authenticated;

create or replace function public.prune_analytics()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  removed integer := 0;
  n integer;
begin
  delete from public.analytics_events
   where event in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '14 days';
  get diagnostics n = row_count;
  removed := removed + n;

  delete from public.analytics_events
   where event not in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  removed := removed + n;

  perform iskra_private.prune_analytics_overview();
  return removed;
end $$;
