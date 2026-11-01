-- Extends checkHomeworkAttempts' disposable fixture, never real student work.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
insert into public.lesson_progress(student_id,lesson_ref,status,score,attachments)
values('11111111-1111-4111-8111-111111111111','pending-self','submitted',null,
 '{"v":"basic-1","reviewRequired":true,"rows":[{"type":"extended","verdict":"review"}]}');
set role authenticated;
do $$ declare a uuid; saved jsonb; n integer; begin
 select (attachments->>'attemptId')::uuid into a from public.lesson_progress where lesson_ref='mixed';
 select count(*) into n from public.homework_attempts where lesson_ref='mixed';
 saved := public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','mixed',a,0);
 if saved->>'value'<>'0' or saved->>'assessedAt' is null then raise exception 'Explicit zero lost'; end if;
 if (select score<>91 or status<>'completed' from public.lesson_progress where lesson_ref='mixed') then raise exception 'Self-assessment changed grade'; end if;
 if (select count(*)<>n from public.homework_attempts where lesson_ref='mixed') then raise exception 'Self-assessment created attempt'; end if;
 if not exists(select 1 from public.homework_attempts where id=a and answers->'selfAssessment'->>'value'='0') then raise exception 'Self-assessment missing from history'; end if;
 perform public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','mixed',a,4);
 update public.lesson_progress set attachments=jsonb_set(attachments,'{selfAssessment}',saved) where lesson_ref='mixed';
 if (select attachments->'selfAssessment'->>'value'<>'4' from public.lesson_progress where lesson_ref='mixed') then raise exception 'Delayed duplicate overwrote self-assessment'; end if;
 -- Even a malicious combined patch may change only the learner metadata.
 update public.lesson_progress set score=100,status='returned',attachments=attachments ||
   '{"selfAssessment":{"value":4,"assessedAt":"1900-01-01"},"recommendationScore":0}'::jsonb where lesson_ref='mixed';
 if (select score<>91 or status<>'completed' or attachments->>'recommendationScore'='0'
   or (attachments->'selfAssessment'->>'assessedAt')::timestamptz < now()-interval '1 minute'
   from public.lesson_progress where lesson_ref='mixed') then raise exception 'Metadata patch changed grading or forged time'; end if;
 begin
   perform public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','mixed',a,5);
   raise exception 'Invalid value accepted';
 exception when others then if sqlerrm='Invalid value accepted' then raise; end if; end;
 begin
   perform public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','mixed',gen_random_uuid(),2);
   raise exception 'Stale attempt accepted';
 exception when others then if sqlerrm='Stale attempt accepted' then raise; end if; end;
 select (attachments->>'attemptId')::uuid into a from public.lesson_progress where lesson_ref='pending-self';
 perform public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','pending-self',a,3);
 if (select score is not null or status<>'submitted' from public.lesson_progress where lesson_ref='pending-self') then raise exception 'Pending work graded by self-assessment'; end if;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$ begin
 begin
   perform public.save_lesson_self_assessment('11111111-1111-4111-8111-111111111111','mixed',gen_random_uuid(),4);
   raise exception 'Another learner assessed work';
 exception when others then if sqlerrm='Another learner assessed work' then raise; end if; end;
end $$;
reset role;
select 'PASS: self-assessment, pending work, frozen grades, server timestamp, history, stale attempts, ownership';
