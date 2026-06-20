-- Teacher notifications: recipient fallback + new event triggers.
--
-- Context: this is a single-teacher app. The teacher is identified in-app by
-- their Supabase auth user id, but groups.created_by is currently unset (NULL),
-- so the existing submission trigger could never resolve a recipient and the
-- teacher bell stayed empty. We add a primary_teacher_id() fallback (the sole
-- auth user), repair the submission trigger to use it, and add two new event
-- types: new student joined, and an upcoming/overdue payment.

-- ── Recipient resolver ──────────────────────────────────────────────────────
-- Prefer an explicit groups.created_by; otherwise fall back to the single
-- teacher account (the earliest auth user).
create or replace function public.primary_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select created_by from public.groups where created_by is not null order by created_by limit 1),
    (select id from auth.users order by created_at limit 1)
  );
$$;

-- ── Repair: lesson_progress submission → teacher (uses recipient fallback) ───
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
    v_teacher := coalesce(v_teacher, public.primary_teacher_id());  -- fallback (created_by may be null)
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

-- ── New student joined → teacher ────────────────────────────────────────────
create or replace function public.notify_on_student_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid;
  v_group   text;
begin
  select coalesce(g.created_by, public.primary_teacher_id()), g.name
    into v_teacher, v_group
  from public.groups g where g.id = NEW.group_id;
  v_teacher := coalesce(v_teacher, public.primary_teacher_id());
  if v_teacher is not null then
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (v_teacher, 'teacher', 'student_joined',
            'Новый ученик',
            coalesce(NEW.name,'Ученик') || coalesce(' · ' || v_group, '') || '.',
            jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_student_insert on public.students;
create trigger trg_notify_student_insert
  after insert on public.students
  for each row execute function public.notify_on_student_insert();

-- ── Upcoming / overdue payment → teacher ────────────────────────────────────
-- Event-based (pg_cron is unavailable): fires when payment_due is set or changed
-- to a date that is overdue or within the next 7 days.
create or replace function public.notify_on_payment_due()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid;
  v_overdue boolean;
  v_amount  text;
begin
  if NEW.payment_due is null then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.payment_due is not distinct from NEW.payment_due then
    return NEW;  -- payment_due didn't actually change
  end if;
  if NEW.payment_due > current_date + 7 then return NEW; end if;  -- still far off

  select coalesce(g.created_by, public.primary_teacher_id())
    into v_teacher
  from public.groups g where g.id = NEW.group_id;
  v_teacher := coalesce(v_teacher, public.primary_teacher_id());
  if v_teacher is null then return NEW; end if;

  v_overdue := NEW.payment_due < current_date;
  v_amount  := case when coalesce(NEW.payment_amount,0) > 0
                    then ' · ' || NEW.payment_amount || ' ₽' else '' end;

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (v_teacher, 'teacher', 'payment_due',
          case when v_overdue then 'Оплата просрочена' else 'Скоро оплата' end,
          coalesce(NEW.name,'Ученик') || ' · до ' || to_char(NEW.payment_due,'DD.MM') || v_amount || '.',
          jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  return NEW;
end;
$$;

drop trigger if exists trg_notify_payment_due on public.students;
create trigger trg_notify_payment_due
  after insert or update of payment_due on public.students
  for each row execute function public.notify_on_payment_due();
