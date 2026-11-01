-- Isolated PostgreSQL fixture only. No real journal marks are modified.
insert into students values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444');
insert into groups values ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');
insert into courses values ('55555555-5555-4555-8555-555555555555','Химия','{}','{44444444-4444-4444-8444-444444444444}');
insert into lessons(id,course_id,short_id,title,kind,lesson_number,scheduled_date,scheduled_time,lesson_sched_manual,delivery_mode)
select gen_random_uuid(),'55555555-5555-4555-8555-555555555555',ref,ref,'lesson',n,'01.01.2020','10:00',false,mode
from (values ('live',1,'live'),('recorded',2,'recording'),('absent',3,'live'),('split',4,'live'),('legacy',5,'live'),('cancelled',6,'live')) x(ref,n,mode);
update lessons set lesson_sched_manual=true,rec_date='02.01.2020',rec_time='10:00' where short_id='split';
insert into schedule_lessons(id,lesson_id,group_id,date,time_start,subject,lesson_title,lesson_number,node_type,status)
select gen_random_uuid(),case when short_id='legacy' then null else id end,'44444444-4444-4444-8444-444444444444',date '2020-01-01','10:00','Химия',title,lesson_number,'lesson',case when short_id='cancelled' then 'cancelled' else 'completed' end from lessons;
insert into schedule_lessons(id,lesson_id,group_id,date,time_start,subject,lesson_title,lesson_number,node_type,status)
select gen_random_uuid(),id,'44444444-4444-4444-8444-444444444444',date '2020-01-02','10:00','Химия',title,lesson_number,'rec','completed' from lessons where short_id='split';
insert into teacher_lesson_sessions(schedule_id,attendance)
select id,jsonb_build_object('11111111-1111-4111-8111-111111111111',lesson_title<>'absent' and node_type<>'rec') from schedule_lessons;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
set role authenticated;
do $$ declare marks jsonb; begin
  select jsonb_object_agg(lesson_ref,attended) into marks from public.student_lesson_participation('11111111-1111-4111-8111-111111111111',array['live','recorded','absent','split','legacy','cancelled']);
  if marks is distinct from '{"live":true,"recorded":false,"absent":false,"split":true,"split~rec":false,"legacy":true,"cancelled":false}'::jsonb then raise exception 'Incorrect lesson credit: %',marks; end if;
end $$;
reset role;
-- A correction must revoke attendance credit; no synthetic video progress exists.
update teacher_lesson_sessions set attendance='{"11111111-1111-4111-8111-111111111111":null}' where schedule_id in(select id from schedule_lessons where lesson_title='live');
-- Ambiguous legacy titles must not grant credit to either course (even with a one-ref request).
insert into lessons select gen_random_uuid(),course_id,'legacy-copy',title,kind,lesson_number,scheduled_date,scheduled_time,rec_date,rec_time,lesson_sched_manual,delivery_mode from lessons where short_id='legacy';
set role authenticated;
do $$ begin
  if exists(select 1 from public.student_lesson_participation('11111111-1111-4111-8111-111111111111',array['live','legacy']) where attended) then raise exception 'Cleared or ambiguous presence counted'; end if;
  perform set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
  begin
    perform public.student_lesson_participation('11111111-1111-4111-8111-111111111111',array['live']);
    raise exception 'Foreign student read allowed';
  exception when others then if sqlerrm='Foreign student read allowed' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','',false);
  begin
    perform public.student_lesson_participation('11111111-1111-4111-8111-111111111111',array['live']);
    raise exception 'Unauthenticated read allowed';
  exception when others then if sqlerrm='Unauthenticated read allowed' then raise; end if; end;
end $$;
reset role;
