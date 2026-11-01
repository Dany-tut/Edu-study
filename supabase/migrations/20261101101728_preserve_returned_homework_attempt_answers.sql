-- Preserve submitted work while the live Testly status is reopened.
begin;
create or replace function private.record_homework_attempt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare attempt uuid; n integer;
begin
 if new.attachments->>'v' is distinct from 'basic-1' or new.attachments->>'draft'='true'
   or new.status not in ('submitted','completed','returned') then return new; end if;
 attempt := (new.attachments->>'attemptId')::uuid;
 select coalesce(max(number),0)+1 into n from public.homework_attempts where progress_id=new.id;
 insert into public.homework_attempts(id,progress_id,student_id,lesson_ref,number,status,score,passing_score,answers,review_comment,reviewed_at)
 values(attempt,new.id,new.student_id,new.lesson_ref,n,case when new.status='returned' then 'returned' when new.score is not null and (not private.homework_pending(new.attachments) or new.attachments->>'reviewedAt' is not null) then 'completed' else 'submitted' end,
   case when private.homework_pending(new.attachments) and new.attachments->>'reviewedAt' is null then null else new.score end,
   coalesce((new.attachments->>'recommendationScore')::integer,80),new.attachments,new.review_comment,
   (new.attachments->>'reviewedAt')::timestamptz)
 on conflict(id) do update set status=excluded.status,
   -- Reopening Testly clears its live answer marker. Keep the submitted snapshot
   -- and grade in history while still recording the return and teacher comment.
   score=case when excluded.status='returned' then homework_attempts.score else excluded.score end,
   answers=case when excluded.status='returned' then homework_attempts.answers else excluded.answers end,
   review_comment=excluded.review_comment,
   reviewed_at=case when excluded.status='returned' then homework_attempts.reviewed_at else excluded.reviewed_at end;
 return new;
end;
$$;
commit;
