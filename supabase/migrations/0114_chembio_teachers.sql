-- Сводка ХимБио → Таскли для нескольких учителей (было — только Вадим, 0105).
--
-- Кому слать — таблица chembio_taskly_teachers: run_chembio_day() по будням
-- зовёт Edge Function chembio-day для каждого. В канале Таскли у каждого
-- учителя своя сводка (/chembio/day/<id>), в Таскли её выбирают в настройках.
-- Добавить учителя: insert into chembio_taskly_teachers values ('<uuid>');

create table if not exists public.chembio_taskly_teachers (
  teacher_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.chembio_taskly_teachers enable row level security;
revoke all on public.chembio_taskly_teachers from anon, authenticated;

insert into public.chembio_taskly_teachers values
  ('a2857e8b-b11f-45e1-a59e-336466b80db7'),  -- Вадим (thepoembyheart)
  ('84fe210b-677d-41e2-a3d9-74021390c0c2')   -- Даня, админ (dillatt@mail.ru)
on conflict do nothing;

create or replace function public.run_chembio_day()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day';
  secret text;
  t uuid;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'chembio_cron_secret'
  limit 1;

  if secret is null then
    raise notice 'chembio_cron_secret нет в Vault — сводка ХимБио пропущена';
    return;
  end if;

  for t in select teacher_id from public.chembio_taskly_teachers loop
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-chembio-secret', secret
      ),
      body    := jsonb_build_object('teacher_id', t),
      timeout_milliseconds := 30000
    );
  end loop;
end; $$;

revoke all on function public.run_chembio_day() from public, anon, authenticated;
