-- Restored from migration 20261030140111 before dependent storage policy.
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.can_read_homework_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id::text = (storage.foldername(p_name))[2]
        and s.auth_user_id::text = (storage.foldername(p_name))[1]
        and g.created_by = (select auth.uid())
    )
  );
$$;
revoke all on function private.can_read_homework_photo(text) from public, anon;
grant execute on function private.can_read_homework_photo(text) to authenticated;

