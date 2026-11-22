-- Restricted QA wide-content entry; ordinary protocol is unchanged.
set lock_timeout='2s';
set statement_timeout='8s';
do $guard$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['_iskra_existing_json_preserved_20261122','_iskra_wide_json_op_valid_20261122','_iskra_wide_apply_json_ops_20261122','save_course_wide_delta_probe_20261122'])) then raise exception 'Wide probe namespace already exists; review definitions before apply';end if;
end $guard$;
-- EXTERNAL ONLY. New hard-QA endpoint; existing engine unchanged.
create or replace function public._iskra_existing_json_preserved_20261122(raw jsonb, proposed jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text;i integer;old jsonb;new jsonb;
begin
 if raw is not distinct from proposed then return true;end if;
 if raw is null or proposed is null then return false;end if;
 if jsonb_typeof(raw)='object' then
  if jsonb_typeof(proposed)<>'object' then return false;end if;
  for k in select jsonb_object_keys(raw) loop
   if not(proposed?k) or not public._iskra_existing_json_preserved_20261122(raw->k,proposed->k) then return false;end if;
  end loop;return true;
 elsif jsonb_typeof(raw)='array' then
  if jsonb_typeof(proposed)<>'array' or jsonb_array_length(raw)<>jsonb_array_length(proposed) then return false;end if;
  for i in 0..jsonb_array_length(raw)-1 loop
   old:=raw->i;new:=proposed->i;
   if jsonb_typeof(old)='object' and (not(old?'id') or not(new?'id') or old->'id' is distinct from new->'id'
    or jsonb_typeof(old->'id') not in('string','number')) then return false;end if;
   if not public._iskra_existing_json_preserved_20261122(old,new) then return false;end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(raw) e where jsonb_typeof(e)='object' group by e->'id' having count(*)>1) then return false;end if;
  return true;
 end if;
 return jsonb_typeof(proposed) not in('object','array');
