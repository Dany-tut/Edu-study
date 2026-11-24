-- Testly pings Iskra only on a student's submission. Grades the teacher sets
-- later in Testly (manual part) and lost pings are picked up by testly-sync's
-- sweep every 5 minutes. Secret lives in vault ('iskra_testly_sweep_secret')
-- and in the function env TESTLY_SWEEP_SECRET; never in git.
create or replace function iskra_private.dispatch_testly_sweep()
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare sweep_secret text;
begin
  select decrypted_secret into sweep_secret from vault.decrypted_secrets where name = 'iskra_testly_sweep_secret' limit 1;
  if sweep_secret is null then return; end if;
  perform net.http_post(
    url := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/testly-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sweep-secret', sweep_secret),
    body := jsonb_build_object('action', 'sweep'),
    timeout_milliseconds := 30000);
end;
$$;
revoke all on function iskra_private.dispatch_testly_sweep() from public, anon, authenticated;

select cron.unschedule('testly-sweep') where exists (select 1 from cron.job where jobname = 'testly-sweep');
select cron.schedule('testly-sweep', '*/5 * * * *', $$
  select iskra_private.dispatch_testly_sweep() where exists (
    select 1 from public.lesson_progress
    where attachments @> '{"v":"basic-1","rows":[{"type":"testly"}]}'::jsonb
      and attachments->>'reviewedAt' is null
      and updated_at > now() - interval '60 days')
$$);
