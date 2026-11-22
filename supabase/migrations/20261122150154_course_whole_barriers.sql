-- Whole-course witnessed chapter/publication barriers, preserving old clients.
set lock_timeout='2s';set statement_timeout='8s';
do $guard$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('save_course_chapters_whole','save_course_publication_whole')) then raise exception 'Whole barrier namespace changed';end if;
end $guard$;
create function public.save_course_chapters_whole(
 p_course_short_id text,p_baseline timestamptz,p_expected_modules jsonb,
 p_lesson_short_id text,p_chapter_payload jsonb
) returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='8s' as $$
declare
 c public.courses%rowtype; target public.lessons%rowtype;
 stamp timestamptz; old_stamp timestamptz; inventory jsonb; final_inventory jsonb;
 modules jsonb; modules_by_id jsonb; expected_modules jsonb; op jsonb; count_actual integer;
 requested_codes jsonb; requested_variants jsonb; expected_codes jsonb; expected_variants jsonb;
 source text; projected jsonb; row_codes jsonb; row_variants jsonb; did_write boolean:=false;
begin
 if auth.uid() is null then raise insufficient_privilege using message='Authentication required';end if;
 select * into c from public.courses where short_id=p_course_short_id and created_by=auth.uid() for update;
 if not found then raise insufficient_privilege using message='Course not found or not owned';end if;
 select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into inventory from(
  select id,short_id,module_id,updated_at from public.lessons where course_id=c.id order by id for update
 ) locked;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_array_elements(inventory);
 old_stamp:=stamp;
 if p_baseline is null or stamp is null then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';end if;
 if p_baseline is distinct from stamp then raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}');end if;
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

 -- Field whitelist owns exactly two lesson columns, no arbitrary row replacement.
 if p_lesson_short_id is null or p_lesson_short_id='' or jsonb_typeof(p_chapter_payload) is distinct from 'object'
  or not(p_chapter_payload ?& array['source','timecodes','chapter_variants','expected_timecodes','expected_chapter_variants'])
  or exists(select 1 from jsonb_object_keys(p_chapter_payload) k where k not in('source','timecodes','chapter_variants','expected_timecodes','expected_chapter_variants')) then
  raise invalid_parameter_value using message='Invalid chapter request';end if;
 source:=p_chapter_payload->>'source';requested_codes:=p_chapter_payload->'timecodes';requested_variants:=p_chapter_payload->'chapter_variants';
 expected_codes:=p_chapter_payload->'expected_timecodes';expected_variants:=p_chapter_payload->'expected_chapter_variants';
 if jsonb_typeof(p_chapter_payload->'source') is distinct from 'string' or source=''
  or jsonb_typeof(requested_codes) is distinct from 'array' or jsonb_typeof(expected_codes) is distinct from 'array'
  or jsonb_typeof(requested_variants) is distinct from 'object'
  or jsonb_typeof(expected_variants) not in('object','null')
  or jsonb_typeof(requested_variants->'source') is distinct from 'string'
  or requested_variants->>'source' is distinct from source
  or requested_variants->>'active' not in('text','slides') or requested_variants->>'active' is null
  or jsonb_typeof(requested_variants->'revision') is distinct from 'number'
  or (requested_variants->>'revision')::numeric<>trunc((requested_variants->>'revision')::numeric)
  or (requested_variants->>'revision')::numeric<0
  or jsonb_typeof(requested_variants->'text') is distinct from 'array'
  or (requested_variants ? 'slides' and jsonb_typeof(requested_variants->'slides') is distinct from 'array') then
  raise invalid_parameter_value using message='Invalid chapter payload shape';end if;
 -- Payload is constructed by the EXISTING chapterPayload/publishedChapters TS
 -- serializers. Verify its published projection rather than reconstruct variants.
 -- JS trim includes Unicode whitespace; SQL uses the equivalent explicit set.
 for op in select value from jsonb_array_elements(requested_variants->'text') union all
  select value from jsonb_array_elements(coalesce(requested_variants->'slides','[]')) loop
  if jsonb_typeof(op) is distinct from 'object' or not(op ?& array['time','label','seconds'])
   or jsonb_typeof(op->'time') is distinct from 'string' or jsonb_typeof(op->'label') is distinct from 'string'
   or jsonb_typeof(op->'seconds') is distinct from 'number'
   or (op->>'seconds')::numeric<0 then raise invalid_parameter_value using message='Invalid chapter item';end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('time',value->>'time','label',btrim(value->>'label',
  chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)),
  'seconds',value->'seconds') order by ordinal),'[]') into projected from jsonb_array_elements(coalesce(requested_variants->(requested_variants->>'active'),'[]')) with ordinality as e(value,ordinal);
 if projected is distinct from requested_codes then raise invalid_parameter_value using message='Chapter published projection differs from serializer';end if;
 select * into target from public.lessons where course_id=c.id and short_id=p_lesson_short_id;
 if not found then raise insufficient_privilege using message='Lesson not in owned course';end if;
 if btrim(coalesce(target.youtube_url,''),chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)) is distinct from source then
  raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Recording source changed';end if;
 -- Match old TS helper's idempotent check BEFORE expected chapter comparison,
 -- but only AFTER authoritative whole CAS: never promote unknown foreign content.
 if to_jsonb(target)->'timecodes' is distinct from requested_codes or to_jsonb(target)->'chapter_variants' is distinct from requested_variants then
  if coalesce(nullif(to_jsonb(target)->'timecodes','null'::jsonb),'[]') is distinct from expected_codes
   or to_jsonb(target)->'chapter_variants' is distinct from expected_variants then
   raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}'),detail='Expected chapters changed';end if;
  update public.lessons set timecodes=requested_codes,chapter_variants=requested_variants
   where id=target.id and course_id=c.id and updated_at=target.updated_at returning * into target;
  if not found then raise insufficient_privilege using message='Chapter write not confirmed';end if;
  did_write:=true;
 end if;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}') into final_inventory from jsonb_array_elements(inventory);
 final_inventory:=final_inventory||jsonb_build_object(target.id::text,jsonb_build_object('id',target.id,'short_id',target.short_id,'module_id',target.module_id,'updated_at',target.updated_at));
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_each(final_inventory);
 if did_write and stamp<=old_stamp then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: chapter revision did not advance';end if;
 return jsonb_build_object('course_id',c.id,'stamp',stamp,'full_snapshot_confirmed',true,'module_witness',modules,
  'lesson_witness',coalesce((select jsonb_agg(value order by (value->>'id')::uuid) from jsonb_each(final_inventory)),'[]'),
  'applied_chapters',jsonb_build_object('id',target.id,'short_id',target.short_id,'updated_at',target.updated_at,
   'youtube_url',target.youtube_url,'timecodes',target.timecodes,'chapter_variants',target.chapter_variants));
