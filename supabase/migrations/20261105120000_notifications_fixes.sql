-- Уведомления: адресаты, «Тест пройден», новая домашка, чистка.
--
-- 1. Работа на проверку уходила учителю группы, а ученик без группы — «основному»
--    учителю (primary_teacher_id), то есть чужому. Теперь адресат — владелец
--    ученика (students.created_by), запасной — владелец группы; угадывать нельзя.
-- 2. «Тест пройден» срабатывал на ПЕРВОМ ответе: save_diag_progress заводит строку
--    сразу, completed=false. Теперь — только когда completed становится true.
--    Адресат: автор назначения → владелец ученика → администраторы (общая ссылка
--    без владельца; результаты по ней видит только персонал).
-- 3. Ученик узнаёт о новой домашке (homework, status → active).
-- 4. Оплата: только адресат (напоминания — в 20261105090000_payment_reminders.sql).
-- 5. Мусор: уведомления удалённым получателям чистятся раз в сутки.

-- Администраторы: роль в app_metadata, как в is_admin().
create or replace function public._notif_admins()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select u.id from auth.users u where u.raw_app_meta_data->>'role' = 'admin'
$$;
revoke all on function public._notif_admins() from public, anon, authenticated;

-- ── 1. lesson_progress: проверено / возвращено / сдано ─────────────────────────
create or replace function public.notify_on_lesson_progress()
returns trigger
language plpgsql security definer set search_path = public
as $function$
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
  select title into v_lesson from public.lessons where short_id = v_base_ref limit 1;
  -- Отдельная домашка (hw-<id>) не урок: её название — в homework.title.
  if v_lesson is null and v_base_ref like 'hw-%' then
    select nullif(h.title, '') into v_lesson from public.homework h
    where h.id::text = substr(v_base_ref, 4);
  end if;
  v_prefix := case when v_lesson is not null and v_lesson <> ''
                   then 'Урок «' || v_lesson || '» · ' else '' end;

  if NEW.status = 'returned' and TG_OP = 'UPDATE' and OLD.status = 'submitted' then
    v_title := case when v_hard then 'Сложное задание вернули на доработку'
                    else 'Домашку вернули на доработку' end;
    v_body  := v_prefix || 'преподаватель оставил комментарий — исправь и отправь снова.';
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (NEW.student_id, 'student', 'hw_returned', v_title, v_body,
            jsonb_build_object('page','home','lessonRef',v_base_ref,'subject',NEW.subject));

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

  elsif NEW.status = 'submitted'
        and (TG_OP = 'INSERT' or OLD.status is distinct from 'submitted') then
    select coalesce(s.created_by, g.created_by), s.name into v_teacher, v_sname
    from public.students s
    left join public.groups g on g.id = s.group_id
    where s.id = NEW.student_id;
    if v_teacher is not null then
      insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
      values (v_teacher, 'teacher', 'hw_submitted',
              'Новая работа на проверку',
              coalesce(v_sname,'Ученик') || ' отправил(а) '
                || case when v_hard then 'решение сложного задания' else 'домашку' end
                || case when v_lesson is not null and v_lesson <> '' then ' · «' || v_lesson || '»' else '' end
                || '.',
              jsonb_build_object('page','teacher/gradebook','lessonRef',NEW.lesson_ref,
                                 'subject',NEW.subject,'studentId',NEW.student_id));
    end if;
  end if;
  return NEW;
end;
$function$;

-- ── 2. diag_results: «Тест пройден» — только по сдаче ──────────────────────────
create or replace function public.notify_on_test_completed()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare
  v_teacher     uuid;
  v_test_title  text;
  v_student     text;
  v_score       text;
  v_link        jsonb;
  v_sid         uuid := coalesce(NEW.student_id, NEW.linked_student_id);
begin
  if not coalesce(NEW.completed, false) then return NEW; end if;
  if TG_OP = 'UPDATE' and coalesce(OLD.completed, false) then return NEW; end if;

  if NEW.assignment_id is not null then
    select ta.created_by, ta.title into v_teacher, v_test_title
    from public.test_assignments ta where ta.id = NEW.assignment_id;
  end if;
  if v_teacher is null and v_sid is not null then
    select s.created_by into v_teacher from public.students s where s.id = v_sid;
  end if;
  v_test_title := coalesce(v_test_title,
    (select nullif(ct.label, '') from public.custom_diag_tests ct where ct.id::text = NEW.subject limit 1),
    NEW.subject::text, 'Тест');

  v_student := coalesce(nullif(trim(NEW.name),''), 'Аноним');
  v_score   := case when NEW.score_pct is not null then NEW.score_pct::text || '%' else null end;
  v_link    := jsonb_build_object('page','teacher/constructor','tab','testing',
                 'assignmentId', NEW.assignment_id, 'subject', NEW.subject, 'studentId', v_sid);

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  select r, 'teacher', 'test_completed', 'Тест пройден',
         v_student || ' · ' || v_test_title || coalesce(' · ' || v_score, ''), v_link
  from (
    select v_teacher as r where v_teacher is not null
    union
    select a from public._notif_admins() a where v_teacher is null
  ) x;
  return NEW;
