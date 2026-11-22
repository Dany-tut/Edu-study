-- Extend the existing owner/RLS/CAS content-only API with preserved JSON leaves.
-- Old six-argument description requests and acknowledgements stay compatible.
set lock_timeout='2s';
set statement_timeout='8s';
do $guard$ begin
 if (select count(*)from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['save_course_content_delta','_iskra_existing_json_preserved_20261122','_iskra_wide_apply_json_ops_20261122','_iskra_wide_json_op_valid_20261122']))<>4 then raise exception 'Content delta dependency namespace changed';end if;
 if exists(select 1 from(values('save_course_content_delta','f6e2819d302f0fe6cc004c648b3a9aac'),('_iskra_existing_json_preserved_20261122','2da9129f4e1644ee580e6760c4943783'),('_iskra_wide_apply_json_ops_20261122','b7bfebebdb4d3cb0fedc4193f0071bf5'),('_iskra_wide_json_op_valid_20261122','60c3d91d3fdd3dd18fa096169483fe3e'))e(name,hash) left join(pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace and n.nspname='public')on p.proname=e.name where pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) is distinct from e.hash or p.prosecdef)then raise exception 'Content delta dependency definition changed; review before apply';end if;
end $guard$;
create or replace function public.save_course_content_delta(
 p_short_id text,p_baseline timestamptz,p_expected_status text,
 p_course_patch jsonb,p_lesson_patches jsonb,p_expected_modules jsonb
) returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='8s' as $$
declare
 c public.courses%rowtype; next_c public.courses%rowtype;
 stamp timestamptz; inventory jsonb; final_inventory jsonb; by_ref jsonb;
 modules jsonb; modules_by_id jsonb; expected_modules jsonb; targets jsonb;
 op jsonb; old_row jsonb; normalized jsonb; ack_course jsonb; merged jsonb; keys text[];group_row record;
 updates jsonb:='[]'; acknowledgements jsonb:='[]'; changed_ack jsonb;
 patch_ids uuid[]; seen_refs text[]; changed_course_keys text[];
 course_keys text[]:=array['title','description','level','color','bg'];
 count_actual integer; set_sql text; version_target timestamptz;
