begin;

-- Attempts are read-only to students. As with record_homework_attempt, the
-- trigger archives the database row, never a grade or answer from the caller.
create function private.archive_legacy_homework_on_retake() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  next_number integer;
  snapshot jsonb;
  threshold integer := case when jsonb_typeof(old.attachments->'recommendationScore') = 'number'
    then least(100, greatest(0, ceil((old.attachments->>'recommendationScore')::numeric)))::integer else 80 end;
begin
  if old.status <> 'completed' or old.score is null or old.score < 0
     or old.score >= threshold or (new.attachments->>'recommendationScore')::integer is distinct from threshold then
    raise exception 'A final grade below the threshold is required for a legacy retake';
  end if;
  select coalesce(max(number), 0) + 1 into next_number
    from public.homework_attempts where progress_id = old.id;
  snapshot := jsonb_build_object(
    'v', 'basic-1', 'legacy', true, 'legacyAttachments', old.attachments,
    'comment', old.comment, 'reviewAttachments', old.review_attachments,
    'rows', case when old.attachments->>'v' = 'basic-1' and jsonb_typeof(old.attachments->'rows') = 'array'
                 then old.attachments->'rows' else '[]'::jsonb end,
    'selfAssessment', old.attachments->'selfAssessment');
  insert into public.homework_attempts
    (id, progress_id, student_id, lesson_ref, number, status, score, passing_score,
     answers, review_comment, submitted_at)
  values (gen_random_uuid(), old.id, old.student_id, old.lesson_ref, next_number,
    'completed', old.score, threshold,
    snapshot, old.review_comment, coalesce(old.updated_at, now()));
  return null;
end;
$$;
revoke all on function private.archive_legacy_homework_on_retake() from public, anon, authenticated;
create trigger archive_legacy_homework_on_retake after update on public.lesson_progress
for each row when (old.attachments->>'attemptId' is null and old.status in ('submitted','completed','returned')
  and new.status = 'current' and new.attachments->>'v' = 'basic-1' and new.attachments->>'draft' = 'true')
execute function private.archive_legacy_homework_on_retake();

create or replace function public.start_homework_retake(p_student uuid, p_ref text, p_expected uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  p public.lesson_progress;
  threshold integer;
  next_id uuid;
  draft jsonb;
  questions jsonb;
  archived jsonb;
begin
  if not exists (select 1 from public.students where id = p_student and auth_user_id = auth.uid()) then
    raise exception 'Only the student can start a new attempt';
  end if;
  if p_ref ~ '^(video-|course-reset:|trainer-)' or p_ref like '%-hard' then
    raise exception 'Not basic homework';
  end if;
  select * into strict p from public.lesson_progress
    where student_id = p_student and lesson_ref = p_ref for update;
  if p.attachments->>'draft' = 'true' then
    draft := p.attachments;
  else
    if p.attachments->>'attemptId' is distinct from p_expected::text then
      raise exception 'Attempt changed; refresh';
    end if;
    threshold := case when jsonb_typeof(p.attachments->'recommendationScore') = 'number'
      then least(100, greatest(0, ceil((p.attachments->>'recommendationScore')::numeric)))::integer else 80 end;
    if p_expected is null and (p.status is distinct from 'completed' or p.score is null
       or p.score < 0 or p.score >= threshold) then
      raise exception 'A final grade below the threshold is required for a legacy retake';
    end if;
    if exists (select 1 from public.homework_attempts
      where progress_id = p.id and status = 'completed' and score >= threshold) then
      raise exception 'Homework already passed';
    end if;

    next_id := gen_random_uuid();
    -- Only versioned snapshots have a known task format. Clear all answers
    -- while retaining task ids needed by Testly to reconcile a new submission.
    select coalesce(jsonb_agg((r - 'answer' - 'heard' - 'attempts' - 'voice' - 'testly')
      || jsonb_build_object('answer', '', 'verdict', 'empty')
      || case when r->>'type' = 'testly' then jsonb_build_object('testly', jsonb_build_object('testId', r->'testly'->>'testId'))
              else '{}'::jsonb end order by n), '[]'::jsonb) into questions
    from jsonb_array_elements(case when p.attachments->>'v' = 'basic-1' and jsonb_typeof(p.attachments->'rows') = 'array'
      then p.attachments->'rows' else '[]'::jsonb end) with ordinality as q(r,n);
    draft := jsonb_build_object('v','basic-1', 'attemptId',next_id, 'draft',true, 'testlyKey','iskra:' || next_id::text,
      'reviewRequired',p.attachments->'reviewRequired' is not distinct from 'true'::jsonb,
      'recommendationScore',threshold, 'rows',questions, 'correct',0,
      'gradable',case when p.attachments->>'v' = 'basic-1' then coalesce((p.attachments->>'gradable')::integer,0) else 0 end);
    update public.lesson_progress set status = 'current', score = null, attachments = draft, updated_at = clock_timestamp(),
      review_comment = null, review_attachments = null where id = p.id returning attachments into strict draft;
  end if;

  -- The summary is response-only. A retried first click returns the same
  -- committed draft and history id; the new attempt never contains old answers.
  if p_expected is null then
    select jsonb_build_object('id',id, 'number',number, 'status',status, 'score',score,
      'passing_score',passing_score, 'submitted_at',submitted_at, 'review_comment',review_comment) into archived
    from public.homework_attempts where progress_id = p.id order by number desc limit 1;
    if archived is not null then return draft || jsonb_build_object('archivedAttempt', archived); end if;
  end if;
  return draft;
end;
$$;

-- Old versions of start_homework_retake accepted NULL without archiving the
-- old grade. A new client must fail closed against such a database.
create function public.start_legacy_homework_retake(p_student uuid, p_ref text)
returns jsonb language sql security invoker set search_path = '' as $$
  select public.start_homework_retake(p_student, p_ref, null);
$$;
revoke all on function public.start_legacy_homework_retake(uuid,text) from public, anon;
grant execute on function public.start_legacy_homework_retake(uuid,text) to authenticated;
commit;
