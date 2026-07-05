-- Admin visibility + control over PENDING teacher invites (not yet activated).
--
-- Registered teachers live in `profiles` (surfaced by admin_teacher_list). A
-- teacher who was sent an invite link but hasn't signed up yet exists only as a
-- row in `teacher_invites` with consumed_at IS NULL — invisible to the admin.
-- These functions let the admin see who hasn't activated and revoke a stale invite.

-- List unconsumed teacher invites (admin only).
create or replace function public.admin_pending_teacher_invites()
returns table (
  token uuid,
  email text,
  created_at timestamptz,
  created_by uuid,
  created_by_name text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    ti.token, ti.email, ti.created_at, ti.created_by,
    (select p.name from public.profiles p where p.id = ti.created_by) as created_by_name
  from public.teacher_invites ti
  where ti.consumed_at is null
    and public.is_admin()
  order by ti.created_at desc;
$$;

-- Revoke (delete) a pending invite by token (admin only). No-op on consumed ones.
create or replace function public.admin_revoke_teacher_invite(p_token uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Только администратор может отозвать приглашение';
  end if;
  delete from public.teacher_invites
  where token = p_token and consumed_at is null;
end;
$$;

revoke all on function public.admin_pending_teacher_invites() from public, anon;
revoke all on function public.admin_revoke_teacher_invite(uuid) from public, anon;
grant execute on function public.admin_pending_teacher_invites() to authenticated;
grant execute on function public.admin_revoke_teacher_invite(uuid) to authenticated;
