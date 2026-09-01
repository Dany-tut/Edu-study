-- Ежемесячный запуск разбора телеметрии.
--
-- Расписание живёт в базе (pg_cron), а сам разбор — в Edge Function
-- analytics-digest: там ключ kie.ai, и он не должен попадать ни в SQL, ни в
-- браузер. Задача cron сводится к одному HTTP-вызову.
--
-- ЧЕГО ЗДЕСЬ НЕТ. Секрета, которым функция узнаёт cron. Он лежит в Vault под
-- именем analytics_digest_secret, и если его там нет — задача честно ничего не
-- делает и пишет notice, вместо того чтобы каждый месяц молча стучаться без
-- авторизации.

create extension if not exists pg_net;

create or replace function public.run_analytics_digest()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/analytics-digest';
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'analytics_digest_secret'
  limit 1;

  if secret is null then
    raise notice 'analytics_digest_secret нет в Vault — разбор пропущен';
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-digest-secret', secret
    ),
    body    := jsonb_build_object('days', 30),
    -- Модель пишет разбор минуту-полторы, плюс до трёх попыток, если у
    -- провайдера пуст пул аккаунтов. Дефолтные 5 секунд обрывают вызов.
    timeout_milliseconds := 300000
  );
end; $$;

revoke all on function public.run_analytics_digest() from public;

-- Первое число месяца, 06:00 UTC. unschedule перед schedule — чтобы миграция
-- была идемпотентной: повторный прогон не заводит второй задачи.
select cron.unschedule('analytics-digest-monthly')
where exists (select 1 from cron.job where jobname = 'analytics-digest-monthly');

select cron.schedule(
  'analytics-digest-monthly',
  '0 6 1 * *',
  $$select public.run_analytics_digest()$$
);
