-- Двухфакторная защита — по желанию для всех, без срока для учителей (решение Дани 05.11).
-- Убираем срок из 20261105150000 и оставляем только счётчик запасных кодов.
drop function if exists public.my_mfa_requirement();
drop table if exists public.mfa_policy;

create or replace function public.my_mfa_backup_codes_left()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::integer from public.mfa_backup_codes c
  where c.user_id = auth.uid() and c.used_at is null
$$;
revoke execute on function public.my_mfa_backup_codes_left() from public, anon;
grant execute on function public.my_mfa_backup_codes_left() to authenticated;
