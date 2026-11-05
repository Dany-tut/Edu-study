-- Напоминания об оплате без ручной работы учителя.
--
-- Почему. Все оплаты в Искре — пакеты занятий: платёж прибавляет занятия к
-- students.lesson_balance, отметка «был» списывает одно (20261103071256).
-- Дату оплаты учитель ставил руками, после платежа она не сдвигалась — на
-- 05.11.2026 все 17 заполненных дат были в прошлом. Уведомление payment_due
-- (0006) срабатывало только в момент правки даты.
--
-- Что делаем:
--   1) платёж закрывает назначенную дату оплаты (она про этот платёж);
--   2) когда оплаченные занятия кончаются (баланс опустился до 1 и до 0),
--      учитель получает уведомление сразу, из триггера на баланс;
--   3) ежедневно в 09:00 МСК — напоминание в день оплаты и через 3 дня
--      просрочки, по назначенной дате.
-- Все уведомления — тип payment_due: значок и цвет у клиента уже есть.
-- Ученику ничего не шлём: платят часто родители, ученик — ребёнок.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Учитель ученика: владелец ученика, иначе владелец группы, иначе основной.
create or replace function public.student_teacher_id(p_student uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(s.created_by, g.created_by, public.primary_teacher_id())
  from public.students s left join public.groups g on g.id = s.group_id
  where s.id = p_student
$$;
revoke all on function public.student_teacher_id(uuid) from public, anon, authenticated;

-- 1) Платёж закрывает дату оплаты, если она уже наступила или близко (≤14 дней).
create or replace function public.clear_payment_due_on_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.lessons_paid, 0) <= 0 and coalesce(new.amount, 0) <= 0 then return new; end if;
  update public.students s set payment_due = null
  where s.id = new.student_id and s.payment_due is not null
    and s.payment_due <= (now() at time zone 'Europe/Moscow')::date + 14;
  return new;
end;
$$;
revoke all on function public.clear_payment_due_on_payment() from public, anon, authenticated;

drop trigger if exists trg_clear_payment_due on public.payments;
create trigger trg_clear_payment_due after insert on public.payments
for each row execute function public.clear_payment_due_on_payment();

-- 2) Оплаченные занятия кончаются: баланс пересёк 1 или 0 сверху вниз.
create or replace function public.notify_on_lesson_balance_low()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_teacher uuid;
begin
  if new.lesson_balance is not distinct from old.lesson_balance then return new; end if;
  if not (old.lesson_balance > 1 and new.lesson_balance <= 1)
     and not (old.lesson_balance > 0 and new.lesson_balance <= 0) then return new; end if;
  -- Баланс ведут только ученики с пакетами; остальным не о чем напоминать.
  if not exists (select 1 from public.payments p where p.student_id = new.id) then return new; end if;
  v_teacher := public.student_teacher_id(new.id);
  if v_teacher is null then return new; end if;
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (v_teacher, 'teacher', 'payment_due',
          case when new.lesson_balance <= 0 then 'Оплаченные занятия закончились' else 'Осталось одно оплаченное занятие' end,
          coalesce(new.name, 'Ученик')
            || case when new.lesson_balance < 0 then ' · в долг: ' || abs(new.lesson_balance) || ' зан.' else '' end
            || case when coalesce(new.payment_amount, 0) > 0 then ' · ' || new.payment_amount || ' ₽' else '' end || '.',
          jsonb_build_object('page', 'teacher/groups', 'studentId', new.id));
  return new;
end;
$$;
revoke all on function public.notify_on_lesson_balance_low() from public, anon, authenticated;

drop trigger if exists trg_notify_lesson_balance_low on public.students;
create trigger trg_notify_lesson_balance_low after update of lesson_balance on public.students
for each row execute function public.notify_on_lesson_balance_low();

-- 3) Ежедневно: день оплаты и третий день просрочки. Одна строка на ученика,
-- повтор за тот же день не создаётся (запуск можно повторить руками).
create or replace function public.payment_reminders_run()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Europe/Moscow')::date;
  v_count integer := 0;
  r record;
begin
  for r in
    select s.id, s.name, s.payment_due, s.payment_amount, public.student_teacher_id(s.id) as teacher
    from public.students s
    where s.payment_due in (v_today, v_today - 3)
  loop
    continue when r.teacher is null;
    continue when exists (
      select 1 from public.notifications n
      where n.recipient_id = r.teacher and n.type = 'payment_due'
        and n.link ->> 'studentId' = r.id::text
        and (n.created_at at time zone 'Europe/Moscow')::date = v_today);
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (r.teacher, 'teacher', 'payment_due',
            case when r.payment_due = v_today then 'Сегодня оплата' else 'Оплата просрочена на 3 дня' end,
            coalesce(r.name, 'Ученик') || ' · до ' || to_char(r.payment_due, 'DD.MM')
              || case when coalesce(r.payment_amount, 0) > 0 then ' · ' || r.payment_amount || ' ₽' else '' end || '.',
            jsonb_build_object('page', 'teacher/groups', 'studentId', r.id));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.payment_reminders_run() from public, anon, authenticated;

do $cron$ begin
  if exists (select 1 from cron.job where jobname = 'payment-reminders-daily') then
    perform cron.unschedule('payment-reminders-daily');
  end if;
  perform cron.schedule('payment-reminders-daily', '0 6 * * *', 'select public.payment_reminders_run()');
end $cron$;
