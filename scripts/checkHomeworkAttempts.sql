-- Run against an isolated PostgreSQL fixture, never against student production data.
create or replace function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
insert into public.students values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',null);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
insert into public.lesson_progress(student_id,lesson_ref,status,score,attachments)
values('11111111-1111-4111-8111-111111111111','mixed','submitted',100,'{"v":"basic-1","reviewRequired":true,"rows":[{"type":"single","verdict":"correct"},{"type":"extended","verdict":"review"}]}');
do $$ begin
 if (select score is not null or status<>'submitted' from public.lesson_progress where lesson_ref='mixed') then raise exception 'Partial score exposed'; end if;
 if (select score is not null from public.homework_attempts where lesson_ref='mixed') then raise exception 'History leaked partial score'; end if;
 begin
 perform public.start_homework_retake('11111111-1111-4111-8111-111111111111','mixed',(select (attachments->>'attemptId')::uuid from public.lesson_progress where lesson_ref='mixed'));
 raise exception 'Pending retry allowed';
 exception when others then if sqlerrm='Pending retry allowed' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
update public.lesson_progress set status='completed',score=65,review_comment='Correct the explanation' where lesson_ref='mixed';
do $$ begin
 if (select score<>65 or status<>'completed' from public.homework_attempts where lesson_ref='mixed') then raise exception 'Final grade not recorded'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.start_homework_retake('11111111-1111-4111-8111-111111111111','mixed',(select (attachments->>'attemptId')::uuid from public.lesson_progress where lesson_ref='mixed'));
do $$ declare a jsonb; begin
 select attachments into a from public.lesson_progress where lesson_ref='mixed';
 if (select count(*)<>1 from public.homework_attempts where lesson_ref='mixed') then raise exception 'Starting erased/duplicated history'; end if;
 if a->>'draft'<>'true' or a->>'testlyKey' is null then raise exception 'Retry not isolated'; end if;
 perform public.start_homework_retake('11111111-1111-4111-8111-111111111111','mixed',null);
 if a is distinct from (select attachments from public.lesson_progress where lesson_ref='mixed') then raise exception 'Double click changed attempt'; end if;
 update public.lesson_progress set status='submitted',score=91,attachments=(a-'draft') || '{"reviewRequired":false,"rows":[{"type":"single","verdict":"correct"}]}'::jsonb where lesson_ref='mixed';
 if (select count(*)<>2 from public.homework_attempts where lesson_ref='mixed') then raise exception 'Retry was not recorded'; end if;
 if (select score<>65 or review_comment<>'Correct the explanation' from public.homework_attempts where number=1) then raise exception 'Previous work overwritten'; end if;
 begin
   update public.lesson_progress set attachments=attachments || '{"rows":[]}'::jsonb where lesson_ref='mixed';
   raise exception 'Submitted answers mutable';
 exception when others then if sqlerrm='Submitted answers mutable' then raise; end if; end;
 begin
   perform public.start_homework_retake('11111111-1111-4111-8111-111111111111','mixed',(select (attachments->>'attemptId')::uuid from public.lesson_progress where lesson_ref='mixed'));
   raise exception 'Passing work automatically restarted';
 exception when others then if sqlerrm='Passing work automatically restarted' then raise; end if; end;
end $$;
select 'PASS: mixed grading, history, idempotent retry, frozen answers, threshold';
alter table public.lesson_progress enable row level security;
create policy own_progress on public.lesson_progress for all to authenticated using (student_id in (select id from public.students where auth_user_id=auth.uid())) with check (student_id in (select id from public.students where auth_user_id=auth.uid()));
grant usage on schema public,auth to authenticated;
grant select,update on public.lesson_progress to authenticated;
grant select on public.students to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$begin if (select count(*) from public.homework_attempts)<>2 then raise exception 'Owner cannot see history'; end if; end$$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$begin if exists(select 1 from public.homework_attempts) then raise exception 'Other student can see history'; end if; end$$;
reset role;
select 'PASS: student history RLS isolation';