end;$$;
create or replace function public._iskra_wide_json_op_valid_20261122(op jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare p text[]; key text; v jsonb; is_array boolean;
begin
 if jsonb_typeof(op) is distinct from 'object' or not(op ?& array['column','path','op'])
  or exists(select 1 from jsonb_object_keys(op) k where k not in('column','path','op','value','explicit'))
  or jsonb_typeof(op->'path') is distinct from 'array' then return false;end if;
 if jsonb_array_length(op->'path') not between 1 and 2 or exists(select 1 from jsonb_array_elements(op->'path') e where jsonb_typeof(e)<>'string') then return false;end if;
 select array_agg(value order by ord) into p from jsonb_array_elements_text(op->'path') with ordinality x(value,ord);
 key:=(op->>'column')||'/'||array_to_string(p,'/');
 if not(key=any(array['homework/hwTasks','homework/recHwTasks','homework/extraHw','content/paragraphs','content/selfCheck','content/transcript','content/transcript/source','content/transcript/segments','content/transcript/forStudents','content/transcript/speakers','materials/workbook','materials/workbook/id','materials/workbook/name','materials/workbook/path','materials/workbook/size','materials/workbook/mime','materials/workbook/url','materials/workbook/r2','materials/notebook','materials/notebook/id','materials/notebook/name','materials/notebook/path','materials/notebook/size','materials/notebook/mime','materials/notebook/url','materials/notebook/r2','materials/materials'])) then return false;end if;
 if op->>'op'='remove' then return not(op?'value') and case when key in('content/transcript','materials/workbook','materials/notebook') then coalesce(op->'explicit'='true'::jsonb,false) else not(op?'explicit') end;end if;
 if op?'explicit' then return false;end if;
 if op->>'op' is distinct from 'set' or not(op?'value') or not(key=any(array['homework/hwTasks','homework/recHwTasks','homework/extraHw','content/paragraphs','content/selfCheck','content/transcript/source','content/transcript/segments','content/transcript/forStudents','content/transcript/speakers','materials/workbook/id','materials/workbook/name','materials/workbook/path','materials/workbook/size','materials/workbook/mime','materials/workbook/url','materials/workbook/r2','materials/notebook/id','materials/notebook/name','materials/notebook/path','materials/notebook/size','materials/notebook/mime','materials/notebook/url','materials/notebook/r2','materials/materials'])) then return false;end if;
 v:=op->'value';
 if key in('homework/hwTasks','homework/recHwTasks','homework/extraHw','content/paragraphs','content/selfCheck','content/transcript/segments','content/transcript/speakers','materials/materials') then
  if jsonb_typeof(v)<>'array' then return false;end if;
  if exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e)<>'object') then return false;end if;
  if key in('homework/hwTasks','homework/recHwTasks') and exists(select 1 from jsonb_array_elements(v) e where e?'id' and jsonb_typeof(e->'id') not in('string','number')) then return false;end if;
  if key='content/paragraphs' and exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'id') is distinct from 'string' or jsonb_typeof(e->'text') is distinct from 'string') then return false;end if;
  if key='content/selfCheck' and exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'id') is distinct from 'string' or jsonb_typeof(e->'q') is distinct from 'string' or jsonb_typeof(e->'answer') is distinct from 'string') then return false;end if;
  if key='content/selfCheck' then
   if exists(select 1 from jsonb_array_elements(v) e where e?'options' and jsonb_typeof(e->'options')<>'array' or e?'at' and jsonb_typeof(e->'at')<>'number') then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) e where e?'at' and (e->>'at')::numeric<0) then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) e cross join lateral jsonb_array_elements(coalesce(e->'options','[]')) o where jsonb_typeof(o)<>'string') then return false;end if;
  end if;
  if key='content/transcript/segments' then
   if jsonb_array_length(v)=0 then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'start') is distinct from 'number' or jsonb_typeof(e->'end') is distinct from 'number' or jsonb_typeof(e->'text') is distinct from 'string') then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) e where (e->>'start')::numeric<0 or (e->>'end')::numeric<=(e->>'start')::numeric or btrim(e->>'text')='') then return false;end if;
  end if;
  if key='content/transcript/speakers' and exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'id') is distinct from 'string' or jsonb_typeof(e->'label') is distinct from 'string' or coalesce(e->>'role','') not in('teacher','student') or jsonb_typeof(e->'tone') is distinct from 'string') then return false;end if;
  if key='materials/materials' then
   if exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'path') is distinct from 'string' or e->>'path'='' or e?'size' and jsonb_typeof(e->'size')<>'number') then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) e where e?'size' and (e->>'size')::numeric<0) then return false;end if;
  end if;
  return true;
 end if;
 if key in('content/transcript/forStudents','materials/workbook/r2','materials/notebook/r2') then return jsonb_typeof(v)='boolean';end if;
 if key in('materials/workbook/size','materials/notebook/size') then
  if jsonb_typeof(v)<>'number' then return false;end if;
  return (v#>>'{}')::numeric>=0;
 end if;
 if jsonb_typeof(v)<>'string' then return false;end if;
 if key in('content/transcript/source','materials/workbook/path','materials/notebook/path') then return (v#>>'{}')<>'';end if;
 return true;
end;$$;

create or replace function public._iskra_wide_apply_json_ops_20261122(p_row jsonb,p_ops jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb:=p_row;op jsonb;previous jsonb;p text[];prior_path text[];column_name text;column_value jsonb;parent jsonb;depth int;missing boolean;transcript jsonb;montage jsonb;
begin
 if jsonb_typeof(p_row) is distinct from 'object' or jsonb_typeof(p_ops) is distinct from 'array' then raise invalid_parameter_value using message='Invalid wide JSON request';end if;
 for op in select value from jsonb_array_elements(p_ops) loop
  if public._iskra_wide_json_op_valid_20261122(op) is not true then raise invalid_parameter_value using message='Invalid wide JSON path/type';end if;
 end loop;
 for op in select value from jsonb_array_elements(p_ops) loop
  select array_agg(value order by ord) into p from jsonb_array_elements_text(op->'path') with ordinality x(value,ord);
  for previous in select value from jsonb_array_elements(p_ops) loop
   if previous=op then continue;end if;
   if previous->>'column'=op->>'column' then
    select array_agg(value order by ord) into prior_path from jsonb_array_elements_text(previous->'path') with ordinality x(value,ord);
    if p=prior_path[1:cardinality(p)] or prior_path=p[1:cardinality(prior_path)] then raise invalid_parameter_value using message='Overlapping wide JSON paths';end if;
   end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_ops) x group by x->>'column',x->'path' having count(*)>1) then raise invalid_parameter_value using message='Duplicate wide JSON path';end if;
 for op in select value from jsonb_array_elements(p_ops) loop
  column_name:=op->>'column';select array_agg(value order by ord) into p from jsonb_array_elements_text(op->'path') with ordinality x(value,ord);
  column_value:=result->column_name;
  if column_value is null or column_value='null'::jsonb then
   if op->>'op'='remove' then continue;end if;column_value:='{}';
  end if;
  if jsonb_typeof(column_value)<>'object' then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: non-object JSON column';end if;
  missing:=false;
  for depth in 1..cardinality(p)-1 loop
   parent:=column_value#>p[1:depth];
   if parent is null or parent='null'::jsonb then
    if op->>'op'='remove' then missing:=true;exit;end if;
    column_value:=jsonb_set(column_value,p[1:depth],'{}',true);
   elsif jsonb_typeof(parent)<>'object' then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: non-object JSON parent';end if;
  end loop;
  if missing then continue;end if;
  if op->>'op'='remove' then
   if jsonb_typeof(column_value#>p)='array' then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: array deletion requires intent';end if;
   column_value:=column_value#-p;
  else
   if jsonb_typeof(op->'value')='array' and public._iskra_existing_json_preserved_20261122(column_value#>p,op->'value') is not true then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: array identity/unknown-attribute loss';end if;
   column_value:=jsonb_set(column_value,p,op->'value',true);
  end if;
  result:=jsonb_set(result,array[column_name],column_value,true);
 end loop;
 if exists(select 1 from jsonb_array_elements(p_ops) x where x->>'column'='content' and x->'path'->>0='transcript') then
  transcript:=result#>'{content,transcript}';
  if transcript is not null and transcript<>'null'::jsonb then
   if jsonb_typeof(transcript)<>'object' or jsonb_typeof(transcript->'source') is distinct from 'string'
    or transcript->>'source' is distinct from btrim(coalesce(result->>'youtube_url',''))
    or not public._iskra_wide_json_op_valid_20261122(jsonb_build_object('column','content','path',jsonb_build_array('transcript','segments'),'op','set','value',transcript->'segments')) then
    raise invalid_parameter_value using message='Invalid final transcript/source';end if;
  end if;
 end if;
 if exists(select 1 from jsonb_array_elements(p_ops) x where x->>'column'='materials') then
  foreach column_name in array array['workbook','notebook'] loop
   parent:=result->'materials'->column_name;
   if parent is not null and parent<>'null'::jsonb and (jsonb_typeof(parent)<>'object' or jsonb_typeof(parent->'path') is distinct from 'string' or parent->>'path'='') then raise invalid_parameter_value using message='Invalid final file';end if;
  end loop;
 end if;
 return result;
end;$$;

create or replace function public.save_course_wide_delta_probe_20261122(
 p_short_id text,p_baseline timestamptz,p_course_patch jsonb,
 p_lesson_patches jsonb,p_lesson_deletes jsonb,p_module_ops jsonb,p_expected_modules jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 qa_start timestamptz:=clock_timestamp();
 qa_mark timestamptz:=qa_start;qa_steps jsonb:='[]';qa_result jsonb;
 c public.courses%rowtype; next_c public.courses%rowtype; typed_l public.lessons%rowtype;
 stamp timestamptz; version_target timestamptz; inventory jsonb; by_ref jsonb; final_inventory jsonb;
 modules jsonb; modules_by_id jsonb; expected_modules jsonb; targets jsonb;
 op jsonb; fields jsonb; old_row jsonb; merged jsonb; normalized jsonb; keys text[];
 changed_course_keys text[]; target_ids uuid[]; delete_ids uuid[]; patch_ids uuid[];
 deleted_module_ids uuid[]; changed_modules jsonb:='[]'; updates jsonb:='[]'; acknowledgements jsonb:='[]';
 seen_refs text[]; seen_ids uuid[]; touched_structure boolean:=false; need_modules boolean:=false;
 course_keys text[]:=array['title','subject','level','description','color','bg','seed_stamp','number_start'];
 lesson_keys text[]:=array['title','description','module_id','position','lesson_number','scheduled_date','scheduled_time','scheduled_duration','rec_date','rec_time','rec_duration','lesson_sched_manual','delivery_mode','youtube_url','test_tasks'];
 homework_keys text[]:=array['hwTitle','hwTarget','hwDate','hwTime','hwDateManual','recHwTitle','recHwTarget','recHwDate','recHwTime','recHwDateManual'];
 content_keys text[]:=array['cardSetId','cardGroupId'];
 group_row record; set_sql text; left_sql text; right_sql text; changed_ack jsonb; count_actual integer;
 ack_course jsonb; ack_module jsonb:='[]'; fk uuid; remaining_fk uuid;
begin
 if p_short_id is distinct from '00e3a0efbf' or auth.uid() is distinct from '1eaf6264-0a38-41f7-bd53-4a404764393f'::uuid then
  raise insufficient_privilege using message='QA delta scope denied';
 end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_auth_gate','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 -- No client flag/baseline can grant ownership or defeat current RLS/MFA.
 select * into c from public.courses where short_id=p_short_id and created_by=auth.uid() for update;
 if not found then raise insufficient_privilege using message='Course not found or not owned';end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_course_lock','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if c.status is distinct from 'draft' or c.student_ids is distinct from '{}'::uuid[] or c.group_ids is distinct from '{}'::uuid[] then
  raise insufficient_privilege using message='QA delta requires unassigned draft';end if;
 if exists(select 1 from public.course_enrollments where course_id=c.id) then
  raise insufficient_privilege using message='QA delta requires no enrollments';end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_enrollment_gate','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 -- The full authoritative inventory is locked even for metadata-only changes.
 -- This includes stamps of NULL/legacy refs and other lessons: never certify a
 -- fresh foreign lesson commit by reading only the edited row.
 select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into inventory from(
  select id,short_id,module_id,updated_at from public.lessons where course_id=c.id order by id for update
 ) locked;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_array_elements(inventory);
 if p_baseline is null or stamp is null then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';end if;
 if p_baseline is distinct from stamp then raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}');end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_inventory_cas','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if jsonb_typeof(p_course_patch) is distinct from 'object' or jsonb_typeof(p_lesson_patches) is distinct from 'array'
  or jsonb_typeof(p_lesson_deletes) is distinct from 'array' or jsonb_typeof(p_module_ops) is distinct from 'array' then
  raise invalid_parameter_value using message='Invalid typed delta';end if;
 if exists(select 1 from jsonb_object_keys(p_course_patch) k where not(k=any(course_keys))) then
  raise invalid_parameter_value using message='Unsupported course patch field';end if;
 if exists(select 1 from jsonb_each(p_course_patch) where jsonb_typeof(value) in('object','array')
  or (key='number_start' and jsonb_typeof(value) not in('number','null'))
  or (key<>'number_start' and jsonb_typeof(value) not in('string','null'))) then
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
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_input_validation','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into modules from(
   select id,label,position from public.course_modules where course_id=c.id order by id for update
  ) locked;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into modules_by_id from jsonb_array_elements(modules);
 if modules is distinct from expected_modules then
  raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Complete module witness changed; full source was not confirmed';end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_module_snapshot','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 select coalesce(jsonb_object_agg(value->>'short_id',value),'{}') into by_ref from jsonb_array_elements(inventory) where value->>'short_id' is not null;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}') into final_inventory from jsonb_array_elements(inventory);

 select coalesce(array_agg((value->>'id')::uuid),'{}'),coalesce(array_agg(value->>'short_id'),'{}') into patch_ids,seen_refs from jsonb_array_elements(p_lesson_patches);
 if cardinality(patch_ids)<>(select count(distinct id) from unnest(patch_ids) id)
  or cardinality(seen_refs)<>(select count(distinct ref) from unnest(seen_refs) ref) then raise invalid_parameter_value using message='Duplicate lesson patch';end if;
 for op in select value from jsonb_array_elements(p_lesson_patches) loop
  if jsonb_typeof(op) is distinct from 'object' or op->>'id' is null or op->>'short_id' is null
   or op->>'short_id'='' or exists(select 1 from jsonb_object_keys(op) k where k not in('id','short_id','set','homework_set','content_set','json_ops'))
   or jsonb_typeof(coalesce(op->'set','{}')) is distinct from 'object'
   or jsonb_typeof(coalesce(op->'homework_set','{}')) is distinct from 'object'
   or jsonb_typeof(coalesce(op->'content_set','{}')) is distinct from 'object' then
   raise invalid_parameter_value using message='Invalid lesson patch';end if;
  old_row:=by_ref->(op->>'short_id');
  if old_row is null or (old_row->>'id')::uuid is distinct from (op->>'id')::uuid then
   raise insufficient_privilege using message='Lesson UUID/ref is not in owned inventory';end if;
  if exists(select 1 from jsonb_object_keys(coalesce(op->'set','{}')) k where not(k=any(lesson_keys)))
   or exists(select 1 from jsonb_object_keys(coalesce(op->'homework_set','{}')) k where not(k=any(homework_keys)))
   or exists(select 1 from jsonb_object_keys(coalesce(op->'content_set','{}')) k where not(k=any(content_keys)))
   or exists(select 1 from jsonb_each(coalesce(op->'homework_set','{}')) where jsonb_typeof(value) in('array','object'))
   or exists(select 1 from jsonb_each(coalesce(op->'content_set','{}')) where jsonb_typeof(value) not in('string','null')) then
   raise invalid_parameter_value using message='Unsupported lesson patch field or nested replacement';end if;
  if exists(select 1 from jsonb_each(coalesce(op->'set','{}')) where (key<>'test_tasks' and jsonb_typeof(value) in('object','array'))
   or (key='test_tasks' and (jsonb_typeof(value)<>'array' or exists(select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'object')))
   or (key in('position','lesson_number','scheduled_duration','rec_duration') and jsonb_typeof(value) not in('number','null'))
   or (key='lesson_sched_manual' and jsonb_typeof(value) not in('boolean','null'))
   or (key not in('position','lesson_number','scheduled_duration','rec_duration','lesson_sched_manual','test_tasks') and jsonb_typeof(value) not in('string','null')))
   or exists(select 1 from jsonb_each(coalesce(op->'homework_set','{}')) where
    (key in('hwDateManual','recHwDateManual') and jsonb_typeof(value) not in('boolean','null'))
    or (key not in('hwDateManual','recHwDateManual') and jsonb_typeof(value) not in('string','null'))) then
   raise invalid_parameter_value using message='Invalid lesson scalar type';end if;
  if coalesce(op->'set','{}') ? 'module_id' then need_modules:=true;end if;
 end loop;
 select coalesce(array_agg((value->>'id')::uuid),'{}'),coalesce(array_agg(value->>'short_id'),'{}') into delete_ids,seen_refs from jsonb_array_elements(p_lesson_deletes);
 if cardinality(delete_ids)<>(select count(distinct id) from unnest(delete_ids) id)
  or cardinality(seen_refs)<>(select count(distinct ref) from unnest(seen_refs) ref)
  or delete_ids && patch_ids then raise invalid_parameter_value using message='Duplicate or overlapping lesson delete';end if;
 for op in select value from jsonb_array_elements(p_lesson_deletes) loop
  if op->>'id' is null or op->>'short_id' is null or exists(select 1 from jsonb_object_keys(op) k where k not in('id','short_id'))
   or (by_ref->(op->>'short_id')->>'id')::uuid is distinct from (op->>'id')::uuid then
   raise insufficient_privilege using message='Lesson delete UUID/ref is not in owned inventory';end if;
 end loop;
 need_modules:=need_modules or jsonb_array_length(p_module_ops)>0;
 if need_modules then
  select coalesce(array_agg((value->>'id')::uuid),'{}') into seen_ids from jsonb_array_elements(p_module_ops);
  if cardinality(seen_ids)<>(select count(distinct id) from unnest(seen_ids) id) then raise invalid_parameter_value using message='Duplicate module operation';end if;
  deleted_module_ids:='{}';
  for op in select value from jsonb_array_elements(p_module_ops) loop
   if op->>'id' is null or op->>'op' not in('patch','delete') or op->>'op' is null
    or exists(select 1 from jsonb_object_keys(op) k where k not in('id','op','expected','set'))
    or jsonb_typeof(op->'expected') is distinct from 'object' or not(op->'expected' ?& array['label','position'])
    or exists(select 1 from jsonb_object_keys(op->'expected') k where k not in('label','position')) then
    raise invalid_parameter_value using message='Module operation requires complete expected fields';end if;
   old_row:=modules_by_id->((op->>'id')::uuid::text);
   if old_row is null then raise insufficient_privilege using message='Module is not owned by course';end if;
   normalized:=jsonb_build_object('label',op->'expected'->>'label','position',(op->'expected'->>'position')::integer);
   if normalized is distinct from old_row-'id' then
    raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Module expected fields differ; no new baseline was adopted';end if;
   if op->>'op'='delete' then
    if op ? 'set' then raise invalid_parameter_value using message='Delete cannot contain fields';end if;
    deleted_module_ids:=array_append(deleted_module_ids,(op->>'id')::uuid);
   else
    if jsonb_typeof(op->'set') is distinct from 'object' or exists(select 1 from jsonb_object_keys(op->'set') k where k not in('label','position')) then
     raise invalid_parameter_value using message='Unsupported module fields';end if;
    if exists(select 1 from jsonb_each(op->'set') where (key='label' and jsonb_typeof(value)<>'string')
     or (key='position' and jsonb_typeof(value)<>'number')) then raise invalid_parameter_value using message='Invalid module scalar type';end if;
    normalized:=old_row||(op->'set');
    normalized:=jsonb_build_object('id',(old_row->>'id')::uuid,'label',normalized->>'label','position',(normalized->>'position')::integer);
    if normalized->>'label' is null or normalized->>'position' is null then raise invalid_parameter_value using message='Invalid module fields';end if;
    if normalized is distinct from old_row then changed_modules:=changed_modules||jsonb_build_array(normalized);end if;
   end if;
   ack_module:=ack_module||jsonb_build_array(op);
  end loop;
  for op in select value from jsonb_array_elements(p_lesson_patches) loop
   if coalesce(op->'set','{}') ? 'module_id' then
    fk:=(op->'set'->>'module_id')::uuid;
    if fk is null or not(modules_by_id ? fk::text) or fk=any(deleted_module_ids) then
     raise insufficient_privilege using message='Lesson target module is not a retained owned module';end if;
   end if;
  end loop;
  -- A module delete is explicit, never an implicit FK-clearing operation.
  -- Every surviving reference must be explicitly moved in this same delta.
  for old_row in select value from jsonb_array_elements(inventory) loop
   if not((old_row->>'id')::uuid=any(delete_ids)) then
    remaining_fk:=(old_row->>'module_id')::uuid;
    select (value->'set'->>'module_id')::uuid into fk from jsonb_array_elements(p_lesson_patches)
     where (value->>'id')::uuid=(old_row->>'id')::uuid and coalesce(value->'set','{}') ? 'module_id';
    if found then remaining_fk:=fk;end if;
    if remaining_fk=any(deleted_module_ids) then raise invalid_parameter_value using message='Module delete would clear an unmentioned lesson FK';end if;
   end if;
  end loop;
 end if;

 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_operation_validation','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 -- Full row reads are restricted to the changed targets, after inventory/CAS
 -- validation. Omitted homework/content keys are merged with this trusted raw
 -- row, never with UI defaults or a reconstructed whole lesson.
 if cardinality(patch_ids)>0 then
  select coalesce(jsonb_object_agg(short_id,to_jsonb(l)),'{}') into targets from public.lessons l where l.course_id=c.id and l.id=any(patch_ids);
  if (select count(*) from jsonb_object_keys(targets))<>cardinality(patch_ids) then raise insufficient_privilege using message='Could not verify full patch targets';end if;
  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_target_read','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  for op in select value from jsonb_array_elements(p_lesson_patches) loop
   old_row:=targets->(op->>'short_id');merged:=old_row||coalesce(op->'set','{}');keys:='{}';
   select coalesce(array_agg(k),'{}') into keys from jsonb_object_keys(coalesce(op->'set','{}')) k;
   if coalesce(op->'homework_set','{}')<>'{}'::jsonb then
    if old_row->'homework' not in('null'::jsonb) and jsonb_typeof(old_row->'homework') is distinct from 'object' then
     raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: non-object homework is not eligible for leaf patch';end if;
    merged:=jsonb_set(merged,'{homework}',coalesce(nullif(old_row->'homework','null'::jsonb),'{}')||(op->'homework_set'));keys:=array_append(keys,'homework');
   end if;
   if coalesce(op->'content_set','{}')<>'{}'::jsonb then
    if old_row->'content' not in('null'::jsonb) and jsonb_typeof(old_row->'content') is distinct from 'object' then
     raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: non-object content is not eligible for leaf patch';end if;
    merged:=jsonb_set(merged,'{content}',coalesce(nullif(old_row->'content','null'::jsonb),'{}')||(op->'content_set'));keys:=array_append(keys,'content');
   end if;
   if coalesce(op->'set','{}')?'test_tasks' and public._iskra_existing_json_preserved_20261122(old_row->'test_tasks',op->'set'->'test_tasks') is not true then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: task array identity/unknown-attribute loss';end if;
   merged:=public._iskra_wide_apply_json_ops_20261122(merged,coalesce(op->'json_ops','[]'));
   select coalesce(array_agg(distinct key),'{}') into keys from unnest(keys||array(select distinct value->>'column' from jsonb_array_elements(coalesce(op->'json_ops','[]')))) key;
   typed_l:=jsonb_populate_record(null::public.lessons,merged);normalized:=to_jsonb(typed_l);
   select coalesce(array_agg(k order by k),'{}') into keys from unnest(keys) k where normalized->k is distinct from old_row->k;
   if cardinality(keys)>0 then updates:=updates||jsonb_build_array(normalized||jsonb_build_object('_keys',keys));end if;
   acknowledgements:=acknowledgements||jsonb_build_array(jsonb_build_object('id',typed_l.id,'short_id',typed_l.short_id,
    'set',(select coalesce(jsonb_object_agg(k,normalized->k),'{}') from jsonb_object_keys(coalesce(op->'set','{}')) k),
    'homework_set',(select coalesce(jsonb_object_agg(k,normalized->'homework'->k),'{}') from jsonb_object_keys(coalesce(op->'homework_set','{}')) k),
    'content_set',(select coalesce(jsonb_object_agg(k,normalized->'content'->k),'{}') from jsonb_object_keys(coalesce(op->'content_set','{}')) k),
    'json_ops',(select coalesce(jsonb_agg(case when value->>'op'='set' then value||jsonb_build_object('value',normalized#>(array[value->>'column']||array(select jsonb_array_elements_text(value->'path')))) else value end),'[]') from jsonb_array_elements(coalesce(op->'json_ops','[]')))));
  end loop;
 else
  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_target_read','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 end if;
 touched_structure:=jsonb_array_length(updates)>0 or cardinality(delete_ids)>0 or jsonb_array_length(changed_modules)>0 or coalesce(cardinality(deleted_module_ids),0)>0;
 next_c:=jsonb_populate_record(c,p_course_patch);
 select coalesce(array_agg(k order by k),'{}') into changed_course_keys from jsonb_object_keys(p_course_patch) k where to_jsonb(next_c)->k is distinct from to_jsonb(c)->k;
 if cardinality(changed_course_keys)>0 or touched_structure then
  version_target:=greatest(clock_timestamp(),stamp+interval '1 microsecond');
  next_c.updated_at:=version_target;
 end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_projection','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if cardinality(changed_course_keys)>0 then
  select string_agg(format('%I=r.%I',k,k),',') into set_sql from unnest(changed_course_keys) k;
  set_sql:=set_sql||',updated_at=r.updated_at';
  execute format('update public.courses target set %s from jsonb_populate_record(null::public.courses,$1) r where target.id=$2 returning target.*',set_sql) into c using to_jsonb(next_c),c.id;
  get diagnostics count_actual=row_count;if count_actual<>1 then raise insufficient_privilege using message='Course patch denied';end if;
 elsif touched_structure then
  update public.courses set updated_at=version_target where id=c.id returning * into c;
  if not found then raise insufficient_privilege using message='Course revision write denied';end if;
 end if;
 -- Current production set_updated_at always clamps explicit timestamps to
 -- transaction now(). Verify the returned value rather than promising that
 -- clock_timestamp()/max+1us survived that trigger. Fail closed if a waited-on
 -- foreign commit/future timestamp would prevent invalidating older clients.
 if (cardinality(changed_course_keys)>0 or touched_structure) and c.updated_at<=stamp then
  raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: course revision did not advance';end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_course_update','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if jsonb_array_length(changed_modules)>0 then
  update public.course_modules m set label=r.label,position=r.position from jsonb_populate_recordset(null::public.course_modules,changed_modules) r where m.course_id=c.id and m.id=r.id;
  get diagnostics count_actual=row_count;if count_actual<>jsonb_array_length(changed_modules) then raise insufficient_privilege using message='Module patch denied';end if;
 end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_module_write','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 -- Group by whitelisted field set: 80 title edits use one UPDATE, not 80
 -- separate RLS-planned statements. Column identifiers never come unchecked.
 for group_row in select value->'_keys' keyset,jsonb_agg(value-'_keys') row_data from jsonb_array_elements(updates) group by value->'_keys' loop
  select string_agg(format('%I=r.%I',k,k),',') into set_sql from jsonb_array_elements_text(group_row.keyset) k;
  execute format('with changed as(update public.lessons target set %s from jsonb_populate_recordset(null::public.lessons,$1) r where target.course_id=$2 and target.id=r.id returning target.id,target.short_id,target.module_id,target.updated_at) select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(changed)),''{}''::jsonb) from changed',set_sql)
   into count_actual,changed_ack using group_row.row_data,c.id;
  if count_actual<>jsonb_array_length(group_row.row_data) then raise insufficient_privilege using message='Lesson patch denied';end if;
  final_inventory:=final_inventory||changed_ack;
 end loop;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_lesson_update','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if cardinality(delete_ids)>0 then
  delete from public.lessons where course_id=c.id and id=any(delete_ids);
  get diagnostics count_actual=row_count;if count_actual<>cardinality(delete_ids) then raise insufficient_privilege using message='Lesson delete denied';end if;
  final_inventory:=final_inventory-delete_ids::text[];
 end if;
 if coalesce(cardinality(deleted_module_ids),0)>0 then
  delete from public.course_modules where course_id=c.id and id=any(deleted_module_ids);
  get diagnostics count_actual=row_count;if count_actual<>cardinality(deleted_module_ids) then raise insufficient_privilege using message='Module delete denied';end if;
 end if;
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_deletes','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 if jsonb_array_length(changed_modules)>0 then
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into normalized from jsonb_array_elements(changed_modules);
  modules_by_id:=modules_by_id||normalized;
 end if;
 if coalesce(cardinality(deleted_module_ids),0)>0 then modules_by_id:=modules_by_id-deleted_module_ids::text[];end if;
 select coalesce(jsonb_agg(value order by (value->>'id')::uuid),'[]') into modules from jsonb_each(modules_by_id);
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_each(final_inventory);
 select coalesce(jsonb_object_agg(k,to_jsonb(c)->k),'{}') into ack_course from jsonb_object_keys(p_course_patch) k;
 qa_result:=jsonb_build_object('course_id',c.id,'stamp',stamp,'full_snapshot_confirmed',true,'module_witness',modules,
  'lesson_witness',coalesce((select jsonb_agg(value order by (value->>'id')::uuid) from jsonb_each(final_inventory)),'[]'),'applied_course_patch',ack_course,'applied_lesson_patches',acknowledgements,
  'applied_lesson_deletes',p_lesson_deletes,'applied_module_ops',ack_module);
 qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','delta_ack_construction','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
 return qa_result||jsonb_build_object('_qa_profile',jsonb_build_object('steps',qa_steps,
  'runtime_jit_enabled',case current_setting('jit',true) when 'on' then 1 else 0 end,
  'runtime_plan_cache_mode',case current_setting('plan_cache_mode',true) when 'force_generic_plan' then 1 when 'force_custom_plan' then 2 else 0 end,
  'function_ms',round(extract(epoch from(clock_timestamp()-qa_start))*1000,3)));
end;
$$;
revoke all on function public.save_course_wide_delta_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_course_wide_delta_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

revoke all on function public._iskra_existing_json_preserved_20261122(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public._iskra_existing_json_preserved_20261122(jsonb,jsonb) to authenticated;
revoke all on function public._iskra_wide_json_op_valid_20261122(jsonb) from public,anon,authenticated;
grant execute on function public._iskra_wide_json_op_valid_20261122(jsonb) to authenticated;
revoke all on function public._iskra_wide_apply_json_ops_20261122(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public._iskra_wide_apply_json_ops_20261122(jsonb,jsonb) to authenticated;
revoke all on function public.save_course_wide_delta_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_course_wide_delta_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';
