-- pg_event_trigger_dropped_objects returns NULL object_name for triggers.
create or replace function iskra_history.guard_destructive_ddl() returns event_trigger
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
      or (obj.object_type='trigger' and coalesce(obj.object_name,obj.address_names[array_length(obj.address_names,1)]) in ('iskra_preserve_row','iskra_no_truncate','lessons_preserve_nonempty')) then
      raise exception 'ISKRA_DATA_PRESERVATION: destructive DDL % requires an administrator-approved plan and independent verified backup.',obj.object_identity;
    end if;
  end loop;
end;
$$;
