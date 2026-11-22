-- Dedicated export identity. No application users/rows or existing policies change.
create role iskra_server_backup login bypassrls connection limit 2;
grant pg_read_all_data to iskra_server_backup;
alter role iskra_server_backup set default_transaction_read_only = on;
alter role iskra_server_backup set statement_timeout = '15min';
alter role iskra_server_backup set lock_timeout = '10s';
alter role iskra_server_backup set idle_in_transaction_session_timeout = '60s';
-- Password is generated and provisioned separately; never commit credentials.

do $$
declare dangerous text;
begin
  select p.oid::regprocedure::text into dangerous
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where p.prosecdef and n.nspname not like 'pg_%'
    and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
    and has_schema_privilege('iskra_server_backup',n.oid,'USAGE')
    and has_function_privilege('iskra_server_backup',p.oid,'EXECUTE')
    and p.oid::regprocedure::text not in
      ('get_teacher_invite(uuid)','is_admin_user(uuid)','subject_colors_for_student(uuid)')
  limit 1;
  if dangerous is not null then
    raise exception 'Unexpected SECURITY DEFINER access for backup role: %', dangerous;
  end if;
end $$;
