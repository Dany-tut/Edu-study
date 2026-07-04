-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0015_security_hardening — non-breaking advisor fixes                        ║
-- ║                                                                            ║
-- ║ Safe to apply on prod: does NOT tighten any student-facing policy (students║
-- ║ authenticate via anon/legacy sessions, so owner-scoped RLS would lock them ║
-- ║ out). Only pins function search_path and revokes anon EXECUTE on admin RPCs║
-- ║ (which already self-gate via is_admin()).                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Resilient: resolves each function by name in pg_proc and alters only the
-- overloads that actually exist, so a missing/renamed function can't abort the
-- whole migration. `public` (not '') keeps unqualified table refs resolving.
do $$
declare
  fn record;
  target text;
  targets text[] := array[
    'my_student_id','seed_student_progress','sync_student_last_visit',
    'student_login','set_updated_at','is_admin'
  ];
begin
  -- 1. Pin search_path on the flagged functions (by whatever signature exists).
  foreach target in array targets loop
    for fn in
      select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = target
    loop
      execute format('alter function %s set search_path = public;', fn.sig);
    end loop;
  end loop;

  -- 2. Revoke anon EXECUTE on admin_* RPCs (they already self-gate via is_admin()).
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from anon;', fn.sig);
  end loop;
end $$;
