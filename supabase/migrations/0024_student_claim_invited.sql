-- Fix: a freshly-registered student could never write their own students row.
--
-- JoinPage calls supabase.auth.signUp() (email confirmation disabled), which
-- returns a session immediately — so the client switches from `anon` to
-- `authenticated` BEFORE the follow-up UPDATE that links the auth account to the
-- invited students row. The existing `anon_register_by_invite_token` policy only
-- covers the `anon` role, and the only `authenticated` write policy on students
-- requires is_teacher(). Result: the UPDATE matches 0 rows silently (no error),
-- leaving email/temp_password/auth_user_id NULL and invite_token unclaimed — so
-- the teacher never sees the student's login/password.
--
-- Allow an authenticated user to claim an invited row (invite_token present,
-- not yet registered) as long as they stamp their own auth.uid() onto it. This
-- is no broader than the anon policy that already permits the same claim.

create policy student_claim_invited on students
  for update to authenticated
  using (invite_token is not null and email is null)
  with check (auth_user_id = auth.uid());
