-- Default-on history for future public tables, including confidence_log.
-- No user rows are replaced or removed by this migration.
create function iskra_history.attach_table_history(target oid) returns void
language plpgsql security definer set search_path = '' as $$
declare rel record; qualified text; prior_flag text;
begin
  select n.nspname,c.relname,c.relkind into rel
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=target;
  if rel.nspname is distinct from 'public' or rel.relkind not in ('r','p') then return; end if;
  qualified := format('%I.%I',rel.nspname,rel.relname);
  prior_flag := current_setting('iskra.installing_history',true);
  perform set_config('iskra.installing_history','1',true);
  execute format('lock table %s in share row exclusive mode',qualified);
  if not exists(select 1 from iskra_history.protected_tables where table_name=qualified) then
    execute format('insert into iskra_history.row_versions(table_name,row_id,operation,database_role,old_row) select %L,coalesce(to_jsonb(t)->>''id'',to_jsonb(t)->>''short_id''),''BASELINE'',session_user,to_jsonb(t) from %s t',qualified,qualified);
    insert into iskra_history.protected_tables values(qualified);
  end if;
  if not exists(select 1 from pg_trigger where tgrelid=target and tgname='iskra_preserve_row') then
    execute format('create trigger iskra_preserve_row before update or delete on %s for each row execute function iskra_history.capture_old_row()',qualified);
  end if;
  if not exists(select 1 from pg_trigger where tgrelid=target and tgname='iskra_no_truncate') then
    execute format('create trigger iskra_no_truncate before truncate on %s for each statement execute function iskra_history.reject_truncate()',qualified);
  end if;
  execute format('alter table %s enable always trigger iskra_preserve_row',qualified);
  execute format('alter table %s enable always trigger iskra_no_truncate',qualified);
  perform set_config('iskra.installing_history',coalesce(prior_flag,''),true);
exception when others then
  perform set_config('iskra.installing_history',coalesce(prior_flag,''),true);
  raise;
end;
$$;
revoke all on function iskra_history.attach_table_history(oid) from public,anon,authenticated,service_role;

do $$
declare target record;
begin
  for target in
    select c.oid id from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and c.relname not in ('analytics_events','chembio_dirty','stata_overview_cache',
        'reminder_outbox','mfa_backup_attempts','mfa_backup_codes','oauth_identities',
        'teacher_module_secrets','tg_link_codes')
    union select to_regclass(table_name)::oid from iskra_history.protected_tables loop
    if target.id is not null then perform iskra_history.attach_table_history(target.id); end if;
  end loop;
end;
$$;
alter table public.lessons enable always trigger lessons_preserve_nonempty;
alter table iskra_history.row_versions enable always trigger history_append_only;
alter table iskra_history.row_versions enable always trigger history_no_truncate;

create function iskra_history.protect_registry() returns trigger
language plpgsql set search_path = '' as $$
begin
  if nullif(current_setting('iskra.approved_data_change',true),'') is null then
    raise exception 'ISKRA_DATA_PRESERVATION: changing the protection registry requires reviewed administrator approval';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function iskra_history.protect_registry() from public,anon,authenticated,service_role;
create trigger registry_protected before update or delete on iskra_history.protected_tables
for each row execute function iskra_history.protect_registry();
create trigger registry_no_truncate before truncate on iskra_history.protected_tables
for each statement execute function iskra_history.reject_truncate();
alter table iskra_history.protected_tables enable always trigger registry_protected;
alter table iskra_history.protected_tables enable always trigger registry_no_truncate;

create function iskra_history.enforce_history_coverage() returns event_trigger
language plpgsql security definer set search_path = '' as $$
declare cmd record; missing text;
begin
  if current_setting('iskra.installing_history',true)='1' then return; end if;
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
      and object_type in ('table','partitioned table') and schema_name='public' loop
    perform iskra_history.attach_table_history(cmd.objid);
  end loop;
  if nullif(current_setting('iskra.approved_data_change',true),'') is not null then return; end if;
  select p.table_name into missing from iskra_history.protected_tables p
  where to_regclass(p.table_name) is null or exists (
    select 1 from (values('iskra_preserve_row'),('iskra_no_truncate')) required(name)
    where not exists(select 1 from pg_trigger t where t.tgrelid=to_regclass(p.table_name)
      and t.tgname=required.name and t.tgenabled='A')) limit 1;
  if missing is not null then
    raise exception 'ISKRA_DATA_PRESERVATION: refusing DDL that disables history for %',missing;
  end if;
  if exists(select 1 from (values
      ('public.lessons','lessons_preserve_nonempty'),
      ('iskra_history.row_versions','history_append_only'),
      ('iskra_history.row_versions','history_no_truncate'),
      ('iskra_history.protected_tables','registry_protected'),
      ('iskra_history.protected_tables','registry_no_truncate')) required(rel,name)
    where not exists(select 1 from pg_trigger t where t.tgrelid=to_regclass(required.rel)
      and t.tgname=required.name and t.tgenabled='A')) then
    raise exception 'ISKRA_DATA_PRESERVATION: refusing to disable a data protection trigger';
  end if;
end;
$$;
revoke all on function iskra_history.enforce_history_coverage() from public,anon,authenticated,service_role;
create event trigger iskra_enforce_history_coverage on ddl_command_end
execute function iskra_history.enforce_history_coverage();
