-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0025_lock_admin_functions — durable guard for admin_* RPC exposure          ║
-- ║                                                                            ║
-- ║ Postgres grants EXECUTE to PUBLIC on every newly-created function by        ║
-- ║ default, so anon inherits access. Each new `admin_*` RPC therefore silently ║
-- ║ re-opens itself to unauthenticated callers until manually revoked.          ║
-- ║                                                                            ║
-- ║ This installs an event trigger that auto-revokes EXECUTE from PUBLIC + anon ║
-- ║ on any newly created `public.admin_*` function. SURGICAL: only admin_*      ║
-- ║ functions are touched — intended-public RPCs (student_login, etc.) and      ║
-- ║ trigger functions are unaffected. authenticated keeps EXECUTE (the          ║
-- ║ functions' own is_admin() gate still governs actual access).               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Event-trigger handler: lock down any freshly created admin_* function.
create or replace function public.lock_admin_function_execute()
returns event_trigger
language plpgsql
security definer
set search_path = public
as $$
declare obj record;
begin
  for obj in
    select object_identity, schema_name
    from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE FUNCTION'
  loop
    -- object_identity is the full signature, e.g. public.admin_foo(integer),
    -- which is exactly what REVOKE EXECUTE ON FUNCTION expects.
    if obj.schema_name = 'public' and obj.object_identity like 'public.admin\_%' then
      execute format('revoke execute on function %s from public, anon;', obj.object_identity);
    end if;
  end loop;
end;
$$;

drop event trigger if exists lock_admin_function_execute_trg;
create event trigger lock_admin_function_execute_trg
  on ddl_command_end
  when tag in ('CREATE FUNCTION')
  execute function public.lock_admin_function_execute();

-- One-time sweep: close any admin_* functions that already exist (idempotent —
-- safe to re-run; no-op once everything is already revoked).
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from public, anon;', fn.sig);
  end loop;
end $$;
