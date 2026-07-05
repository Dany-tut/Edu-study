-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0027_invite_token_rpc — stop anon enumeration of invited students           ║
-- ║                                                                            ║
-- ║ Applied 2026-07-04 via execute_sql. Before: `anon_read_by_invite_token`     ║
-- ║ let anon SELECT every not-yet-registered student row (name + group leak,    ║
-- ║ token enumeration). Now anon resolves a student only by supplying the exact ║
-- ║ UUID token they already hold — no listing possible. JoinPage.tsx updated to ║
-- ║ call this RPC instead of a direct table read.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.get_invited_student(p_token uuid)
returns table(id uuid, name text, group_id uuid)
language sql stable security definer set search_path = public
as $$
  select s.id, s.name, s.group_id
  from public.students s
  where s.invite_token = p_token
  limit 1;
$$;
revoke all on function public.get_invited_student(uuid) from public;
grant execute on function public.get_invited_student(uuid) to anon, authenticated;

drop policy if exists anon_read_by_invite_token on public.students;