end;
$function$;

drop trigger if exists trg_notify_test_completed on public.diag_results;
create trigger trg_notify_test_completed
  after insert or update of completed on public.diag_results
  for each row execute function public.notify_on_test_completed();

-- ── 3. Новый ученик: убрана мёртвая строка (адресат всё равно created_by) ──────
create or replace function public.notify_on_student_insert()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare
  v_group text;
begin
  if NEW.created_by is null then return NEW; end if;
  select g.name into v_group from public.groups g where g.id = NEW.group_id;
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (NEW.created_by, 'teacher', 'student_joined',
          'Новый ученик',
          coalesce(NEW.name,'Ученик') || coalesce(' · ' || v_group, '') || '.',
          jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  return NEW;
end;
$function$;

-- ── 4. Оплата: только мёртвая строка (адрес — created_by). Напоминания по
-- расписанию — в 20261105090000_payment_reminders.sql, здесь их не дублируем.
create or replace function public.notify_on_payment_due()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare
  v_amount text;
begin
  if NEW.payment_due is null or NEW.created_by is null then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.payment_due is not distinct from NEW.payment_due then
    return NEW;
  end if;
  if NEW.payment_due > current_date + 7 then return NEW; end if;
  v_amount := case when coalesce(NEW.payment_amount,0) > 0
                   then ' · ' || NEW.payment_amount || ' ₽' else '' end;
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (NEW.created_by, 'teacher', 'payment_due',
          case when NEW.payment_due < current_date then 'Оплата просрочена' else 'Скоро оплата' end,
          coalesce(NEW.name,'Ученик') || ' · до ' || to_char(NEW.payment_due,'DD.MM') || v_amount || '.',
          jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  return NEW;
end;
$function$;

-- ── 5. Новая домашка ученикам группы ───────────────────────────────────────────
create or replace function public.notify_on_homework()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare
  v_ref   text;
  v_title text := nullif(trim(NEW.title), '');
begin
  if NEW.status is distinct from 'active' or NEW.group_id is null then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.status = 'active' then return NEW; end if;

  -- Как ученик открывает её: отдельная — синтетический урок hw-<id>,
  -- привязанная — урок курса по short_id.
  if NEW.lesson_id is null then
    v_ref := 'hw-' || NEW.id;
  else
    select l.short_id into v_ref from public.lessons l where l.id = NEW.lesson_id;
  end if;

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  select s.id, 'student', 'homework_assigned', 'Новая домашка',
         coalesce('«' || v_title || '»', 'Преподаватель задал домашку')
           || coalesce(' · до ' || to_char(NEW.due_date,'DD.MM'), '') || '.',
         jsonb_build_object('page','home','lessonRef',v_ref,'homeworkId',NEW.id)
  from public.students s
  where s.group_id = NEW.group_id;
  return NEW;
end;
$function$;

drop trigger if exists trg_notify_homework on public.homework;
create trigger trg_notify_homework
  after insert or update of status on public.homework
  for each row execute function public.notify_on_homework();

-- ── 6. Ежедневно: уведомления получателей, которых больше нет ──────────────────
-- recipient_id — то ученик, то пользователь Auth: внешнего ключа на оба не
-- повесить, поэтому чистим расписанием.
create or replace function public.run_notifications_cleanup()
returns void
language sql security definer set search_path = public
as $function$
  delete from public.notifications n
  where (n.recipient_role = 'student' and not exists (select 1 from public.students s where s.id = n.recipient_id))
     or (n.recipient_role = 'teacher' and not exists (select 1 from auth.users u where u.id = n.recipient_id));
$function$;
revoke all on function public.run_notifications_cleanup() from public, anon, authenticated;

select cron.unschedule('notifications-cleanup-daily')
where exists (select 1 from cron.job where jobname = 'notifications-cleanup-daily');
select cron.schedule('notifications-cleanup-daily', '40 3 * * *', 'select public.run_notifications_cleanup()');

-- ── Разовая правка истории ─────────────────────────────────────────────────────
-- Работы учеников без группы, ушедшие «основному» учителю, — их владельцу (прочитанными:
-- это старые события, звонить о них сейчас незачем).
update public.notifications n
set recipient_id = s.created_by, read = true
from public.students s
where n.type = 'hw_submitted'
  and s.id::text = n.link->>'studentId'
  and s.group_id is null
  and s.created_by is not null
  and n.recipient_id <> s.created_by;

-- Старые ссылки на несуществующие адреса кабинета.
update public.notifications
set link = link || '{"page":"teacher/gradebook"}'::jsonb
where type = 'hw_submitted' and link->>'page' = 'teacher/homework';
update public.notifications
set link = link || '{"page":"teacher/constructor","tab":"testing"}'::jsonb
where type = 'test_completed';

select public.run_notifications_cleanup();
