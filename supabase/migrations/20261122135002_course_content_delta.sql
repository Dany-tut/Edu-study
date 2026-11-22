set lock_timeout='2s';
set statement_timeout='8s';
-- Existing-course content-only delta. Authoritative owner/RLS/CAS and complete witnesses.
-- Derived from reviewed whole-witness delta at3555; deliberately narrower.
-- No audience/enrollment/schedule/progress/visibility read or mutation, no structural ops.
create function public.save_course_content_delta(
 p_short_id text,p_baseline timestamptz,p_expected_status text,
 p_course_patch jsonb,p_lesson_patches jsonb,p_expected_modules jsonb
) returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='8s' as $$
declare
 c public.courses%rowtype; next_c public.courses%rowtype;
 stamp timestamptz; inventory jsonb; final_inventory jsonb; by_ref jsonb;
 modules jsonb; modules_by_id jsonb; expected_modules jsonb; targets jsonb;
 op jsonb; old_row jsonb; normalized jsonb; ack_course jsonb;
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
   or exists(select 1 from jsonb_object_keys(op) k where k not in('id','short_id','set'))
   or jsonb_typeof(op->'id') is distinct from 'string' or jsonb_typeof(op->'short_id') is distinct from 'string'
   or op->>'short_id'='' or jsonb_typeof(op->'set') is distinct from 'object' then
   raise invalid_parameter_value using message='Invalid lesson patch';end if;
  if exists(select 1 from jsonb_object_keys(op->'set') k where k<>'description')
   or exists(select 1 from jsonb_each(op->'set') where jsonb_typeof(value) not in('string','null')) then
   raise invalid_parameter_value using message='Unsupported lesson patch field or type';end if;
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
   old_row:=targets->(op->>'short_id');
   if op->'set' ? 'description' then
    if op->'set'->'description' is distinct from old_row->'description' then
     updates:=updates||jsonb_build_array(jsonb_build_object('id',(old_row->>'id')::uuid,'description',op->'set'->'description'));
    end if;
   end if;
   acknowledgements:=acknowledgements||jsonb_build_array(jsonb_build_object('id',(old_row->>'id')::uuid,'short_id',old_row->>'short_id',
    'set',op->'set','homework_set','{}'::jsonb,'content_set','{}'::jsonb));
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
 if jsonb_array_length(updates)>0 then
  with changed as(
   update public.lessons target set description=r.description
    from jsonb_populate_recordset(null::public.lessons,updates) r
    where target.course_id=c.id and target.id=r.id
    returning target.id,target.short_id,target.module_id,target.updated_at
  ) select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(changed)),'{}') into count_actual,changed_ack from changed;
  if count_actual<>jsonb_array_length(updates) then raise insufficient_privilege using message='Lesson patch denied';end if;
  final_inventory:=final_inventory||changed_ack;
 end if;
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
