-- Поиск auth-пользователя по email для edge-функции social-oauth (решение
-- login / link_candidate / create). Нужен, чтобы edge НЕ авто-мёржил по email
-- вслепую: сначала узнаёт, есть ли аккаунт с таким email, и только потом — через
-- подтверждение владения — предлагает привязку.
--
-- ТОЛЬКО service_role (edge). Раскрывать соответствие email→user_id кому-то ещё
-- нельзя (разведка аккаунтов). SECURITY DEFINER читает auth.users, недоступную
-- PostgREST; search_path пуст (все имена — полные). Роль не трогаем.
create or replace function public.auth_user_id_by_email(p_email text)
returns table (user_id uuid, email_confirmed boolean)
language sql
security definer
set search_path = ''
as $$
  select u.id, (u.email_confirmed_at is not null)
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  order by u.created_at asc
  limit 1
$$;

revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
