-- Student notifications now name the lesson and deep-link to it. The popup row
-- navigates to the lesson on click using link.lessonRef, so for hard work the
-- '-hard' suffix is stripped to the base lesson short_id (= lessons.short_id =
-- the student store's lesson id).

create or replace function public.notify_on_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hard     boolean := right(coalesce(NEW.lesson_ref,''), 5) = '-hard';
  v_base_ref text := case when right(coalesce(NEW.lesson_ref,''), 5) = '-hard'
                          then left(NEW.lesson_ref, length(NEW.lesson_ref) - 5)
                          else NEW.lesson_ref end;
  v_lesson   text;
  v_prefix   text;
  v_title    text;
  v_body     text;
  v_teacher  uuid;
  v_sname    text;
begin
  -- Lesson title for naming + navigation. Falls back gracefully when absent.
  select title into v_lesson from public.lessons where short_id = v_base_ref limit 1;
  v_prefix := case when v_lesson is not null and v_lesson <> ''
                   then 'Урок «' || v_lesson || '» · ' else '' end;

  -- Teacher → student: returned for rework (only from a submitted state)
  if NEW.status = 'returned' and TG_OP = 'UPDATE' and OLD.status = 'submitted' then
    v_title := case when v_hard then 'Сложное задание вернули на доработку'
                    else 'Домашку вернули на доработку' end;
    v_body  := v_prefix || 'преподаватель оставил комментарий — исправь и отправь снова.';
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (NEW.student_id, 'student', 'hw_returned', v_title, v_body,
            jsonb_build_object('page','home','lessonRef',v_base_ref,'subject',NEW.subject));

  -- Teacher → student: graded / accepted (only from a submitted state)
  elsif NEW.status = 'completed' and TG_OP = 'UPDATE' and OLD.status = 'submitted' then
    if v_hard then
      v_title := 'Сложное задание проверено';
      v_body  := v_prefix || case when coalesce(NEW.score,0) > 0 then 'Оценка: ' || NEW.score || ' из 5.'
                                  else 'Работа принята.' end;
    else
      v_title := 'Домашку проверили';
      v_body  := v_prefix || case when coalesce(NEW.score,0) > 0 then 'Оценка: ' || NEW.score || '.'
                                  else 'Работа зачтена.' end;
    end if;
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (NEW.student_id, 'student', 'hw_graded', v_title, v_body,
            jsonb_build_object('page','home','lessonRef',v_base_ref,'subject',NEW.subject));

  -- Student → teacher: submitted for review (first submit or resubmit)
  elsif NEW.status = 'submitted'
        and (TG_OP = 'INSERT' or OLD.status is distinct from 'submitted') then
    select g.created_by, s.name into v_teacher, v_sname
    from public.students s
    join public.groups g on g.id = s.group_id
    where s.id = NEW.student_id;
    v_teacher := coalesce(v_teacher, public.primary_teacher_id());  -- fallback (created_by may be null)
    if v_teacher is not null then
      insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
      values (v_teacher, 'teacher', 'hw_submitted',
              'Новая работа на проверку',
              coalesce(v_sname,'Ученик') || ' отправил(а) '
                || case when v_hard then 'решение сложного задания' else 'домашку' end
                || case when v_lesson is not null and v_lesson <> '' then ' · урок «' || v_lesson || '»' else '' end
                || '.',
              jsonb_build_object('page','teacher/homework','lessonRef',NEW.lesson_ref,
                                 'subject',NEW.subject,'studentId',NEW.student_id));
    end if;
  end if;
  return NEW;
end;
$$;
