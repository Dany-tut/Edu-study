-- An authenticated Google/Apple account can open its own teacher cabinet.
-- A student cabinet still requires claim_student_account and a valid invitation.
create function public.activate_social_teacher_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null or not exists (
    select 1
    from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = account_id
      and u.email_confirmed_at is not null
      and (u.raw_app_meta_data->>'role' is null or u.raw_app_meta_data->>'role' = 'student')
      and i.provider in ('google', 'apple')
  ) then
    return false;
  end if;

  -- Only the caller's existing placeholder profile may be changed.
  -- A retry for a newly activated account is successful without a second update.
  perform 1 from public.profiles where id = account_id for update;
  if not found or exists (
    select 1 from public.students where auth_user_id = account_id
  ) then
    return false;
  end if;

  update public.profiles
     set role = 'teacher'
   where id = account_id and role = 'student';

  return exists (
    select 1 from public.profiles where id = account_id and role = 'teacher'
  );
end;
$$;

revoke all on function public.activate_social_teacher_account() from public, anon, authenticated;
grant execute on function public.activate_social_teacher_account() to authenticated;
