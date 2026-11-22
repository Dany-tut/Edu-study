-- Distinct-field full fallback with immutable raw provenance in the client.
-- Existing owner, RLS, history and access helper contracts remain mandatory.
set lock_timeout='2s';
set statement_timeout='8s';
do $guard$ begin
 if to_regprocedure('public.save_course_content_full(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null then raise exception 'Full save namespace already occupied'; end if;
 if (select encode(extensions.digest(pg_catalog.pg_get_functiondef(p.oid),'sha256'),'hex') from pg_catalog.pg_proc p where p.oid='public.save_course_access_changes(uuid,jsonb)'::regprocedure) is distinct from '9cdd85648afa78b4f8d7cbac697a6ebd811933c02c7513545661c06315265606' then raise exception 'Access helper changed; review required'; end if;
end $guard$;
CREATE FUNCTION public.save_course_content_full(p_short_id text, p_baseline timestamp with time zone, p_course jsonb, p_modules jsonb, p_lessons jsonb, p_changes jsonb, p_expected_modules jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare
  c public.courses%rowtype;
  current_stamp timestamptz; before_stamp timestamptz; expected_modules jsonb; op jsonb; changed_keys text[]; module_fields text[]; group_row record; set_sql text; next_c public.courses%rowtype;
  saved_lessons jsonb;
  saved_modules jsonb;
  by_ref jsonb;
  by_module jsonb;
  final_rows jsonb;
  incoming jsonb;
  previous_row jsonb;
  normalized jsonb;
  previous_values jsonb;
  course_values jsonb;
  previous_course_values jsonb;
  field_names text[] := array['module_id','short_id','title','position','lesson_number','youtube_url','timecodes','chapter_variants',
    'description','content','kind','test_tasks','materials','scheduled_date','scheduled_time','scheduled_duration',
    'rec_date','rec_time','rec_duration','lesson_sched_manual','delivery_mode','homework'];
  module_ids uuid[];
  lesson_refs text[];
  changed_modules jsonb := '[]';
  new_modules jsonb := '[]';
  changed_lessons jsonb := '[]';
  new_lessons jsonb := '[]';
  delete_module_ids uuid[];
  delete_lesson_ids uuid[];
  written_rows jsonb;
  access_result jsonb; normalized_changes jsonb; has_access_intents boolean;

  actual_count integer;
begin
  if auth.uid() is null then raise insufficient_privilege using message='forbidden'; end if;
  select * into c from public.courses where short_id=p_short_id and created_by=auth.uid() for update;
  if not found then raise insufficient_privilege using message='Course not found or not owned'; end if;
  -- Validate exact normalized intent maps BEFORE any product write. Do not
  -- reinterpret their merge/ownership/mode semantics; existing helper owns it.
  if jsonb_typeof(p_changes) is distinct from 'object'
    or p_changes-array['students','groups','modes'] is distinct from '{}'::jsonb
    or jsonb_typeof(coalesce(p_changes->'students','{}')) is distinct from 'object'
    or jsonb_typeof(coalesce(p_changes->'groups','{}')) is distinct from 'object'
    or jsonb_typeof(coalesce(p_changes->'modes','{}')) is distinct from 'object'
    or exists(select 1 from jsonb_each(coalesce(p_changes->'students','{}')) where jsonb_typeof(value)<>'boolean')
    or exists(select 1 from jsonb_each(coalesce(p_changes->'groups','{}')) where jsonb_typeof(value)<>'boolean')
    or exists(select 1 from jsonb_each(coalesce(p_changes->'modes','{}')) where value not in('"full"'::jsonb,'"custom"'::jsonb,'"by_date"'::jsonb)) then
    raise invalid_parameter_value using message='Invalid normalized full access intents';end if;
  normalized_changes:=jsonb_build_object('students',coalesce(p_changes->'students','{}'),
    'groups',coalesce(p_changes->'groups','{}'),'modes',coalesce(p_changes->'modes','{}'));
  has_access_intents:=normalized_changes->'students'<>'{}'::jsonb or normalized_changes->'groups'<>'{}'::jsonb or normalized_changes->'modes'<>'{}'::jsonb;
  -- Exactly one authoritative lesson-table read. Lock before evaluating CAS.
  select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into saved_lessons from (
    select * from public.lessons where course_id=c.id order by id for update
  ) locked;
  select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into current_stamp
    from jsonb_array_elements(saved_lessons);
  if current_stamp is null or p_baseline is null then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';
  end if;
  before_stamp:=current_stamp;
  if current_stamp is distinct from p_baseline then
    raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(current_stamp)#>>'{}');
  end if;
  if jsonb_typeof(p_course) is distinct from 'object'
    or jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules)=0
    or jsonb_typeof(p_lessons) is distinct from 'array' or jsonb_typeof(p_changes) is distinct from 'object'
    or not(p_course ?& array['title','subject','level','description','status','color','bg'])
    or p_course->>'status' not in ('draft','published') or p_course->>'status' is null
  then raise invalid_parameter_value using message='Invalid course content snapshot'; end if;
  if exists(select 1 from jsonb_object_keys(p_course) k where k not in
    ('title','subject','level','description','status','color','bg','seed_stamp','number_start')) then
    raise invalid_parameter_value using message='Invalid course fields';
  end if;
  if p_course->>'status' is distinct from c.status then
    raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(current_stamp)#>>'{}'),detail='Publication must use its separate barrier';end if;
  if exists(select 1 from jsonb_each(p_course) where
    (key='number_start' and jsonb_typeof(value) not in('number','null'))
    or (key<>'number_start' and jsonb_typeof(value) not in('string','null'))) then
    raise invalid_parameter_value using message='Invalid course scalar type';end if;
  if exists(select 1 from jsonb_array_elements(p_modules) e where jsonb_typeof(e) is distinct from 'object'
    or not(e ?& array['id','label','position']) or exists(select 1 from jsonb_object_keys(e) k where k not in('id','label','position'))
    or jsonb_typeof(e->'id') is distinct from 'string' or jsonb_typeof(e->'label') is distinct from 'string'
    or jsonb_typeof(e->'position') is distinct from 'number' or (e->>'position')::numeric<>trunc((e->>'position')::numeric)) then
    raise invalid_parameter_value using message='Invalid module scalar type';end if;
  if exists(select 1 from jsonb_array_elements(p_lessons) e where jsonb_typeof(e) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(e) k where not(k=any(field_names)))
    or exists(select 1 from jsonb_each(e) x where
      (x.key in('short_id','module_id','title','youtube_url','description','kind','scheduled_date','scheduled_time','rec_date','rec_time','delivery_mode') and jsonb_typeof(x.value) not in('string','null'))
      or (x.key in('position','lesson_number','scheduled_duration','rec_duration') and jsonb_typeof(x.value) not in('number','null'))
      or (x.key='lesson_sched_manual' and jsonb_typeof(x.value) not in('boolean','null')))) then
    raise invalid_parameter_value using message='Invalid lesson field or scalar type';end if;
  select array_agg((value->>'id')::uuid),count(distinct (value->>'id')::uuid) into module_ids,actual_count
    from jsonb_array_elements(p_modules);
  if actual_count<>jsonb_array_length(p_modules) or array_position(module_ids,null) is not null
    or exists(select 1 from jsonb_array_elements(p_modules) where value->>'label' is null or value->>'position' is null)
  then raise insufficient_privilege using message='Invalid course module identities'; end if;
  select coalesce(array_agg(value->>'short_id'),'{}'),count(distinct value->>'short_id') into lesson_refs,actual_count
    from jsonb_array_elements(p_lessons);
  if actual_count<>jsonb_array_length(p_lessons)
    or exists(select 1 from jsonb_array_elements(p_lessons) where value->>'short_id' is null or value->>'short_id'=''
      or value->>'module_id' is null or not((value->>'module_id')::uuid=any(module_ids))
      or not(value ?& array_remove(field_names,'chapter_variants')))
  then raise insufficient_privilege using message='Invalid course lesson identities'; end if;

  select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into saved_modules from (
    select id,label,position from public.course_modules where course_id=c.id order by id for update
  ) locked;
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
 select count(distinct (value->>'id')::uuid) into actual_count from jsonb_array_elements(p_expected_modules);
 if actual_count<>jsonb_array_length(p_expected_modules) then raise invalid_parameter_value using message='Duplicate module witness UUID';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',(value->>'id')::uuid,'label',value->>'label','position',(value->>'position')::integer)
  order by (value->>'id')::uuid),'[]') into expected_modules from jsonb_array_elements(p_expected_modules);
 if saved_modules is distinct from expected_modules then
  raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(current_stamp)#>>'{}'),detail='Complete module witness changed; full source was not confirmed';end if;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into by_module from jsonb_array_elements(saved_modules);
  select coalesce(jsonb_object_agg(value->>'short_id',value),'{}') into by_ref
    from jsonb_array_elements(saved_lessons) where value->>'short_id' is not null;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into final_rows from jsonb_array_elements(saved_lessons);
  select coalesce(array_agg((value->>'id')::uuid),'{}') into delete_module_ids
    from jsonb_array_elements(saved_modules) where not((value->>'id')::uuid=any(module_ids));
  -- NULL legacy refs were not deleted by the original NOT IN/ANY path either.
  select coalesce(array_agg((value->>'id')::uuid),'{}') into delete_lesson_ids
    from jsonb_array_elements(saved_lessons) where value->>'short_id' is not null and not(value->>'short_id'=any(lesson_refs));

  -- Content-only FULL must not detach historical/current calendar owners.
  if exists(select 1 from public.schedule_lessons where lesson_id=any(delete_lesson_ids)) then
    raise invalid_parameter_value using message='Scheduled lesson deletion requires schedule-aware coordinator';end if;
  -- Never implicitly clear a legacy NULL-ref row's FK via module deletion.
  -- Such a course needs explicit legacy identity reconciliation, not inferred ACK.
  if exists(select 1 from jsonb_array_elements(saved_lessons) e where e->>'short_id' is null
    and (e->>'module_id')::uuid=any(delete_module_ids)) then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: legacy lesson FK requires explicit reconciliation';end if;
  for incoming in select value from jsonb_array_elements(p_modules) loop
    normalized:=jsonb_build_object('id',(incoming->>'id')::uuid,'label',incoming->>'label','position',(incoming->>'position')::integer);
    previous_row:=by_module->(normalized->>'id');
    if previous_row is null then new_modules:=new_modules||jsonb_build_array(normalized);
    elsif normalized is distinct from previous_row then
      select array_agg(k order by k) into module_fields from unnest(array['label','position']) k where normalized->k is distinct from previous_row->k;
      changed_modules:=changed_modules||jsonb_build_array(normalized||jsonb_build_object('_keys',module_fields));
    end if;
  end loop;
  for incoming in select value from jsonb_array_elements(p_lessons) loop
    previous_row:=by_ref->(incoming->>'short_id');
    -- The comparison owns only the explicit content-save whitelist; generated
    -- columns, arbitrary client keys, ownership, progress and visibility never
    -- participate in an UPDATE or an identity acknowledgement.
    select jsonb_object_agg(k,case when k='chapter_variants' and not(incoming ? k)
      then coalesce(previous_row->k,'null'::jsonb) else coalesce(incoming->k,'null'::jsonb) end)
      into normalized from unnest(field_names) k;
    if previous_row is null then new_lessons:=new_lessons||jsonb_build_array(normalized);
    else
      select jsonb_object_agg(k,coalesce(previous_row->k,'null'::jsonb)) into previous_values from unnest(field_names) k;
      if normalized is distinct from previous_values then
        select array_agg(k order by k) into changed_keys from unnest(field_names) k where k<>'short_id' and normalized->k is distinct from previous_values->k;
        changed_lessons:=changed_lessons||jsonb_build_array(normalized||jsonb_build_object('_keys',changed_keys));
      end if;
    end if;
  end loop;

  course_values:=jsonb_build_object('title',p_course->'title','subject',p_course->'subject','level',p_course->'level',
    'description',p_course->'description','status',p_course->'status','color',p_course->'color','bg',p_course->'bg',
    'seed_stamp',case when p_course ? 'seed_stamp' then p_course->'seed_stamp' else to_jsonb(c)->'seed_stamp' end,
    'number_start',case when p_course ? 'number_start' then p_course->'number_start' else to_jsonb(c)->'number_start' end);
  select jsonb_object_agg(k,to_jsonb(c)->k) into previous_course_values from jsonb_object_keys(course_values) k;
  select coalesce(array_agg(k order by k),'{}') into changed_keys from jsonb_object_keys(course_values) k where course_values->k is distinct from previous_course_values->k;
  if cardinality(changed_keys)>0 or jsonb_array_length(changed_modules)>0 or jsonb_array_length(new_modules)>0
    or jsonb_array_length(changed_lessons)>0 or jsonb_array_length(new_lessons)>0
    or cardinality(delete_module_ids)>0 or cardinality(delete_lesson_ids)>0 then
    next_c:=jsonb_populate_record(c,course_values);next_c.updated_at:=greatest(clock_timestamp(),before_stamp+interval '1 microsecond');
    select string_agg(format('%I=r.%I',k,k),',') into set_sql from unnest(changed_keys) k;
    set_sql:=case when set_sql is null then '' else set_sql||',' end||'updated_at=r.updated_at';
    execute format('update public.courses target set %s from jsonb_populate_record(null::public.courses,$1) r where target.id=$2 returning target.*',set_sql)
      into c using to_jsonb(next_c),c.id;
    get diagnostics actual_count=row_count;if actual_count<>1 then raise insufficient_privilege using message='Course update denied';end if;
    if c.updated_at<=before_stamp then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: full course revision did not advance';end if;
  end if;
  if jsonb_array_length(new_modules)>0 then
    -- Strict INSERT rather than conflict-rebinding: an absent UUID which belongs
    -- to another (even invisible) course must fail on RLS/unique, never be linked.
    insert into public.course_modules(id,course_id,label,position)
      select r.id,c.id,r.label,r.position from jsonb_populate_recordset(null::public.course_modules,new_modules) r;
    get diagnostics actual_count=row_count;
    if actual_count<>jsonb_array_length(new_modules) then raise insufficient_privilege using message='Module insert denied'; end if;
  end if;
  for group_row in select value->'_keys' keyset,jsonb_agg(value-'_keys') row_data from jsonb_array_elements(changed_modules) group by value->'_keys' loop
    select string_agg(format('%I=r.%I',k,k),',') into set_sql from jsonb_array_elements_text(group_row.keyset) k;
    execute format('update public.course_modules target set %s from jsonb_populate_recordset(null::public.course_modules,$1) r where target.course_id=$2 and target.id=r.id',set_sql) using group_row.row_data,c.id;
    get diagnostics actual_count=row_count;if actual_count<>jsonb_array_length(group_row.row_data) then raise insufficient_privilege using message='Module update denied';end if;
  end loop;
  for group_row in select value->'_keys' keyset,jsonb_agg(value-'_keys') row_data from jsonb_array_elements(changed_lessons) group by value->'_keys' loop
    select string_agg(format('%I=r.%I',k,k),',') into set_sql from jsonb_array_elements_text(group_row.keyset) k;
    execute format('with written as(update public.lessons target set %s from jsonb_populate_recordset(null::public.lessons,$1) r where target.course_id=$2 and target.short_id=r.short_id returning target.id,target.short_id,target.title,target.position,target.lesson_number,target.updated_at,target.module_id) select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(written)),''{}''::jsonb) from written',set_sql)
      into actual_count,written_rows using group_row.row_data,c.id;
    if actual_count<>jsonb_array_length(group_row.row_data) then raise insufficient_privilege using message='Lesson update denied';end if;
    final_rows:=final_rows||written_rows;
  end loop;
  if jsonb_array_length(new_lessons)>0 then
    with written as (
      insert into public.lessons(course_id,module_id,short_id,title,position,lesson_number,youtube_url,timecodes,chapter_variants,
        description,content,kind,test_tasks,materials,scheduled_date,scheduled_time,scheduled_duration,rec_date,rec_time,rec_duration,
        lesson_sched_manual,delivery_mode,homework)
      select c.id,d.module_id,d.short_id,d.title,d.position,d.lesson_number,d.youtube_url,d.timecodes,d.chapter_variants,
        d.description,d.content,d.kind,d.test_tasks,d.materials,d.scheduled_date,d.scheduled_time,d.scheduled_duration,
        d.rec_date,d.rec_time,d.rec_duration,d.lesson_sched_manual,d.delivery_mode,d.homework
      from jsonb_populate_recordset(null::public.lessons,new_lessons) d
      returning id,short_id,title,position,lesson_number,updated_at,module_id
    ) select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(written)),'{}') into actual_count,written_rows from written;
    if actual_count<>jsonb_array_length(new_lessons) then raise insufficient_privilege using message='Lesson insert denied'; end if;
    final_rows:=final_rows||written_rows;
  end if;
  if cardinality(delete_lesson_ids)>0 then
    delete from public.lessons where id=any(delete_lesson_ids) and course_id=c.id;
    get diagnostics actual_count=row_count;
    if actual_count<>cardinality(delete_lesson_ids) then raise insufficient_privilege using message='Lesson delete denied'; end if;
    final_rows:=final_rows-delete_lesson_ids::text[];
  end if;
  if cardinality(delete_module_ids)>0 then
    delete from public.course_modules where id=any(delete_module_ids) and course_id=c.id;
    get diagnostics actual_count=row_count;
    if actual_count<>cardinality(delete_module_ids) then raise insufficient_privilege using message='Module delete denied'; end if;
  end if;

  if has_access_intents then
    -- Exact existing SECURITY INVOKER helper, SAME transaction/owned lock.
    -- Any error rolls back all earlier content/roster/history mutations too.
    access_result:=public.save_course_access_changes(c.id,normalized_changes);
    if access_result is null or access_result->>'updated_at' is null then
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: access acknowledgement missing';end if;
    c.updated_at:=(access_result->>'updated_at')::timestamptz;
    if c.updated_at<=before_stamp then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: access revision did not advance';end if;
  else
    -- Read current snapshot only: no empty-helper call/group membership scan,
    -- no implicit reconciliation or progress/schedule/publication work.
    select jsonb_build_object('student_ids',c.student_ids,'group_ids',c.group_ids,'updated_at',c.updated_at,
      'access_modes',coalesce((select jsonb_object_agg(student_id,access_mode) from public.course_enrollments where course_id=c.id),'{}'::jsonb)) into access_result;
  end if;
  select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into current_stamp from jsonb_each(final_rows);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'position',position) order by id),'[]') into saved_modules from public.course_modules where course_id=c.id;
  return jsonb_build_object('course_id',c.id,'stamp',current_stamp,'access',access_result,'full_snapshot_confirmed',true,'module_witness',saved_modules,
    'lesson_witness',coalesce((select jsonb_agg(jsonb_build_object('id',value->'id','short_id',value->'short_id','module_id',value->'module_id','updated_at',value->'updated_at') order by (value->>'id')::uuid) from jsonb_each(final_rows)),'[]'),
    'lessons',coalesce((select jsonb_agg(jsonb_build_object('id',value->>'id','lesson_number',(value->>'lesson_number')::integer,'title',value->>'title') order by (value->>'position')::integer) from jsonb_each(final_rows)),'[]'));
end;
$function$;
revoke all on function public.save_course_content_full(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_course_content_full(text,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
