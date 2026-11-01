-- Self-assessment belongs to the submission and is retained in attempt history.
begin;
CREATE OR REPLACE FUNCTION private.prepare_homework_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a jsonb := new.attachments; prev jsonb; learner boolean; reviewer boolean; threshold integer;
begin
 if a->>'v' is distinct from 'basic-1' then return new; end if;
 if tg_op='UPDATE' then prev := old.attachments; end if;
 select s.auth_user_id=auth.uid(), s.created_by=auth.uid() or exists
   (select 1 from public.groups g where g.id=s.group_id and g.created_by=auth.uid())
 into learner,reviewer from public.students s where s.id=new.student_id;
 reviewer := coalesce(reviewer,false) or public.is_admin();
 if tg_op='UPDATE' and old.status='returned' and a->>'attemptId' is null and coalesce(learner,false) and not reviewer then
   a := a || jsonb_build_object('attemptId',gen_random_uuid());
   -- Legacy submissions can start a new attempt directly, with the same eligibility rule below.
 end if;
 a := a || jsonb_build_object('attemptId', coalesce(a->>'attemptId',prev->>'attemptId',gen_random_uuid()::text));
 -- Clients cannot forge teacher verification.
 if coalesce(learner,false) and not reviewer then
   a := a - 'reviewedAt';
   if prev->>'reviewedAt' is not null and a->>'attemptId'=prev->>'attemptId' then
     a := a || jsonb_build_object('reviewedAt',prev->>'reviewedAt');
   end if;
 end if;
 if tg_op='UPDATE' and prev->>'v'='basic-1' then
   if a->>'attemptId' is distinct from prev->>'attemptId' and prev->>'attemptId' is not null then
     threshold := coalesce((prev->>'recommendationScore')::integer,80);
     if (new.status<>'current' or a->>'draft'<>'true') and not (old.status='returned' and new.attachments->>'attemptId' is null) or
        not (old.status='returned' or (old.score is not null and old.score<threshold and
          (not private.homework_pending(prev) or prev->>'reviewedAt' is not null))) then
       raise exception 'Attempt cannot be restarted before final grading or after a pass';
     end if;
   elsif coalesce(learner,false) and not reviewer and prev->>'draft' is distinct from 'true'
      and old.status in ('submitted','completed','returned') then
     if a->'rows' is distinct from prev->'rows' or a->>'draft'='true' then
       raise exception 'Submitted answers are immutable; start a new attempt';
     end if;
     -- Self-assessment is learner metadata, never a new grade or answer edit.
     -- Rebuild from OLD so a simultaneous client patch cannot alter a verdict.
     if a->'selfAssessment' is distinct from prev->'selfAssessment'
        and a->'selfAssessment' is not null and a->'selfAssessment' <> 'null'::jsonb then
       if jsonb_typeof(a->'selfAssessment'->'value') <> 'number'
          or coalesce(a->'selfAssessment'->>'value','') !~ '^[0-4]$' then
         raise exception 'Invalid self-assessment';
       end if;
       -- An old duplicate submission cannot replace a later explicit choice.
       if prev->'selfAssessment'->>'assessedAt' is not null
          and (a->'selfAssessment'->>'assessedAt')::timestamptz <=
              (prev->'selfAssessment'->>'assessedAt')::timestamptz then return old; end if;
       new := old;
       new.attachments := jsonb_set(prev, '{selfAssessment}', jsonb_build_object(
         'value',(a->'selfAssessment'->>'value')::integer, 'assessedAt',clock_timestamp()));
       -- Testly sync uses updated_at for optimistic concurrency.
       new.updated_at := clock_timestamp();
       return new;
     end if;
     -- A delayed duplicate submit must not reset a teacher verdict or final score.
     return old;
   end if;
 end if;
 if a->>'draft'='true' then
   if new.status<>'current' then raise exception 'Draft cannot be graded'; end if;
   new.score := null;
 else
   if reviewer and new.status='completed' then a := a || jsonb_build_object('reviewedAt',now()); end if;
   if private.homework_pending(a) and a->>'reviewedAt' is null then
     new.score := null;
     if new.status<>'returned' then new.status := 'submitted'; end if;
   elsif new.score is not null and new.status<>'returned' then
     new.status := 'completed';
   end if;
 end if;
 new.attachments := a;
 return new;
end;
$function$
;

-- Use existing progress RLS; no SECURITY DEFINER or broader table access.
create or replace function public.save_lesson_self_assessment(
  p_student uuid, p_ref text, p_attempt uuid, p_value integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare p public.lesson_progress%rowtype; result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.students s where s.id=p_student and s.auth_user_id=auth.uid()
  ) then raise exception 'Only the learner can set self-assessment'; end if;
  if p_value is null or p_value < 0 or p_value > 4 then
    raise exception 'Invalid self-assessment';
  end if;
  select * into p from public.lesson_progress
    where student_id=p_student and lesson_ref=p_ref for update;
  if not found or p.attachments->>'v' is distinct from 'basic-1'
     or p.attachments->>'draft'='true'
     or p_attempt is null or p.attachments->>'attemptId' is distinct from p_attempt::text then
    raise exception 'Submission changed; refresh before assessing';
  end if;
  update public.lesson_progress set attachments=jsonb_set(attachments,'{selfAssessment}',
    jsonb_build_object('value',p_value,'assessedAt',clock_timestamp())), updated_at=clock_timestamp()
    where id=p.id returning attachments->'selfAssessment' into result;
  return result;
end;
$$;
revoke all on function public.save_lesson_self_assessment(uuid,text,uuid,integer) from public,anon;
grant execute on function public.save_lesson_self_assessment(uuid,text,uuid,integer) to authenticated;

commit;
