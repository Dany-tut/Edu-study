-- Existing-course content saves used six or more sequential HTTP requests.
-- One invoker transaction verifies provenance before any content mutation.
-- Existing clients keep their old endpoints; no policy or protection is relaxed.
create function public.save_course_content(
  p_short_id text, p_baseline timestamptz, p_course jsonb,
  p_modules jsonb, p_lessons jsonb, p_changes jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  c public.courses%rowtype;
  current_stamp timestamptz;
  access_result jsonb;
  module_ids uuid[];
  lesson_refs text[];
  row_input jsonb;
  l public.lessons%rowtype;
  previous_l public.lessons%rowtype;
  actual_count integer;
begin
  if auth.uid() is null then raise insufficient_privilege using message='forbidden'; end if;
  select * into c from public.courses
    where short_id=p_short_id and created_by=auth.uid() for update;
  if not found then raise insufficient_privilege using message='Course not found or not owned'; end if;
  -- Also serialize against direct lesson/chapter writes, not only this RPC.
  perform 1 from public.lessons where course_id=c.id order by id for update;
  select greatest(c.updated_at,max(updated_at)) into current_stamp from public.lessons where course_id=c.id;
  if current_stamp is null or p_baseline is null then
    raise exception using errcode='23514', message='ISKRA_DATA_PRESERVATION: missing verified course version';
  end if;
  if current_stamp is distinct from p_baseline then
    raise exception using errcode='40001', message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(current_stamp)#>>'{}');
  end if;
  if jsonb_typeof(p_course) is distinct from 'object'
    or jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules)=0
    or jsonb_typeof(p_lessons) is distinct from 'array'
    or jsonb_typeof(p_changes) is distinct from 'object'
    or not(p_course ?& array['title','subject','level','description','status','color','bg'])
    or p_course->>'status' not in ('draft','published') or p_course->>'status' is null
  then raise invalid_parameter_value using message='Invalid course content snapshot'; end if;
  -- Payload can never supply ownership, audience arrays, or a row identifier.
  if exists(select 1 from jsonb_object_keys(p_course) k where k not in
      ('title','subject','level','description','status','color','bg','seed_stamp','number_start')) then
    raise invalid_parameter_value using message='Invalid course fields';
  end if;
  select array_agg(r.id),count(distinct r.id) into module_ids,actual_count
    from jsonb_populate_recordset(null::public.course_modules,p_modules) r;
  if actual_count<>jsonb_array_length(p_modules) or array_position(module_ids,null) is not null
    or exists(select 1 from jsonb_populate_recordset(null::public.course_modules,p_modules) r where r.label is null or r.position is null)
    or exists(select 1 from public.course_modules m where m.id=any(module_ids) and m.course_id<>c.id)
  then raise insufficient_privilege using message='Invalid course module identities'; end if;
  select array_agg(r.short_id),count(distinct r.short_id) into lesson_refs,actual_count
    from jsonb_populate_recordset(null::public.lessons,p_lessons) r;
  lesson_refs:=coalesce(lesson_refs,'{}');
  if actual_count<>jsonb_array_length(p_lessons)
    or exists(select 1 from jsonb_populate_recordset(null::public.lessons,p_lessons) r
      where r.short_id is null or r.short_id='' or r.module_id is null or not(r.module_id=any(module_ids)))
    or exists(select 1 from public.lessons old where old.short_id=any(lesson_refs) and old.course_id<>c.id)
  then raise insufficient_privilege using message='Invalid course lesson identities'; end if;

  -- All writes list fields explicitly. Never populate a database row wholesale
  -- from client JSON (generated columns, ownership, audience and IDs are server-owned).
  update public.courses set title=p_course->>'title',subject=p_course->>'subject',level=p_course->>'level',
    description=p_course->>'description',status=p_course->>'status',color=p_course->>'color',bg=p_course->>'bg',
    seed_stamp=case when p_course ? 'seed_stamp' then p_course->>'seed_stamp' else c.seed_stamp end,
    number_start=case when p_course ? 'number_start' then (p_course->>'number_start')::integer else c.number_start end
    where id=c.id;
  get diagnostics actual_count=row_count;
  if actual_count<>1 then raise insufficient_privilege using message='Course update denied'; end if;

  insert into public.course_modules(id,course_id,label,position)
    select r.id,c.id,r.label,r.position from jsonb_populate_recordset(null::public.course_modules,p_modules) r
    on conflict(id) do update set label=excluded.label,position=excluded.position
      where course_modules.course_id=c.id and (course_modules.label,course_modules.position) is distinct from (excluded.label,excluded.position);

  for row_input in select value from jsonb_array_elements(p_lessons) loop
    l:=jsonb_populate_record(null::public.lessons,row_input);
    select * into previous_l from public.lessons where short_id=l.short_id;
    if found then
      -- Optional chapter variants from legacy snapshots never erase saved variants.
      if not(row_input ? 'chapter_variants') then l.chapter_variants:=previous_l.chapter_variants; end if;
      update public.lessons set module_id=l.module_id,title=l.title,position=l.position,lesson_number=l.lesson_number,
        youtube_url=l.youtube_url,timecodes=l.timecodes,chapter_variants=l.chapter_variants,description=l.description,
        content=l.content,kind=l.kind,test_tasks=l.test_tasks,materials=l.materials,
        scheduled_date=l.scheduled_date,scheduled_time=l.scheduled_time,scheduled_duration=l.scheduled_duration,
        rec_date=l.rec_date,rec_time=l.rec_time,rec_duration=l.rec_duration,lesson_sched_manual=l.lesson_sched_manual,
        delivery_mode=l.delivery_mode,homework=l.homework
        where id=previous_l.id and course_id=c.id and
          (module_id,title,position,lesson_number,youtube_url,timecodes,chapter_variants,description,content,kind,test_tasks,materials,
           scheduled_date,scheduled_time,scheduled_duration,rec_date,rec_time,rec_duration,lesson_sched_manual,delivery_mode,homework)
          is distinct from
          (l.module_id,l.title,l.position,l.lesson_number,l.youtube_url,l.timecodes,l.chapter_variants,l.description,l.content,l.kind,l.test_tasks,l.materials,
           l.scheduled_date,l.scheduled_time,l.scheduled_duration,l.rec_date,l.rec_time,l.rec_duration,l.lesson_sched_manual,l.delivery_mode,l.homework);
    else
      insert into public.lessons(course_id,module_id,short_id,title,position,lesson_number,youtube_url,timecodes,chapter_variants,
        description,content,kind,test_tasks,materials,scheduled_date,scheduled_time,scheduled_duration,rec_date,rec_time,rec_duration,
        lesson_sched_manual,delivery_mode,homework)
      values(c.id,l.module_id,l.short_id,l.title,l.position,l.lesson_number,l.youtube_url,l.timecodes,l.chapter_variants,
        l.description,l.content,l.kind,l.test_tasks,l.materials,l.scheduled_date,l.scheduled_time,l.scheduled_duration,l.rec_date,l.rec_time,l.rec_duration,
        l.lesson_sched_manual,l.delivery_mode,l.homework);
    end if;
  end loop;
  -- Move lessons before module removal so ON DELETE SET NULL never loses the
  -- new association; existing progress keys and schedule lesson UUIDs survive.
  delete from public.course_modules where course_id=c.id and not(id=any(module_ids));
  delete from public.lessons where course_id=c.id and not(short_id=any(lesson_refs));
  access_result:=public.save_course_access_changes(c.id,p_changes);
  select greatest((access_result->>'updated_at')::timestamptz,max(updated_at)) into current_stamp
    from public.lessons where course_id=c.id;
  return jsonb_build_object('course_id',c.id,'stamp',current_stamp,'access',access_result,
    'lessons',coalesce((select jsonb_agg(jsonb_build_object('id',id,'lesson_number',lesson_number,'title',title) order by position)
      from public.lessons where course_id=c.id),'[]'::jsonb));
end;
$$;
revoke all on function public.save_course_content(text,timestamptz,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_course_content(text,timestamptz,jsonb,jsonb,jsonb,jsonb) to authenticated;