begin
 if auth.uid() is null then raise insufficient_privilege using message='Authentication required';end if;
 select * into c from public.courses where short_id=p_short_id and created_by=auth.uid() for update;
 if not found then raise insufficient_privilege using message='Course not found or not owned';end if;
 if p_expected_status is null or p_expected_status not in('draft','published') then
  raise invalid_parameter_value using message='Expected existing publication status required';end if;
 select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into inventory from(
  select id,short_id,module_id,updated_at from public.lessons where course_id=c.id order by id for update
 ) locked;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_array_elements(inventory);
 if p_baseline is null or stamp is null then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';end if;
 if p_baseline is distinct from stamp then raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}');end if;
 if c.status is distinct from p_expected_status then raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Publication status changed';end if;
 if jsonb_typeof(p_course_patch) is distinct from 'object' or jsonb_typeof(p_lesson_patches) is distinct from 'array' then
  raise invalid_parameter_value using message='Invalid ordinary content delta';end if;
 if exists(select 1 from jsonb_object_keys(p_course_patch) k where not(k=any(course_keys))) then
  raise invalid_parameter_value using message='Unsupported course patch field';end if;
 if exists(select 1 from jsonb_each(p_course_patch) where jsonb_typeof(value) not in('string','null')) then
  raise invalid_parameter_value using message='Invalid course scalar type';end if;
 -- SAFE witness variant: every delta verifies the COMPLETE module roster.
 -- Do not certify an empty/unmentioned module insertion or legacy module-only
 -- rename/position edit merely because course/lesson timestamps stayed equal.
 if jsonb_typeof(p_expected_modules) is distinct from 'array' then
  raise invalid_parameter_value using message='Complete expected module witness required';end if;
 for op in select value from jsonb_array_elements(p_expected_modules) loop
  if jsonb_typeof(op) is distinct from 'object' or not(op ?& array['id','label','position'])
   or exists(select 1 from jsonb_object_keys(op) k where k not in('id','label','position'))
   or jsonb_typeof(op->'id') is distinct from 'string' or jsonb_typeof(op->'label') is distinct from 'string'
   or jsonb_typeof(op->'position') is distinct from 'number' then
   raise invalid_parameter_value using message='Invalid expected module witness';end if;
  if (op->>'position')::numeric<>trunc((op->>'position')::numeric) then
   raise invalid_parameter_value using message='Module witness position must be integer';end if;
 end loop;
 select count(distinct (value->>'id')::uuid) into count_actual from jsonb_array_elements(p_expected_modules);
 if count_actual<>jsonb_array_length(p_expected_modules) then raise invalid_parameter_value using message='Duplicate module witness UUID';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',(value->>'id')::uuid,'label',value->>'label','position',(value->>'position')::integer)
  order by (value->>'id')::uuid),'[]') into expected_modules from jsonb_array_elements(p_expected_modules);
  select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into modules from(
   select id,label,position from public.course_modules where course_id=c.id order by id for update
  ) locked;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into modules_by_id from jsonb_array_elements(modules);
 if modules is distinct from expected_modules then
  raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Complete module witness changed; full source was not confirmed';end if;

 select coalesce(jsonb_object_agg(value->>'short_id',value),'{}') into by_ref from jsonb_array_elements(inventory) where value->>'short_id' is not null;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}') into final_inventory from jsonb_array_elements(inventory);
 -- Validate operation shape BEFORE casts, target reads or writes.
 for op in select value from jsonb_array_elements(p_lesson_patches) loop
  if jsonb_typeof(op) is distinct from 'object' or not(op ?& array['id','short_id','set'])
   or exists(select 1 from jsonb_object_keys(op) k where k not in('id','short_id','set','json_ops'))
   or jsonb_typeof(op->'id') is distinct from 'string' or jsonb_typeof(op->'short_id') is distinct from 'string'
   or op->>'short_id'='' or jsonb_typeof(op->'set') is distinct from 'object' then
   raise invalid_parameter_value using message='Invalid lesson patch';end if;
  if exists(select 1 from jsonb_object_keys(op->'set') k where k not in('description','test_tasks'))
   or exists(select 1 from jsonb_each(op->'set') where
    (key='description' and jsonb_typeof(value) not in('string','null'))
    or(key='test_tasks' and (jsonb_typeof(value)<>'array' or exists(select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'object')))) then
   raise invalid_parameter_value using message='Unsupported lesson patch field or type';end if;
  if jsonb_typeof(coalesce(op->'json_ops','[]')) is distinct from 'array' then
   raise invalid_parameter_value using message='Invalid ordinary JSON operations';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(op->'json_ops','[]')) j where
   public._iskra_wide_json_op_valid_20261122(j) is not true
   or not((j->>'column'='homework' and j->'path' in('["hwTasks"]'::jsonb,'["recHwTasks"]'::jsonb,'["extraHw"]'::jsonb))
    or(j->>'column'='content' and j->'path' in('["paragraphs"]'::jsonb,'["selfCheck"]'::jsonb))
    or(j->>'column'='materials'))) then
   raise invalid_parameter_value using message='Unsupported ordinary JSON path or type';end if;
  old_row:=by_ref->(op->>'short_id');
  if old_row is null or (old_row->>'id')::uuid is distinct from (op->>'id')::uuid then
   raise insufficient_privilege using message='Lesson UUID/ref is not in owned inventory';end if;
 end loop;
 select coalesce(array_agg((value->>'id')::uuid),'{}'),coalesce(array_agg(value->>'short_id'),'{}') into patch_ids,seen_refs from jsonb_array_elements(p_lesson_patches);
 if cardinality(patch_ids)<>(select count(distinct id) from unnest(patch_ids) id)
  or cardinality(seen_refs)<>(select count(distinct ref) from unnest(seen_refs) ref) then
  raise invalid_parameter_value using message='Duplicate lesson patch';end if;
 if cardinality(patch_ids)>0 then
  -- Full raw targets only. Unknown JSON, homework, chapter and FK columns never
  -- enter any UPDATE SET list, including on a description-only edit.
  select coalesce(jsonb_object_agg(short_id,to_jsonb(l)),'{}') into targets
   from public.lessons l where l.course_id=c.id and l.id=any(patch_ids);
  if (select count(*) from jsonb_object_keys(targets))<>cardinality(patch_ids) then
   raise insufficient_privilege using message='Could not verify full patch targets';end if;
  for op in select value from jsonb_array_elements(p_lesson_patches) loop
   old_row:=targets->(op->>'short_id');merged:=old_row||(op->'set');
   if op->'set'?'test_tasks' and public._iskra_existing_json_preserved_20261122(old_row->'test_tasks',op->'set'->'test_tasks') is not true then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: task array identity/unknown-attribute loss';end if;
   merged:=public._iskra_wide_apply_json_ops_20261122(merged,coalesce(op->'json_ops','[]'));
   select coalesce(array_agg(distinct k order by k),'{}') into keys from (
    select jsonb_object_keys(op->'set') k
    union all select value->>'column' from jsonb_array_elements(coalesce(op->'json_ops','[]'))
   ) requested;
   select coalesce(array_agg(k order by k),'{}')into keys from unnest(keys)k where merged->k is distinct from old_row->k;
   if cardinality(keys)>0 then updates:=updates||jsonb_build_array(merged||jsonb_build_object('_keys',keys));end if;
   acknowledgements:=acknowledgements||jsonb_build_array(jsonb_build_object('id',(old_row->>'id')::uuid,'short_id',old_row->>'short_id',
    'set',(select coalesce(jsonb_object_agg(k,merged->k),'{}')from jsonb_object_keys(op->'set')k),'homework_set','{}'::jsonb,'content_set','{}'::jsonb)
    ||case when op?'json_ops' then jsonb_build_object('json_ops',(select coalesce(jsonb_agg(case when value->>'op'='set' then value||jsonb_build_object('value',merged#>(array[value->>'column']||array(select jsonb_array_elements_text(value->'path'))))else value end),'[]')from jsonb_array_elements(op->'json_ops')))else'{}'::jsonb end);
  end loop;
 end if;
 next_c:=jsonb_populate_record(c,p_course_patch);
 select coalesce(array_agg(k order by k),'{}') into changed_course_keys from jsonb_object_keys(p_course_patch) k where to_jsonb(next_c)->k is distinct from to_jsonb(c)->k;
 if cardinality(changed_course_keys)>0 or jsonb_array_length(updates)>0 then
  version_target:=greatest(clock_timestamp(),stamp+interval '1 microsecond');next_c.updated_at:=version_target;
  if cardinality(changed_course_keys)>0 then
   select string_agg(format('%I=r.%I',k,k),',') into set_sql from unnest(changed_course_keys) k;
   set_sql:=set_sql||',updated_at=r.updated_at';
   execute format('update public.courses target set %s from jsonb_populate_record(null::public.courses,$1) r where target.id=$2 returning target.*',set_sql)
    into c using to_jsonb(next_c),c.id;
   get diagnostics count_actual=row_count;if count_actual<>1 then raise insufficient_privilege using message='Course patch denied';end if;
  else
   update public.courses set updated_at=version_target where id=c.id returning * into c;
   if not found then raise insufficient_privilege using message='Course revision write denied';end if;
  end if;
  -- Actual trigger may clamp explicit timestamp to transaction now().
  if c.updated_at<=stamp then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: course revision did not advance';end if;
 end if;
 -- Group only validated root/JSON columns, preserving one grouped update and
 -- no physical write for no-op. Identifiers never come from unchecked input.
 for group_row in select value->'_keys' keyset,jsonb_agg(value-'_keys') row_data from jsonb_array_elements(updates)group by value->'_keys' loop
  select string_agg(format('%I=r.%I',k,k),',')into set_sql from jsonb_array_elements_text(group_row.keyset)k;
  execute format('with changed as(update public.lessons target set %s from jsonb_populate_recordset(null::public.lessons,$1)r where target.course_id=$2 and target.id=r.id returning target.id,target.short_id,target.module_id,target.updated_at)select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(changed)),''{}''::jsonb)from changed',set_sql)
   into count_actual,changed_ack using group_row.row_data,c.id;
  if count_actual<>jsonb_array_length(group_row.row_data)then raise insufficient_privilege using message='Lesson patch denied';end if;
  final_inventory:=final_inventory||changed_ack;
 end loop;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_each(final_inventory);
 select coalesce(jsonb_object_agg(k,to_jsonb(c)->k),'{}') into ack_course from jsonb_object_keys(p_course_patch) k;
 return jsonb_build_object('course_id',c.id,'stamp',stamp,'full_snapshot_confirmed',true,'module_witness',modules,
  'lesson_witness',coalesce((select jsonb_agg(value order by (value->>'id')::uuid) from jsonb_each(final_inventory)),'[]'),
  'applied_course_patch',ack_course,'applied_lesson_patches',acknowledgements,
  'applied_lesson_deletes','[]'::jsonb,'applied_module_ops','[]'::jsonb);
end;
$$;
revoke all on function public.save_course_content_delta(text,timestamptz,text,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_course_content_delta(text,timestamptz,text,jsonb,jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';
