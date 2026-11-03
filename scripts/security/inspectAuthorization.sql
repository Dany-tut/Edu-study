-- Read-only preflight for an explicitly selected staging database.
-- No secrets, plaintext credentials, names or student answers are selected.
begin read only;
select p.id, p.role as profile_role, u.raw_app_meta_data->>'role' as server_role,
  case when (p.role in ('teacher','admin') or u.raw_app_meta_data->>'role' in ('teacher','admin'))
    and p.role::text is distinct from u.raw_app_meta_data->>'role'
    then 'REVIEW trusted invitation/admin history; do not blindly promote metadata'
    else 'consistent or unprivileged' end as review
from public.profiles p join auth.users u on u.id=p.id
where p.role in ('teacher','admin') or u.raw_app_meta_data->>'role' in ('teacher','admin');
select count(*) as historical_plaintext_rows from public.students where temp_password is not null;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select table_schema,table_name,grantee,privilege_type from information_schema.role_table_grants
where grantee in ('anon','authenticated','PUBLIC') and table_schema in ('public','storage')
order by table_schema,table_name,grantee,privilege_type;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef,p.proacl,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef order by p.proname;
select schemaname,tablename from pg_tables where schemaname='public'
and not rowsecurity order by tablename;
commit;
