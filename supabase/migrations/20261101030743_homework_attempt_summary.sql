begin;
-- Aggregate over the complete history, independently of the API page limit.
create view public.homework_attempt_totals with (security_invoker=true) as
select student_id,lesson_ref,max(score) filter(where status='completed') as best_score,
 count(*) as attempt_count from public.homework_attempts group by student_id,lesson_ref;
revoke all on public.homework_attempt_totals from anon;
grant select on public.homework_attempt_totals to authenticated;
create index lesson_progress_testly_attempt_key on public.lesson_progress ((attachments->>'testlyKey'))
where attachments->>'testlyKey' is not null;
create or replace function public.start_homework_retake(p_student uuid,p_ref text,p_expected uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare p public.lesson_progress; a jsonb; next_id uuid := gen_random_uuid();
begin
 select * into p from public.lesson_progress where student_id=p_student and lesson_ref=p_ref for update;
 if not found then raise exception 'Submission not found'; end if;
 if not exists(select 1 from public.students where id=p_student and auth_user_id=auth.uid()) then
   raise exception 'Only the student can start a new attempt'; end if;
 if p.attachments->>'draft'='true' then return p.attachments; end if;
 if p.attachments->>'attemptId' is distinct from p_expected::text then raise exception 'Attempt changed; refresh'; end if;
 a := jsonb_build_object('v','basic-1','attemptId',next_id,'draft',true,'testlyKey','iskra:'||next_id::text,
   'reviewRequired',coalesce(p.attachments->'reviewRequired','false'::jsonb),
   'recommendationScore',coalesce((p.attachments->>'recommendationScore')::integer,80),'rows',(select coalesce(jsonb_agg((r-'answer'-'heard'-'attempts'-'voice'-'testly') || jsonb_build_object('answer','','verdict','empty') || case when r->>'type'='testly' then jsonb_build_object('testly',jsonb_build_object('testId',r->'testly'->>'testId')) else '{}'::jsonb end),'[]'::jsonb) from jsonb_array_elements(p.attachments->'rows') r),
   'gradable',coalesce((p.attachments->>'gradable')::integer,0),'correct',0);
 update public.lesson_progress set status='current',score=null,attachments=a,review_comment=null,review_attachments=null
 where id=p.id;
 return a;
end;
$$;
commit;
