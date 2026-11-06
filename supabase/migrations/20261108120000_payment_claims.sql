-- Оплаты из концепта «Связь» (вариант «Итог»): «Я оплатила» и закрытие месяца.
--
-- Что было. Платёж учитель вносил сам: строка в payments прибавляет занятия к
-- students.lesson_balance, отметка «был» списывает одно (20261103071256).
-- Напоминания о сроке оплаты получает только учитель (20261105090000).
--
-- Что добавляем.
--   1) «Я оплатила». Ученик (или родитель с его телефона) отмечает оплату:
--      сумма, занятия пакета, по желанию фото чека. Запрос уходит учителю
--      уведомлением и в виджет «Оплаты: ждут вас». Платежа ещё нет.
--   2) Учитель подтверждает — создаётся обычный платёж в payments, баланс
--      пересчитывают существующие триггеры. Отклоняет — с причиной. Ученик
--      получает уведомление в обоих случаях.
--   3) Закрытие месяца. Учитель видит по каждому ученику: проведено уроков за
--      месяц, сколько занятий в долг (баланс ниже нуля), цену занятия, к оплате.
--      Правит и выставляет счета: ученик получает «Счёт за октябрь», учитель —
--      дату и сумму оплаты в карточке ученика (payment_due/payment_amount), на
--      которые уже настроены его напоминания. Оплата по счёту — та же «Я оплатила».
--
-- Доступ: всё за функцией payment_reminders (20261107010000). Без неё запрос
-- не создаётся, учитель не видит и не подтверждает, месяц не закрывается.
-- Таблицы закрыты для клиента целиком: чтение и запись только через функции
-- ниже, они проверяют владельца ученика и функцию.
--
-- Чего здесь нет (см. концепт): автонапоминания плательщику в Telegram,
-- «Оплачу до…», счёт по ссылке без входа, сообщения при отмене урока.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- ── Таблицы ─────────────────────────────────────────────────────────────────

