-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0015_security_hardening — non-breaking advisor fixes                        ║
-- ║                                                                            ║
-- ║ Safe to apply on prod: does NOT tighten any student-facing policy (students║
-- ║ authenticate via anon/legacy sessions, so owner-scoped RLS would lock them ║
-- ║ out). Only pins function search_path and revokes anon EXECUTE on admin RPCs║
-- ║ (which already self-gate via is_admin()).                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Pin search_path on functions the linter flagged as role-mutable.
--    `public` (not '') keeps unqualified table refs (students, lesson_progress)
--    resolving — this removes the warning without changing behaviour.
alter function public.my_student_id()                   set search_path = public;
alter function public.seed_student_progress(uuid, uuid) set search_path = public;
alter function public.sync_student_last_visit()         set search_path = public;
alter function public.student_login(text, text)         set search_path = public;
alter function public.set_updated_at()                  set search_path = public;
alter function public.is_admin()                        set search_path = public;

-- 2. Defense-in-depth: revoke anon EXECUTE on admin_* RPCs. They already reject
--    non-admins internally; anon has no reason to reach them at all.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from anon;', fn.sig);
  end loop;
end $$;
