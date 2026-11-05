-- Двухфакторная защита — на стороне базы.
--
-- До этого код из приложения спрашивал только сайт: зная пароль, можно было
-- обратиться к базе напрямую. Теперь база сама отказывает сессии, которая у
-- аккаунта с включённой защитой ещё не подтверждена кодом (aal1).
-- Аккаунты без защиты работают как раньше.
--
-- Три слоя:
--   1. public.mfa_pre_request — PostgREST вызывает его перед КАЖДЫМ запросом
--      (таблицы, представления и все RPC, в том числе security definer).
--   2. Ограничивающее правило mfa_required на каждой таблице public — для
--      Realtime и всего, что ходит в таблицы мимо PostgREST.
--   3. То же правило на storage.objects — файлы.
-- Edge Functions с сервисным ключом проверяют то же сами (_shared/mfa.ts).

-- Можно ли этой сессии к данным. Без пользователя (anon, service_role) — да.
create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is null
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
$$;
revoke execute on function public.mfa_ok() from public;
grant execute on function public.mfa_ok() to anon, authenticated, service_role;

-- Перед каждым запросом PostgREST.
create or replace function public.mfa_pre_request()
returns void
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  -- current_user здесь — владелец функции; кто спрашивает, знает mfa_ok() по JWT.
  if not public.mfa_ok() then
    raise sqlstate 'PT403' using
      message = 'mfa_required',
      detail = 'Подтвердите вход кодом из приложения',
      hint = 'aal2';
  end if;
end
$$;
revoke execute on function public.mfa_pre_request() from public;
grant execute on function public.mfa_pre_request() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request to 'public.mfa_pre_request';
notify pgrst, 'reload config';

-- Правило на каждой таблице public. Ограничивающее (restrictive): действует
-- поверх существующих разрешений и ничего не открывает.
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists mfa_required on public.%I', t.relname);
    execute format(
      'create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))',
      t.relname);
  end loop;
end
$$;

drop policy if exists mfa_required on storage.objects;
create policy mfa_required on storage.objects as restrictive for all to authenticated
  using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
