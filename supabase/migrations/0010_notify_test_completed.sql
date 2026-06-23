-- Notify teacher when a student completes a test (diag_results INSERT).
-- Fires for both anonymous and linked-student results.
-- If the result is linked to a test_assignment, the teacher is resolved via
-- that assignment's creator; otherwise falls back to primary_teacher_id().

create or replace function public.notify_on_test_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher     uuid;
  v_test_title  text;
  v_student     text;
  v_score       text;
begin
  -- Resolve teacher: prefer assignment creator, fallback to primary
  if NEW.assignment_id is not null then
    select coalesce(ta.created_by, public.primary_teacher_id()), ta.title
      into v_teacher, v_test_title
    from public.test_assignments ta
    where ta.id = NEW.assignment_id;
  end if;
  v_teacher    := coalesce(v_teacher, public.primary_teacher_id());
  v_test_title := coalesce(v_test_title, NEW.subject::text, 'Тест');

  if v_teacher is null then return NEW; end if;

  v_student := coalesce(nullif(trim(NEW.name),''), 'Аноним');
  v_score   := case when NEW.score_pct is not null then NEW.score_pct::text || '%' else null end;

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (
    v_teacher,
    'teacher',
    'test_completed',
    'Тест пройден',
    v_student
      || ' · ' || v_test_title
      || coalesce(' · ' || v_score, ''),
    jsonb_build_object(
      'page',         'teacher/testing',
      'assignmentId', NEW.assignment_id,
      'subject',      NEW.subject,
      'studentId',    NEW.student_id
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_test_completed on public.diag_results;
create trigger trg_notify_test_completed
  after insert on public.diag_results
  for each row execute function public.notify_on_test_completed();