end;
$$;
revoke all on function public.save_course_chapters_whole(text,timestamptz,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_course_chapters_whole(text,timestamptz,jsonb,text,jsonb) to authenticated;

create function public.save_course_publication_whole(
 p_short_id text,p_baseline timestamptz,p_expected_modules jsonb,p_expected_status text,p_status text
) returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='8s' as $$
declare c public.courses%rowtype;stamp timestamptz;before_stamp timestamptz;inventory jsonb;
 modules jsonb;modules_by_id jsonb;expected_modules jsonb;op jsonb;count_actual integer;
begin
 if auth.uid() is null then raise insufficient_privilege using message='Authentication required';end if;
 if p_expected_status is null or p_status is null or p_expected_status not in('draft','published') or p_status not in('draft','published') then
  raise invalid_parameter_value using message='Publication statuses must be draft or published';end if;
 select * into c from public.courses where short_id=p_short_id and created_by=auth.uid() for update;
 if not found then raise insufficient_privilege using message='Course not found or not owned';end if;
 select coalesce(jsonb_agg(to_jsonb(locked)),'[]') into inventory from(
  select id,short_id,module_id,updated_at from public.lessons where course_id=c.id order by id for update
 ) locked;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_array_elements(inventory);
 if p_baseline is null or stamp is null then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: missing verified course version';end if;
 if p_baseline is distinct from stamp or c.status is distinct from p_expected_status then
  raise exception using errcode='PT409',message='ISKRA_COURSE_CONFLICT:'||(to_jsonb(stamp)#>>'{}');end if;
 before_stamp:=stamp;
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

 if c.status is distinct from p_status then
  update public.courses set status=p_status where id=c.id returning * into c;
  if not found then raise insufficient_privilege using message='Publication write not confirmed';end if;
  if c.updated_at<=before_stamp then raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: publication revision did not advance';end if;
 end if;
 select greatest(c.updated_at,max((value->>'updated_at')::timestamptz)) into stamp from jsonb_array_elements(inventory);
 return jsonb_build_object('course_id',c.id,'stamp',stamp,'course_updated_at',c.updated_at,'full_snapshot_confirmed',true,
  'lesson_witness',inventory,'module_witness',modules,'applied_course_patch',jsonb_build_object('status',c.status));
end;
$$;
revoke all on function public.save_course_publication_whole(text,timestamptz,jsonb,text,text) from public,anon;
grant execute on function public.save_course_publication_whole(text,timestamptz,jsonb,text,text) to authenticated;
