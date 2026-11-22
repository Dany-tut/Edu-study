-- DDL bypasses row history: reject DROP of protected tables/columns or guards.
create table iskra_history.protected_tables(table_name text primary key);
insert into iskra_history.protected_tables
select distinct n.nspname||'.'||c.relname from pg_trigger t
join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where t.tgname='iskra_preserve_row';
alter table iskra_history.protected_tables enable row level security;
revoke all on iskra_history.protected_tables from public,anon,authenticated,service_role;

create function iskra_history.guard_destructive_ddl() returns event_trigger
language plpgsql security definer set search_path = '' as $$
declare obj record;
begin
  if nullif(current_setting('iskra.approved_data_change',true),'') is not null then return; end if;
  for obj in select * from pg_event_trigger_dropped_objects() loop
    if obj.schema_name = 'iskra_history'
      or (obj.object_type='schema' and obj.object_name in ('public','iskra_history'))
      or (obj.object_type in ('table','table column') and exists (
        select 1 from iskra_history.protected_tables p
        where p.table_name=obj.address_names[1]||'.'||obj.address_names[2]))
      or (obj.object_type='trigger' and obj.object_name in ('iskra_preserve_row','iskra_no_truncate','lessons_preserve_nonempty')) then
      raise exception 'ISKRA_DATA_PRESERVATION: destructive DDL % requires an administrator-approved plan and independent verified backup.',obj.object_identity;
    end if;
  end loop;
end;
$$;
revoke all on function iskra_history.guard_destructive_ddl() from public,anon,authenticated,service_role;
create event trigger iskra_guard_destructive_ddl on sql_drop
execute function iskra_history.guard_destructive_ddl();

-- A schema cascade can remove the sql_drop guard itself before it runs.
-- Reject that command at START, before PostgreSQL resolves dependencies.
create function iskra_history.guard_schema_drop_start() returns event_trigger
language plpgsql set search_path = '' as $$
begin
  if nullif(current_setting('iskra.approved_data_change',true),'') is null then
    raise exception 'ISKRA_DATA_PRESERVATION: DROP SCHEMA/OWNED requires administrator approval and independent verified backup.';
  end if;
end;
$$;
revoke all on function iskra_history.guard_schema_drop_start() from public,anon,authenticated,service_role;
create event trigger iskra_guard_schema_drop_start on ddl_command_start
when tag in ('DROP SCHEMA','DROP OWNED') execute function iskra_history.guard_schema_drop_start();
