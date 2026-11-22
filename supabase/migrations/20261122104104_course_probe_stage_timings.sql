-- Numeric-only stages INSIDE the same restricted QA function. No global fastpath.
create or replace function public.save_course_content_probe_20261122(
  p_short_id text, p_baseline timestamptz, p_course jsonb,
  p_modules jsonb, p_lessons jsonb, p_changes jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  qa_start timestamptz; qa_mark timestamptz; qa_steps jsonb := '[]';
  c public.courses%rowtype;
  current_stamp timestamptz;
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
  access_result jsonb;
  access_noop boolean := false;
  have_enrollments boolean;
  actual_count integer;
begin
  qa_start:=clock_timestamp();qa_mark:=qa_start;
  if p_short_id is distinct from '00e3a0efbf' or auth.uid() is distinct from '1eaf6264-0a38-41f7-bd53-4a404764393f'::uuid then
    raise insufficient_privilege using message='QA probe scope denied';
  end if;
  if auth.uid() is null then raise insufficient_privilege using message='forbidden'; end if;
  select * into c from public.courses where short_id=p_short_id and created_by=auth.uid() for update;
  if not found then raise insufficient_privilege using message='Course not found or not owned'; end if;
  -- Server authority, never the URL flag or client audience snapshot. Reject
  -- every other course/owner, publication and grant before ANY product write.
  if c.status is distinct from 'draft' or p_course->>'status' is distinct from 'draft'
    or c.student_ids is distinct from '{}'::uuid[] or c.group_ids is distinct from '{}'::uuid[]
    or jsonb_typeof(p_changes) is distinct from 'object'
    or p_changes-array['students','groups','modes'] is distinct from '{}'::jsonb
    or coalesce(p_changes->'students','{}') is distinct from '{}'::jsonb
    or coalesce(p_changes->'groups','{}') is distinct from '{}'::jsonb
    or coalesce(p_changes->'modes','{}') is distinct from '{}'::jsonb then
    raise insufficient_privilege using message='QA probe requires an unassigned draft with no access intents';
  end if;
  select exists(select 1 from public.course_enrollments where course_id=c.id) into have_enrollments;
  if have_enrollments then raise insufficient_privilege using message='QA probe requires no enrollments'; end if;


  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','owner_lock_and_probe_gate','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  -- Exactly one authoritative lesson-table read. Lock before evaluating CAS.
  select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into saved_lessons from (
    select * from public.lessons where course_id=c.id order by id for update
  ) locked;
  select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into current_stamp
    from jsonb_array_elements(saved_lessons);
  if current_stamp is null or p_baseline is null then
    raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';
  end if;
  if current_stamp is distinct from p_baseline then
    raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(current_stamp)#>>'{}');
  end if;
  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','lesson_snapshot_and_cas','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
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
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into by_module from jsonb_array_elements(saved_modules);
  select coalesce(jsonb_object_agg(value->>'short_id',value),'{}') into by_ref
    from jsonb_array_elements(saved_lessons) where value->>'short_id' is not null;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}') into final_rows from jsonb_array_elements(saved_lessons);
  select coalesce(array_agg((value->>'id')::uuid),'{}') into delete_module_ids
    from jsonb_array_elements(saved_modules) where not((value->>'id')::uuid=any(module_ids));
  -- NULL legacy refs were not deleted by the original NOT IN/ANY path either.
  select coalesce(array_agg((value->>'id')::uuid),'{}') into delete_lesson_ids
    from jsonb_array_elements(saved_lessons) where value->>'short_id' is not null and not(value->>'short_id'=any(lesson_refs));

  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','payload_validation_and_module_snapshot','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  for incoming in select value from jsonb_array_elements(p_modules) loop
    normalized:=jsonb_build_object('id',(incoming->>'id')::uuid,'label',incoming->>'label','position',(incoming->>'position')::integer);
    previous_row:=by_module->(normalized->>'id');
    if previous_row is null then new_modules:=new_modules||jsonb_build_array(normalized);
    elsif normalized is distinct from previous_row then changed_modules:=changed_modules||jsonb_build_array(normalized);
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
      if normalized is distinct from previous_values then changed_lessons:=changed_lessons||jsonb_build_array(normalized); end if;
    end if;
  end loop;

  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','json_projection_and_comparison','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  course_values:=jsonb_build_object('title',p_course->'title','subject',p_course->'subject','level',p_course->'level',
    'description',p_course->'description','status',p_course->'status','color',p_course->'color','bg',p_course->'bg',
    'seed_stamp',case when p_course ? 'seed_stamp' then p_course->'seed_stamp' else to_jsonb(c)->'seed_stamp' end,
    'number_start',case when p_course ? 'number_start' then p_course->'number_start' else to_jsonb(c)->'number_start' end);
  select jsonb_object_agg(k,to_jsonb(c)->k) into previous_course_values from jsonb_object_keys(course_values) k;
  -- Structural changes must advance the course stamp even when its title etc
  -- stay equal: a removed non-latest lesson/module must invalidate old tabs.
  if course_values is distinct from previous_course_values
    or jsonb_array_length(changed_modules)>0 or jsonb_array_length(new_modules)>0
    or jsonb_array_length(changed_lessons)>0 or jsonb_array_length(new_lessons)>0
    or cardinality(delete_module_ids)>0 or cardinality(delete_lesson_ids)>0 then
    update public.courses set title=course_values->>'title',subject=course_values->>'subject',level=course_values->>'level',
      description=course_values->>'description',status=course_values->>'status',color=course_values->>'color',bg=course_values->>'bg',
      seed_stamp=course_values->>'seed_stamp',number_start=(course_values->>'number_start')::integer
      where id=c.id returning * into c;
    if not found then raise insufficient_privilege using message='Course update denied'; end if;
  end if;
  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','course_update_if_needed','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  if jsonb_array_length(new_modules)>0 then
    -- Strict INSERT rather than conflict-rebinding: an absent UUID which belongs
    -- to another (even invisible) course must fail on RLS/unique, never be linked.
    insert into public.course_modules(id,course_id,label,position)
      select r.id,c.id,r.label,r.position from jsonb_populate_recordset(null::public.course_modules,new_modules) r;
    get diagnostics actual_count=row_count;
    if actual_count<>jsonb_array_length(new_modules) then raise insufficient_privilege using message='Module insert denied'; end if;
  end if;
  if jsonb_array_length(changed_modules)>0 then
    update public.course_modules m set label=r.label,position=r.position
      from jsonb_populate_recordset(null::public.course_modules,changed_modules) r where m.id=r.id and m.course_id=c.id;
    get diagnostics actual_count=row_count;
    if actual_count<>jsonb_array_length(changed_modules) then raise insufficient_privilege using message='Module update denied'; end if;
  end if;
  if jsonb_array_length(changed_lessons)>0 then
    with written as (
      update public.lessons target set module_id=d.module_id,title=d.title,position=d.position,lesson_number=d.lesson_number,
        youtube_url=d.youtube_url,timecodes=d.timecodes,chapter_variants=d.chapter_variants,description=d.description,
        content=d.content,kind=d.kind,test_tasks=d.test_tasks,materials=d.materials,
        scheduled_date=d.scheduled_date,scheduled_time=d.scheduled_time,scheduled_duration=d.scheduled_duration,
        rec_date=d.rec_date,rec_time=d.rec_time,rec_duration=d.rec_duration,lesson_sched_manual=d.lesson_sched_manual,
        delivery_mode=d.delivery_mode,homework=d.homework
      from jsonb_populate_recordset(null::public.lessons,changed_lessons) d where target.course_id=c.id and target.short_id=d.short_id
      returning target.id,target.short_id,target.title,target.position,target.lesson_number,target.updated_at,target.module_id
    ) select count(*),coalesce(jsonb_object_agg(id::text,to_jsonb(written)),'{}') into actual_count,written_rows from written;
    if actual_count<>jsonb_array_length(changed_lessons) then raise insufficient_privilege using message='Lesson update denied'; end if;
    final_rows:=final_rows||written_rows;
  end if;
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
    -- Only legacy NULL-ref rows can remain under a removed module: every payload
    -- lesson was moved first. ON DELETE SET NULL fires the existing now() stamp.
    for incoming in select value from jsonb_each(final_rows) where (value->>'module_id')::uuid=any(delete_module_ids) loop
      final_rows:=jsonb_set(final_rows,array[incoming->>'id'],incoming||jsonb_build_object('module_id',null,'updated_at',now()));
    end loop;
  end if;

  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','module_and_lesson_mutations_if_needed','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  if c.student_ids='{}'::uuid[] and c.group_ids='{}'::uuid[]
    and p_changes-array['students','groups','modes']='{}'::jsonb
    and coalesce(p_changes->'students','{}')='{}'::jsonb
    and coalesce(p_changes->'groups','{}')='{}'::jsonb
    and coalesce(p_changes->'modes','{}')='{}'::jsonb then
    -- The locked course and authoritative empty enrollment read are both
    -- required. Existing/nonempty audiences always use the unchanged merge RPC.
    select exists(select 1 from public.course_enrollments where course_id=c.id) into have_enrollments;
    access_noop:=not have_enrollments;
  end if;
  if access_noop then
    access_result:=jsonb_build_object('student_ids',c.student_ids,'group_ids',c.group_ids,'updated_at',c.updated_at,'access_modes','{}'::jsonb);
  else
    access_result:=public.save_course_access_changes(c.id,p_changes);
    c.updated_at:=(access_result->>'updated_at')::timestamptz;
  end if;
  qa_steps:=qa_steps||jsonb_build_array(jsonb_build_object('stage','access_if_needed','ms',round(extract(epoch from(clock_timestamp()-qa_mark))*1000,3)));qa_mark:=clock_timestamp();
  select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into current_stamp from jsonb_each(final_rows);
  return jsonb_build_object('course_id',c.id,'stamp',current_stamp,'access',access_result,
    'lessons',coalesce((select jsonb_agg(jsonb_build_object('id',value->>'id','lesson_number',(value->>'lesson_number')::integer,
      'title',value->>'title') order by (value->>'position')::integer) from jsonb_each(final_rows)),'[]')) || jsonb_build_object('_qa_profile',jsonb_build_object('steps',qa_steps,'function_ms',round(extract(epoch from(clock_timestamp()-qa_start))*1000,3)));
end;
$$;
revoke all on function public.save_course_content_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_course_content_probe_20261122(text,timestamptz,jsonb,jsonb,jsonb,jsonb) to authenticated;
