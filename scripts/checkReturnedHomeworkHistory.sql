-- Real triggers and retake RPC, in the disposable PostgreSQL fixture only.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
insert into public.lesson_progress(student_id,lesson_ref,status,score,attachments)
values('11111111-1111-4111-8111-111111111111','testly-return','completed',0,
  '{"v":"basic-1","rows":[{"type":"testly","answer":"submitted","verdict":"wrong","testly":{"testId":"test","got":0,"max":36,"submittedAt":"2026-10-31T10:00:00Z"}}]}');
do $$
declare original jsonb; first_id uuid; draft jsonb;
begin
  select answers,id into original,first_id from public.homework_attempts where lesson_ref='testly-return';
  update public.lesson_progress set status='returned',review_comment='Check question 1'
    where lesson_ref='testly-return';
  -- A delayed Testly poll arrives after the teacher's comment.
  perform set_config('request.jwt.claim.sub','',false);
  update public.lesson_progress set attachments=jsonb_set(attachments,'{rows}',
    '[{"type":"testly","answer":"","verdict":"review","testly":{"testId":"test","got":0,"max":36,"returned":true}}]')
    where lesson_ref='testly-return';
  update public.lesson_progress set updated_at=now() where lesson_ref='testly-return';
  if not exists(select from public.homework_attempts where id=first_id and score=0
    and status='returned' and answers=original and review_comment='Check question 1') then
    raise exception 'Return/poll overwrote the submitted snapshot or comment';
  end if;
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  draft := public.start_homework_retake('11111111-1111-4111-8111-111111111111','testly-return',first_id);
  update public.lesson_progress set status='submitted',score=3,attachments=(draft-'draft') ||
    '{"rows":[{"type":"testly","answer":"submitted","verdict":"wrong","testly":{"testId":"test","got":1,"max":36,"submittedAt":"2026-11-01T10:00:00Z"}}]}'
    where lesson_ref='testly-return';
  if not exists(select from public.homework_attempts where id=first_id and score=0
    and answers=original and review_comment='Check question 1') then raise exception 'Retake changed the first attempt'; end if;
  if not exists(select from public.homework_attempts where lesson_ref='testly-return'
    and number=2 and score=3 and review_comment is null) then raise exception 'New result missing'; end if;
end $$;
select 'PASS: Testly return, delayed status, preserved zero/answers/comment, independent resubmission';
