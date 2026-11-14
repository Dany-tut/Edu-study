-- Override inherited default table grants; RLS does not restrict TRUNCATE.
revoke all on public.transcript_corrections from authenticated;
grant select on public.transcript_corrections to authenticated;
grant update(status) on public.transcript_corrections to authenticated;
