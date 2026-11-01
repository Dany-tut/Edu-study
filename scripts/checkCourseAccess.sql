set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
-- A content save from an old client cannot silently drop four restored pupils.
do $$ begin
  begin
    update courses set title='stale content',student_ids=array['00000000-0000-0000-0000-000000000011'::uuid] where id='00000000-0000-0000-0000-000000000100';
    raise exception 'Stale snapshot unexpectedly accepted';
  exception when check_violation then null; end;
  if (select cardinality(student_ids) from courses where id='00000000-0000-0000-0000-000000000100') <> 5 then raise exception 'Lost audience'; end if;
end $$;
-- Current content saves omit audience fields. Empty access changes preserve all members/modes/order.
update courses set title='new content' where id='00000000-0000-0000-0000-000000000100';
select save_course_access_changes('00000000-0000-0000-0000-000000000100','{}');
do $$ begin
 if (select count(*) from course_enrollments where course_id='00000000-0000-0000-0000-000000000100') <> 5 then raise exception 'Enrollment lost'; end if;
 if (select access_mode from course_enrollments where student_id='00000000-0000-0000-0000-000000000012') <> 'full' then raise exception 'Mode reset'; end if;
 if (select position from course_enrollments where student_id='00000000-0000-0000-0000-000000000012') <> 7 then raise exception 'Order reset'; end if;
 begin
   delete from course_enrollments where student_id='00000000-0000-0000-0000-000000000012';
   raise exception 'Old enrollment delete accepted';
 exception when check_violation then null; end;
 begin
   update course_enrollments set access_mode='by_date' where student_id='00000000-0000-0000-0000-000000000012';
   raise exception 'Old mode overwrite accepted';
 exception when check_violation then null; end;
end $$;
-- Explicit removal affects only its named member; another concurrent assignment survives.
select save_course_access_changes('00000000-0000-0000-0000-000000000100','{"students":{"00000000-0000-0000-0000-000000000011":false},"modes":{"00000000-0000-0000-0000-000000000013":"custom"}}');
do $$ begin
 if exists(select 1 from course_enrollments where student_id='00000000-0000-0000-0000-000000000011') then raise exception 'Explicit removal ignored'; end if;
 if (select count(*) from course_enrollments) <> 4 then raise exception 'Unrelated access lost'; end if;
end $$;
-- Direct removal while a group still grants access must retain the existing mode.
select save_course_access_changes('00000000-0000-0000-0000-000000000100','{"groups":{"00000000-0000-0000-0000-000000000020":true},"students":{"00000000-0000-0000-0000-000000000012":false}}');
do $$ begin
 if (select access_mode from course_enrollments where student_id='00000000-0000-0000-0000-000000000012') <> 'full' then raise exception 'Group overlap lost'; end if;
end $$;
select save_course_access_changes('00000000-0000-0000-0000-000000000100','{"groups":{"00000000-0000-0000-0000-000000000020":false}}');
do $$ begin
 if exists(select 1 from course_enrollments where student_id='00000000-0000-0000-0000-000000000012') then raise exception 'Group revoke ignored'; end if;
 -- Foreign pupils cannot be assigned; the failed request must not partially revoke a real pupil.
 begin
  perform save_course_access_changes('00000000-0000-0000-0000-000000000100','{"students":{"00000000-0000-0000-0000-000000000099":true,"00000000-0000-0000-0000-000000000013":false}}');
  raise exception 'Foreign pupil assigned';
 exception when insufficient_privilege then null; end;
 if not exists(select 1 from course_enrollments where student_id='00000000-0000-0000-0000-000000000013') then raise exception 'Failed request changed access'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
 begin
  perform save_course_access_changes('00000000-0000-0000-0000-000000000100','{}');
  raise exception 'Foreign teacher access accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
