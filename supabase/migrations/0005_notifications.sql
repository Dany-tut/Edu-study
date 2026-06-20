-- Notifications: persistent, realtime-driven alerts for students and teachers.
-- Source-of-truth events are detected by DB triggers so they fire regardless of
-- which client (anon student app / authed teacher app) performs the write.

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid not null,                 -- student.id OR teacher auth.users.id
  recipient_role text not null check (recipient_role in ('student','teacher')),
  type           text not null,                 -- hw_returned | hw_graded | hw_submitted | test_assigned | ...
  title          text not null,
  body           text not null default '',
  link           jsonb,                         -- { page, lessonRef, subject, studentId, assignmentId }
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read = false;

alter table public.notifications enable row level security;

-- Posture mirrors lesson_progress: open read/update for anon (students have no JWT,
-- identified only by a localStorage student_id) and authenticated (teachers).
-- Inserts happen ONLY via SECURITY DEFINER triggers, so there is no client INSERT policy.
drop policy if exists notif_select_anon on public.notifications;
drop policy if exists notif_select_auth on public.notifications;
drop policy if exists notif_update_anon on public.notifications;
drop policy if exists notif_update_auth on public.notifications;
create policy notif_select_anon on public.notifications for select to anon          using (true);
create policy notif_select_auth on public.notifications for select to authenticated using (true);
create policy notif_update_anon on public.notifications for update to anon          using (true) with check (true);
create policy notif_update_auth on public.notifications for update to authenticated using (true) with check (true);

-- Realtime stream
alter publication supabase_realtime add table public.notifications;

-- ── Trigger: lesson_progress status transitions ─────────────────────────────
create or replace function public.notify_on_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hard    boolean := right(coalesce(NEW.lesson_ref,''), 5) = '-hard';
  v_title   text;
  v_body    text;
  v_teacher uuid;
  v_sname   text;
begin
  -- Teacher → student: returned for rework (only from a submitted state)
  if NEW.status = 'returned' and TG_OP = 'UPDATE' and OLD.status = 'submitted' then
    v_title := case when v_hard then 'Сложное задание вернули на доработку'
                    else 'Домашку вернули на доработку' end;
    v_body  := 'Преподаватель оставил комментарий — исправь и отправь снова.';
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (NEW.student_id, 'student', 'hw_returned', v_title, v_body,
            jsonb_build_object('page','home','lessonRef',NEW.lesson_ref,'subject',NEW.subject));

  -- Teacher → student: graded / accepted (only from a submitted state)
  elsif NEW.status = 'completed' and TG_OP = 'UPDATE' and OLD.status = 'submitted' then
    if v_hard then
      v_title := 'Сложное задание проверено';
      v_body  := case when coalesce(NEW.score,0) > 0 then 'Оценка: ' || NEW.score || ' из 5.'
                      else 'Работа принята.' end;
    else
      v_title := 'Домашку проверили';
      v_body  := case when coalesce(NEW.score,0) > 0 then 'Оценка: ' || NEW.score || '.'
                      else 'Работа зачтена.' end;
    end if;
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (NEW.student_id, 'student', 'hw_graded', v_title, v_body,
            jsonb_build_object('page','home','lessonRef',NEW.lesson_ref,'subject',NEW.subject));

  -- Student → teacher: submitted for review (first submit or resubmit)
  elsif NEW.status = 'submitted'
        and (TG_OP = 'INSERT' or OLD.status is distinct from 'submitted') then
    select g.created_by, s.name into v_teacher, v_sname
    from public.students s
    join public.groups g on g.id = s.group_id
    where s.id = NEW.student_id;
    if v_teacher is not null then
      insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
      values (v_teacher, 'teacher', 'hw_submitted',
              'Новая работа на проверку',
              coalesce(v_sname,'Ученик') || ' отправил(а) '
                || case when v_hard then 'решение сложного задания' else 'домашку' end || '.',
              jsonb_build_object('page','teacher/homework','lessonRef',NEW.lesson_ref,
                                 'subject',NEW.subject,'studentId',NEW.student_id));
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_lesson_progress on public.lesson_progress;
create trigger trg_notify_lesson_progress
  after insert or update of status on public.lesson_progress
  for each row execute function public.notify_on_lesson_progress();

-- ── Trigger: new test assigned ──────────────────────────────────────────────
create or replace function public.notify_on_test_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  select distinct s.id, 'student', 'test_assigned',
         'Новый тест: ' || NEW.title,
         'Тебе назначен ' || case when NEW.assign_type = 'trial' then 'пробный тест' else 'тест' end
           || coalesce(' · до ' || to_char(NEW.due_date,'DD.MM'), '') || '.',
         jsonb_build_object('page','home','assignmentId',NEW.id,'subject',NEW.subject)
  from public.students s
  where s.id = any(NEW.student_ids)
     or s.group_id = any(NEW.group_ids);
  return NEW;
end;
$$;

drop trigger if exists trg_notify_test_assignment on public.test_assignments;
create trigger trg_notify_test_assignment
  after insert on public.test_assignments
  for each row execute function public.notify_on_test_assignment();
