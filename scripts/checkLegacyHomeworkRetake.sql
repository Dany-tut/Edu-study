-- Runs only in the disposable PostgreSQL fixture. No real learner is used.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
insert into public.lesson_progress(student_id,lesson_ref,status,score,attachments,comment,review_comment,review_attachments,updated_at)
values ('11111111-1111-4111-8111-111111111111','old','completed',45,
  '{"recommendationScore":70,"files":["original"]}', 'Old answer', 'Check task 2', '{"photos":["feedback"]}', '2025-10-01T09:00:00Z');
insert into public.lesson_progress(student_id,lesson_ref,status,score)
select '11111111-1111-4111-8111-111111111111', ref, state, grade
from (values ('zero','completed',0), ('pass','completed',80), ('pending','submitted',12),
  ('ungraded','completed',null), ('current','current',0), ('video-old','completed',10), ('old-hard','completed',3)) x(ref,state,grade);

set role authenticated;
do $$
declare
  student constant uuid := '11111111-1111-4111-8111-111111111111';
  a jsonb;
  next_draft jsonb;
  ref text;
begin
  foreach ref in array array['pass','pending','ungraded','current','video-old','old-hard'] loop
    begin
      perform public.start_homework_retake(student,ref,null);
      raise exception 'Unexpected retry for %',ref using errcode='XX000';
    exception when sqlstate 'P0001' then null;
    end;
    if exists (select from public.homework_attempts where lesson_ref=ref) then raise exception 'Ineligible work archived'; end if;
  end loop;

  a := public.start_legacy_homework_retake(student,'old');
  if a->>'draft' is distinct from 'true' or (a->>'recommendationScore')::integer is distinct from 70
     or a->'archivedAttempt'->>'score' is distinct from '45' then raise exception 'Bad legacy draft/grade'; end if;
  if a is distinct from public.start_legacy_homework_retake(student,'old') then raise exception 'Retry duplicated'; end if;
  if not exists (select from public.homework_attempts where lesson_ref='old' and number=1 and score=45
    and status='completed' and passing_score=70 and submitted_at='2025-10-01T09:00:00Z'
    and review_comment='Check task 2' and answers->>'comment'='Old answer'
    and answers->'legacyAttachments'->'files'='["original"]' and answers->'reviewAttachments'->'photos'='["feedback"]')
    then raise exception 'Original work not preserved'; end if;
  if (select attachments ? 'archivedAttempt' from public.lesson_progress where lesson_ref='old') then raise exception 'Old submission copied into draft'; end if;
  update public.lesson_progress set status='submitted', score=25, attachments=(attachments-'draft') ||
    '{"rows":[{"type":"single","verdict":"wrong"}]}' where lesson_ref='old';
  if not exists (select from public.homework_attempt_totals where lesson_ref='old' and attempt_count=2 and best_score=45)
    then raise exception 'Lower retry replaced the original grade'; end if;
  begin
    perform public.start_homework_retake(student,'old',null);
    raise exception 'Stale first click started another attempt' using errcode='XX000';
  exception when sqlstate 'P0001' then null; end;
  next_draft := public.start_homework_retake(student,'old',(a->>'attemptId')::uuid);
  update public.lesson_progress set status='submitted', score=70, attachments=(attachments-'draft') ||
    '{"rows":[{"type":"single","verdict":"correct"}]}' where lesson_ref='old';
  if not exists (select from public.homework_attempt_totals where lesson_ref='old' and attempt_count=3 and best_score=70)
    then raise exception 'Improved grade not credited'; end if;
  begin
    perform public.start_homework_retake(student,'old',(next_draft->>'attemptId')::uuid);
    raise exception 'Passing work restarted' using errcode='XX000';
  exception when sqlstate 'P0001' then null; end;

  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
  begin
    perform public.start_homework_retake(student,'zero',null);
    raise exception 'Foreign work restarted' using errcode='XX000';
  exception when sqlstate 'P0001' then null; end;
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  a := public.start_homework_retake(student,'zero',null);
  if a->'archivedAttempt'->>'score' is distinct from '0' or a->>'recommendationScore' is distinct from '80'
    then raise exception 'Lost legacy zero or default threshold'; end if;
end;
$$;
reset role;
