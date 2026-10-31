-- Run after the migration. All synthetic data and marks are rolled back.
begin;
create temp table attendance_verify as
 select g.id gid,g.created_by owner,s.id sid,gen_random_uuid() first_event,gen_random_uuid() second_event,
 '__attendance_verify_'||gen_random_uuid()::text title
 from public.groups g join public.students s on s.group_id=g.id and s.created_by=g.created_by
 order by g.created_at limit 1;
grant select on attendance_verify to authenticated;
insert into public.schedule_lessons(id,group_id,date,time_start,time_end,subject,lesson_title)
 select first_event,gid,date '2099-01-21','10:00','11:00','Химия',title from attendance_verify
 union all select second_event,gid,date '2099-01-21','11:00','12:00','Химия',title from attendance_verify;
select set_config('request.jwt.claim.sub',(select owner::text from attendance_verify),true);
set local role authenticated;
do $test$
declare f record; actual boolean; caught boolean;
begin
 select * into strict f from attendance_verify;
 select present into actual from public.student_schedule_attendance(f.sid,array[f.first_event]);
 if actual is not null then raise exception 'unmarked lesson is not neutral'; end if;
 perform public.teacher_lesson_save(f.first_event,'save','Private teacher note',jsonb_build_object(f.sid,true));
 perform public.teacher_lesson_save(f.second_event,'save',null,jsonb_build_object(f.sid,false));
 select present into actual from public.student_schedule_attendance(f.sid,array[f.first_event]);
 if actual is distinct from true then raise exception 'first event attendance lost'; end if;
 select present into actual from public.student_schedule_attendance(f.sid,array[f.second_event]);
 if actual is distinct from false then raise exception 'second event absence lost'; end if;
 -- Completing the event does not prevent later corrections to attendance.
 perform public.teacher_lesson_save(f.second_event,'start');
 perform public.teacher_lesson_save(f.second_event,'complete');
 perform public.teacher_lesson_save(f.second_event,'save',null,jsonb_build_object(f.sid,true));
 select present into actual from public.student_schedule_attendance(f.sid,array[f.second_event]);
 if actual is distinct from true then raise exception 'late attendance update failed'; end if;
 perform public.teacher_lesson_save(f.second_event,'save',null,jsonb_build_object(f.sid,null));
 select present into actual from public.student_schedule_attendance(f.sid,array[f.second_event]);
 if actual is not null then raise exception 'cleared attendance is not neutral'; end if;
 -- Journal and mobile attendance share one event record, with atomic grades.
 perform public.teacher_journal_save(f.first_event,jsonb_build_array(jsonb_build_object('studentId',f.sid,'present',true,'grade',5)));
 if (select grade from public.lesson_attendance where student_id=f.sid and lesson_date=date '2099-01-21') is distinct from 5 then raise exception 'journal grade was not saved'; end if;
 perform public.teacher_journal_save(f.first_event,jsonb_build_array(jsonb_build_object('studentId',f.sid,'present',false,'grade',null)));
 select present into actual from public.student_schedule_attendance(f.sid,array[f.first_event]);
 if actual is distinct from false then raise exception 'journal did not update event absence'; end if;
 if (select grade from public.lesson_attendance where student_id=f.sid and lesson_date=date '2099-01-21') is not null then raise exception 'absent student retained grade'; end if;
 perform public.teacher_journal_save(f.first_event,jsonb_build_array(jsonb_build_object('studentId',f.sid,'present',null,'grade',null)));
 select present into actual from public.student_schedule_attendance(f.sid,array[f.first_event]);
 if actual is not null then raise exception 'unmarked journal entry became absent'; end if;
 caught:=false;
 begin perform public.teacher_journal_save(f.first_event,jsonb_build_array(jsonb_build_object('studentId',gen_random_uuid(),'present',false))); exception when others then caught:=true; end;
 if not caught then raise exception 'unrelated pupil attendance accepted'; end if;
 if exists(select 1 from jsonb_object_keys((select to_jsonb(a) from public.student_schedule_attendance(f.sid,array[f.first_event]) a)) k where k not in ('schedule_id','present')) then raise exception 'private session data leaked'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 caught:=false;
 begin perform public.student_schedule_attendance(f.sid,array[f.first_event]); exception when others then caught:=true; end;
 if not caught then raise exception 'foreign account read allowed'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 caught:=false;
 begin perform public.student_schedule_attendance(f.sid,array[f.first_event]); exception when others then caught:=true; end;
 if not caught then raise exception 'unauthenticated read allowed'; end if;
end $test$;
reset role;
rollback;