create table if not exists public.payment_invoices (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  -- Первое число месяца, за который счёт.
  period     date not null check (period = date_trunc('month', period)::date),
  lessons    int  not null check (lessons between 1 and 500),
  price      int  not null check (price between 1 and 1000000),
  total      int  not null check (total > 0),
  held       int  not null default 0 check (held >= 0),
  due_date   date not null,
  status     text not null default 'sent' check (status in ('sent', 'paid', 'void')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz,
  unique (student_id, period)
);
create index if not exists payment_invoices_teacher_idx on public.payment_invoices (teacher_id, period desc);

create table if not exists public.payment_claims (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  teacher_id    uuid not null references auth.users(id) on delete cascade,
  invoice_id    uuid references public.payment_invoices(id) on delete set null,
  amount        int  not null check (amount between 1 and 10000000),
  lessons       int  not null default 0 check (lessons between 0 and 500),
  note          text check (char_length(note) <= 500),
  -- Фото чека: сжатая картинка data:image/…;base64 (как вложения ДЗ), ≤ 2 МБ.
  receipt       text check (receipt is null or (receipt like 'data:image/%' and octet_length(receipt) <= 2000000)),
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  reject_reason text check (char_length(reject_reason) <= 300),
  payment_id    uuid references public.payments(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
-- Один открытый запрос на ученика: повторное нажатие не плодит дубли.
create unique index if not exists payment_claims_one_pending on public.payment_claims (student_id) where status = 'pending';
create index if not exists payment_claims_teacher_idx on public.payment_claims (teacher_id, status, created_at desc);

alter table public.payment_invoices enable row level security;
alter table public.payment_claims   enable row level security;
revoke all on public.payment_invoices from public, anon, authenticated;
revoke all on public.payment_claims   from public, anon, authenticated;


-- ── Помощники ───────────────────────────────────────────────────────────────

-- 8000 → «8 000 ₽» (неразрывный пробел).
create or replace function iskra_private.rub(p int)
returns text language sql immutable set search_path = '' as $$
  select replace(to_char(coalesce(p, 0), 'FM999,999,999'), ',', ' ') || ' ₽'
$$;
revoke all on function iskra_private.rub(int) from public, anon, authenticated;

create or replace function iskra_private.month_name(p date)
returns text language sql immutable set search_path = '' as $$
  select (array['январь','февраль','март','апрель','май','июнь','июль','август',
                'сентябрь','октябрь','ноябрь','декабрь'])[extract(month from p)::int]
$$;
revoke all on function iskra_private.month_name(date) from public, anon, authenticated;

-- Цена занятия по истории ученика: последний счёт, иначе последний пакет.
create or replace function iskra_private.student_lesson_price(p_student uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select i.price from public.payment_invoices i
      where i.student_id = p_student and i.status <> 'void'
      order by i.period desc limit 1),
    (select round(p.amount::numeric / p.lessons_paid)::int from public.payments p
      where p.student_id = p_student and p.lessons_paid > 0
      order by p.paid_at desc limit 1))
$$;
revoke all on function iskra_private.student_lesson_price(uuid) from public, anon, authenticated;

-- Ученик принадлежит вошедшему и функция включена у его учителя.
-- Возвращает учителя (владельца карточки) или null.
create or replace function iskra_private.payment_student_teacher(p_student uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.created_by from public.students s
   where s.id = p_student
     and s.auth_user_id = auth.uid()
     and s.created_by is not null
     and iskra_private.teacher_feature_on(s.created_by, 'payment_reminders')
$$;
revoke all on function iskra_private.payment_student_teacher(uuid) from public, anon, authenticated;


-- ── Ученик ──────────────────────────────────────────────────────────────────

-- Что показать в «Оплате»: доступна ли функция, баланс, открытый счёт,
-- подсказка суммы/пакета и последние запросы. Без функции — пусто (null).
create or replace function public.my_payment_info(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_teacher uuid := iskra_private.payment_student_teacher(p_student);
  v_student record;
  v_last record;
begin
  if v_teacher is null then return null; end if;
  select s.lesson_balance, s.payment_amount, s.payment_due into v_student
    from public.students s where s.id = p_student;
  select p.amount, p.lessons_paid into v_last from public.payments p
   where p.student_id = p_student and p.lessons_paid > 0
   order by p.paid_at desc limit 1;
  return jsonb_build_object(
    'balance', v_student.lesson_balance,
    'payment_amount', v_student.payment_amount,
    'payment_due', v_student.payment_due,
    'last_package', case when v_last.amount is null then null
                         else jsonb_build_object('amount', v_last.amount, 'lessons', v_last.lessons_paid) end,
    'invoice', (select jsonb_build_object('id', i.id, 'period', i.period, 'lessons', i.lessons,
                                          'price', i.price, 'total', i.total, 'due_date', i.due_date)
                  from public.payment_invoices i
                 where i.student_id = p_student and i.status = 'sent'
                 order by i.period desc limit 1),
    'claims', coalesce((select jsonb_agg(c order by c.created_at desc) from (
        select pc.id, pc.amount, pc.lessons, pc.status, pc.reject_reason, pc.created_at, pc.decided_at,
               pc.receipt is not null as has_receipt
          from public.payment_claims pc
         where pc.student_id = p_student
         order by pc.created_at desc limit 5) c), '[]'::jsonb));
end; $$;
revoke all on function public.my_payment_info(uuid) from public, anon;
grant execute on function public.my_payment_info(uuid) to authenticated;

create or replace function public.claim_payment(
  p_student uuid, p_amount int, p_lessons int, p_note text default null, p_receipt text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_teacher uuid := iskra_private.payment_student_teacher(p_student);
  v_name text;
  v_invoice uuid;
  v_id uuid;
begin
  if v_teacher is null then raise exception 'feature not granted' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'bad amount' using errcode = '22023'; end if;
  if p_lessons is null or p_lessons < 0 or p_lessons > 500 then raise exception 'bad lessons' using errcode = '22023'; end if;
  if exists (select 1 from public.payment_claims where student_id = p_student and status = 'pending') then
    raise exception 'claim pending' using errcode = '23505';
  end if;
  select i.id into v_invoice from public.payment_invoices i
   where i.student_id = p_student and i.status = 'sent' order by i.period desc limit 1;
  insert into public.payment_claims (student_id, teacher_id, invoice_id, amount, lessons, note, receipt, created_by)
  values (p_student, v_teacher, v_invoice, p_amount, p_lessons,
          nullif(btrim(left(p_note, 500)), ''), nullif(p_receipt, ''), auth.uid())
  returning id into v_id;
  select coalesce(s.name, 'Ученик') into v_name from public.students s where s.id = p_student;
  insert into public.notifications (recipient_id, recipient_role, type, title, body, link)
  values (v_teacher, 'teacher', 'payment_due', 'Отметили оплату',
          v_name || ': «Оплатили» · ' || iskra_private.rub(p_amount)
            || case when p_lessons > 0 then ' · занятий: ' || p_lessons else '' end
            || '. Подтвердите, когда деньги придут.',
          jsonb_build_object('page', 'teacher/finances', 'claimId', v_id));
  return v_id;
end; $$;
revoke all on function public.claim_payment(uuid, int, int, text, text) from public, anon;
grant execute on function public.claim_payment(uuid, int, int, text, text) to authenticated;

-- Ученик передумал, пока учитель не ответил.
create or replace function public.cancel_payment_claim(p_claim uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_claims c set status = 'cancelled', decided_at = now()
   where c.id = p_claim and c.status = 'pending'
     and exists (select 1 from public.students s where s.id = c.student_id and s.auth_user_id = auth.uid());
  return found;
end; $$;
revoke all on function public.cancel_payment_claim(uuid) from public, anon;
grant execute on function public.cancel_payment_claim(uuid) to authenticated;


-- ── Учитель ─────────────────────────────────────────────────────────────────

-- Входящие: открытые запросы без фото (фото — отдельно, по нажатию).
create or replace function public.teacher_payment_claims()
returns table (id uuid, student_id uuid, student_name text, amount int, lessons int, note text,
               has_receipt boolean, invoice_id uuid, invoice_period date, invoice_total int,
               balance int, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.student_id, s.name, c.amount, c.lessons, c.note, c.receipt is not null,
         c.invoice_id, i.period, i.total, s.lesson_balance, c.created_at
    from public.payment_claims c
    join public.students s on s.id = c.student_id
    left join public.payment_invoices i on i.id = c.invoice_id
   where c.teacher_id = auth.uid() and c.status = 'pending'
     and iskra_private.teacher_feature_on(auth.uid(), 'payment_reminders')
   order by c.created_at desc
   limit 100
$$;
revoke all on function public.teacher_payment_claims() from public, anon;
grant execute on function public.teacher_payment_claims() to authenticated;

-- Фото чека: учителю запроса или самому ученику.
create or replace function public.payment_claim_receipt(p_claim uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.receipt from public.payment_claims c
   where c.id = p_claim and (
     (c.teacher_id = auth.uid() and iskra_private.teacher_feature_on(auth.uid(), 'payment_reminders'))
     or exists (select 1 from public.students s where s.id = c.student_id and s.auth_user_id = auth.uid()))
$$;
revoke all on function public.payment_claim_receipt(uuid) from public, anon;
grant execute on function public.payment_claim_receipt(uuid) to authenticated;

-- Подтвердить: обычный платёж (баланс пересчитают триггеры payments), счёт
-- закрыт, ученику «Оплата получена». Сумму и занятия учитель может поправить.
create or replace function public.confirm_payment_claim(p_claim uuid, p_amount int default null, p_lessons int default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c record;
  v_amount int;
  v_lessons int;
  v_payment uuid;
begin
  if v_uid is null or not iskra_private.teacher_feature_on(v_uid, 'payment_reminders') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  select * into c from public.payment_claims where id = p_claim and teacher_id = v_uid for update;
  if c.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if c.status = 'confirmed' then return c.payment_id; end if;  -- повторное нажатие
  if c.status <> 'pending' then raise exception 'claim closed' using errcode = '22023'; end if;
  v_amount := coalesce(p_amount, c.amount);
  v_lessons := coalesce(p_lessons, c.lessons);
  if v_amount < 1 or v_amount > 10000000 or v_lessons < 0 or v_lessons > 500 then
    raise exception 'bad values' using errcode = '22023';
  end if;
  insert into public.payments (student_id, teacher_id, amount, lessons_paid, note, paid_at)
  values (c.student_id, v_uid, v_amount, v_lessons,
          'Отметка ученика' || case when c.note is not null then ': ' || c.note else '' end, c.created_at)
  returning id into v_payment;
  update public.payment_claims
     set status = 'confirmed', payment_id = v_payment, amount = v_amount, lessons = v_lessons, decided_at = now()
   where id = c.id;
  if c.invoice_id is not null then
    update public.payment_invoices set status = 'paid', paid_at = now()
     where id = c.invoice_id and status = 'sent';
  end if;
  insert into public.notifications (recipient_id, recipient_role, type, title, body, link)
  values (c.student_id, 'student', 'payment_due', 'Оплата получена · ' || iskra_private.rub(v_amount),
          case when v_lessons > 0 then 'Записано занятий: ' || v_lessons || '. ' else '' end || 'Спасибо!',
          jsonb_build_object('payment', true));
  return v_payment;
end; $$;
revoke all on function public.confirm_payment_claim(uuid, int, int) from public, anon;
grant execute on function public.confirm_payment_claim(uuid, int, int) to authenticated;

create or replace function public.reject_payment_claim(p_claim uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(left(p_reason, 300)), '');
  c record;
begin
  if v_uid is null or not iskra_private.teacher_feature_on(v_uid, 'payment_reminders') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  if v_reason is null then raise exception 'reason required' using errcode = '22023'; end if;
  update public.payment_claims set status = 'rejected', reject_reason = v_reason, decided_at = now()
   where id = p_claim and teacher_id = v_uid and status = 'pending'
  returning * into c;
  if c.id is null then return false; end if;
  insert into public.notifications (recipient_id, recipient_role, type, title, body, link)
  values (c.student_id, 'student', 'payment_due', 'Оплата не подтверждена · ' || iskra_private.rub(c.amount),
          v_reason, jsonb_build_object('payment', true));
  return true;
end; $$;
revoke all on function public.reject_payment_claim(uuid, text) from public, anon;
grant execute on function public.reject_payment_claim(uuid, text) to authenticated;


-- ── Закрытие месяца ─────────────────────────────────────────────────────────

-- Таблица месяца по ученикам учителя. owed — занятий в долг сейчас (баланс < 0),
-- предложение к счёту; held — проведено за месяц (отметка «был»).
create or replace function public.month_close_preview(p_period date)
returns table (student_id uuid, student_name text, group_name text, has_account boolean,
               held int, balance int, owed int, price int, paid_in_month int,
               invoice_id uuid, invoice_status text, invoice_total int, invoice_lessons int)
language sql stable security definer set search_path = '' as $$
  with m as (select date_trunc('month', p_period)::date as d)
  select s.id, s.name, g.name, s.auth_user_id is not null,
         (select count(*)::int from public.lesson_attendance a, m
           where a.student_id = s.id and a.present
             and a.lesson_date >= m.d and a.lesson_date < (m.d + interval '1 month')),
         s.lesson_balance,
         greatest(0, -s.lesson_balance),
         iskra_private.student_lesson_price(s.id),
         (select coalesce(sum(p.amount), 0)::int from public.payments p, m
           where p.student_id = s.id
             and (p.paid_at at time zone 'Europe/Moscow') >= m.d
             and (p.paid_at at time zone 'Europe/Moscow') < (m.d + interval '1 month')),
         i.id, i.status, i.total, i.lessons
    from public.students s
    cross join m
    left join public.groups g on g.id = s.group_id
    left join public.payment_invoices i on i.student_id = s.id and i.period = m.d
   where s.created_by = auth.uid()
     and iskra_private.teacher_feature_on(auth.uid(), 'payment_reminders')
   order by greatest(0, -s.lesson_balance) desc, s.name
$$;
revoke all on function public.month_close_preview(date) from public, anon;
grant execute on function public.month_close_preview(date) to authenticated;

-- «Скоро оплата» учителю (0006) при выставлении счетов не нужно: он сам только
-- что поставил эти сроки. Функция та же, что в проде, плюс выход по флагу пакета.
create or replace function public.notify_on_payment_due()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_amount text;
begin
  if current_setting('iskra.invoice_batch', true) = 'on' then return NEW; end if;
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

-- Выставить счета: p_items = [{student_id, lessons, price}]. Уже выставленные
-- за этот месяц пропускаются. Срок — 5-е число следующего месяца или через
-- 5 дней, если месяц закрывают позже. Возвращает число новых счетов.
create or replace function public.month_close_send(p_period date, p_items jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_period date := date_trunc('month', p_period)::date;
  v_today date := (now() at time zone 'Europe/Moscow')::date;
  v_due date;
  v_count int := 0;
  v_held int;
  v_id uuid;
  r record;
begin
  if v_uid is null or not iskra_private.teacher_feature_on(v_uid, 'payment_reminders') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  if v_period > date_trunc('month', v_today)::date then raise exception 'future month' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then
    raise exception 'bad items' using errcode = '22023';
  end if;
  v_due := greatest((v_period + interval '1 month')::date + 4, v_today + 5);
  perform set_config('iskra.invoice_batch', 'on', true);
  for r in
    select (x ->> 'student_id')::uuid as student_id, (x ->> 'lessons')::int as lessons, (x ->> 'price')::int as price
      from jsonb_array_elements(p_items) x
  loop
    continue when r.lessons is null or r.lessons < 1 or r.lessons > 500 or r.price is null or r.price < 1 or r.price > 1000000;
    continue when not exists (select 1 from public.students s where s.id = r.student_id and s.created_by = v_uid);
    select count(*)::int into v_held from public.lesson_attendance a
     where a.student_id = r.student_id and a.present
       and a.lesson_date >= v_period and a.lesson_date < (v_period + interval '1 month');
    insert into public.payment_invoices (teacher_id, student_id, period, lessons, price, total, held, due_date)
    values (v_uid, r.student_id, v_period, r.lessons, r.price, r.lessons * r.price, v_held, v_due)
    on conflict (student_id, period) do nothing
    returning id into v_id;
    continue when v_id is null;
    -- Срок и сумма в карточке ученика: на них уже настроены напоминания учителю.
    update public.students set payment_due = v_due, payment_amount = r.lessons * r.price where id = r.student_id;
    -- Открытый запрос «Оплатили» без счёта относится к этому счёту.
    update public.payment_claims set invoice_id = v_id
     where student_id = r.student_id and status = 'pending' and invoice_id is null;
    insert into public.notifications (recipient_id, recipient_role, type, title, body, link)
    values (r.student_id, 'student', 'payment_due',
            'Счёт за ' || iskra_private.month_name(v_period) || ' · ' || iskra_private.rub(r.lessons * r.price),
            'Занятий: ' || r.lessons || ' × ' || iskra_private.rub(r.price) || ', оплатить до ' || to_char(v_due, 'DD.MM')
              || '. После оплаты сообщите об этом в разделе «Оплата».',
            jsonb_build_object('payment', true, 'invoiceId', v_id));
    v_count := v_count + 1;
  end loop;
  perform set_config('iskra.invoice_batch', 'off', true);
  return v_count;
end; $$;
revoke all on function public.month_close_send(date, jsonb) from public, anon;
grant execute on function public.month_close_send(date, jsonb) to authenticated;
