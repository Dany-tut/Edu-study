-- Regression checks for the My Day RPCs. Run with a privileged SQL connection
-- after applying 20261031070000_teacher_lesson_sessions.sql. Requires one populated
-- teacher group; all synthetic events/assignments and grade changes are rolled back.
-- No student notifications or production assignments are retained.
begin;
create temp table myday_verify as
 select g.id gid,g.created_by owner,s.id sid,gen_random_uuid() schedule,gen_random_uuid() other_schedule
 from public.groups g join public.students s on s.group_id=g.id and s.created_by=g.created_by
 order by g.created_at limit 1;
grant select on myday_verify to authenticated;
insert into public.schedule_lessons(id,group_id,date,time_start,time_end,subject,lesson_title)
 select schedule,gid,'2099-01-17','10:00','11:00','Химия','__myday_verification__' from myday_verify;
insert into public.schedule_lessons(id,group_id,date,time_start,time_end,subject,lesson_title)
 select other_schedule,gid,'2099-01-17','12:00','13:00','Химия','__myday_verification_second__' from myday_verify;
select set_config('request.jwt.claim.sub',(select owner::text from myday_verify),true);
set local role authenticated;
do $test$
declare f record; result jsonb; hwid uuid; c integer; before_count integer; caught boolean;
begin
 select * into strict f from myday_verify;
 select count(*) into before_count from public.homework;
 result := public.teacher_lesson_save(f.schedule,'start','private verification note');
 if (select status from public.schedule_lessons where id=f.schedule)<>'live' then raise exception 'start did not persist'; end if;
 if (select count(*) from public.homework)<>before_count then raise exception 'start published homework'; end if;
 perform public.teacher_lesson_save(f.schedule,'save',null,jsonb_build_object(f.sid::text,null));
 if exists(select 1 from lesson_attendance where student_id=f.sid and lesson_date='2099-01-17') then raise exception 'unknown became attendance'; end if;
 perform public.teacher_lesson_save(f.schedule,'save',null,jsonb_build_object(f.sid::text,true));
 update lesson_attendance set grade=77 where student_id=f.sid and lesson_date='2099-01-17';
 perform public.teacher_lesson_save(f.schedule,'save',null,jsonb_build_object(f.sid::text,true));
 if (select grade from lesson_attendance where student_id=f.sid and lesson_date='2099-01-17')<>77 then raise exception 'grade was erased'; end if;
 caught := false;
 begin perform public.teacher_lesson_save(f.schedule,'save',null,jsonb_build_object(f.sid::text,false)); exception when others then caught := true; end;
 if not caught then raise exception 'graded attendance changed silently'; end if;
 update lesson_attendance set grade=null,lesson_title='__another_event__' where student_id=f.sid and lesson_date='2099-01-17';
 result := public.teacher_lesson_save(f.schedule,'save',null,jsonb_build_object(f.sid::text,false));
 if result->>'journalSkipped'<>'1' then raise exception 'another event was not protected'; end if;
 if (select present from lesson_attendance where student_id=f.sid and lesson_date='2099-01-17') is not true then raise exception 'another event overwritten'; end if;
 if (select attendance->>f.sid::text from teacher_lesson_sessions where schedule_id=f.schedule)<>'false' then raise exception 'event attendance not stored'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if exists(select 1 from teacher_lesson_sessions where schedule_id=f.schedule) then raise exception 'private note leaked'; end if;
 caught := false;
 begin perform public.teacher_lesson_save(f.schedule,'save','foreign note'); exception when others then caught := true; end;
 if not caught then raise exception 'foreign owner write allowed'; end if;
 perform set_config('request.jwt.claim.sub',f.owner::text,true);
 perform public.teacher_lesson_save(f.schedule,'complete');
 if (select count(*) from public.homework)<>before_count then raise exception 'completion published homework'; end if;
 perform public.teacher_lesson_save(f.schedule,'save',null,null,'{"title":"__myday_verify_hw__","tasks":[{"id":"verify","question":"Verification question","type":"extended","isHard":true}]}');
 result := public.teacher_lesson_publish(f.schedule,'2099-01-19');
 hwid := (result->>'homeworkId')::uuid;
 result := public.teacher_lesson_publish(f.schedule,'2099-01-19');
 if result->>'alreadyPublished'<>'true' or (result->>'homeworkId')::uuid<>hwid then raise exception 'publish retry not idempotent'; end if;
 if (select count(*) from public.homework)<>before_count+1 then raise exception 'duplicate assignment'; end if;
 if (select hard_total from public.homework where id=hwid)<>1 then raise exception 'hard task lost'; end if;
 caught := false;
 begin perform public.teacher_lesson_publish(f.other_schedule,'2099-01-19'); exception when others then caught := true; end;
 if not caught then raise exception 'upcoming lesson published homework'; end if;
end $test$;
reset role;
rollback;
