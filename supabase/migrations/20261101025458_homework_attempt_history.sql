-- Each submitted attempt survives retries; draft/view progress is independent.
begin;
create schema if not exists private;
create table public.homework_attempts (
  id uuid primary key,
  progress_id uuid not null references public.lesson_progress(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_ref text not null,
  number integer not null,
  status text not null check (status in ('submitted','completed','returned')),
  score integer check (score between 0 and 100),
  passing_score integer not null check (passing_score between 0 and 100),
  answers jsonb not null,
  review_comment text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(progress_id, number)
);
create index homework_attempts_student_ref on public.homework_attempts(student_id, lesson_ref);
alter table public.homework_attempts enable row level security;
revoke all on public.homework_attempts from anon, authenticated;
grant select on public.homework_attempts to authenticated;
create policy read_visible_homework_attempts on public.homework_attempts for select to authenticated
using (exists (select 1 from public.lesson_progress p where p.id = progress_id));

create or replace function private.homework_pending(a jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce((a->>'reviewRequired') = 'true',false) or exists (
   select 1 from jsonb_array_elements(case when jsonb_typeof(a->'rows')='array' then a->'rows' else '[]'::jsonb end) r
   where case when r->>'type'='testly' then coalesce((r->'testly'->>'pending')='true',false)
     else r->>'verdict' in ('review','skip') end
 );
$$;

create or replace function private.prepare_homework_attempt() returns trigger
language plpgsql security definer set search_path = '' as $$
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
$$;
-- Backfill only existing snapshots. Unknown legacy work remains unknown.
update public.lesson_progress set attachments=attachments || jsonb_build_object('attemptId',gen_random_uuid(),
  'reviewedAt',case when status='completed' and private.homework_pending(attachments) then updated_at else null end)
where attachments->>'v'='basic-1' and attachments->>'attemptId' is null
  and status in ('submitted','completed','returned');

create trigger prepare_homework_attempt before insert or update on public.lesson_progress
for each row execute function private.prepare_homework_attempt();

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
 on conflict(id) do update set status=excluded.status,score=excluded.score,answers=excluded.answers,
   review_comment=excluded.review_comment,reviewed_at=excluded.reviewed_at;
 return new;
end;
$$;
insert into public.homework_attempts(id,progress_id,student_id,lesson_ref,number,status,score,passing_score,answers,review_comment,submitted_at,reviewed_at)
select (attachments->>'attemptId')::uuid,id,student_id,lesson_ref,1,case when status='returned' then 'returned' when score is not null and (not private.homework_pending(attachments) or attachments->>'reviewedAt' is not null) then 'completed' else 'submitted' end,
 case when private.homework_pending(attachments) and attachments->>'reviewedAt' is null then null else score end,
 coalesce((attachments->>'recommendationScore')::integer,80),attachments,review_comment,updated_at,
 (attachments->>'reviewedAt')::timestamptz
from public.lesson_progress where attachments->>'v'='basic-1' and attachments->>'attemptId' is not null
 and status in ('submitted','completed','returned');
create trigger record_homework_attempt after insert or update on public.lesson_progress
for each row execute function private.record_homework_attempt();
revoke all on function private.prepare_homework_attempt() from public,anon,authenticated;
revoke all on function private.record_homework_attempt() from public,anon,authenticated;
revoke all on function private.homework_pending(jsonb) from public,anon,authenticated;

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
   'recommendationScore',coalesce((p.attachments->>'recommendationScore')::integer,80),'rows','[]'::jsonb,'gradable',0,'correct',0);
 update public.lesson_progress set status='current',score=null,attachments=a,review_comment=null,review_attachments=null
 where id=p.id;
 return a;
end;
$$;
revoke all on function public.start_homework_retake(uuid,text,uuid) from public,anon;
grant execute on function public.start_homework_retake(uuid,text,uuid) to authenticated;
commit;
