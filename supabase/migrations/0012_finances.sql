-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0012_finances — student payment history + lesson balance               ║
-- ║                                                                        ║
-- ║  • payments table: real history of money received per student          ║
-- ║  • lesson_balance column on students: prepaid lessons remaining        ║
-- ║  • trigger on lesson_attendance: each attended lesson decrements       ║
-- ║    lesson_balance by 1 (balance < 0 means automatic debt)             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Lesson balance on students ────────────────────────────────────────────────
alter table public.students
  add column if not exists lesson_balance int not null default 0;

-- ── Payments table ────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  teacher_id   uuid references auth.users(id) on delete set null,
  amount       int  not null check (amount > 0),      -- RUB
  lessons_paid int  not null default 0,               -- how many lessons this payment covers
  note         text,
  paid_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index payments_student_idx on public.payments (student_id);
create index payments_teacher_idx on public.payments (teacher_id);
create index payments_paid_at_idx on public.payments (paid_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.payments enable row level security;

-- Authenticated users (teachers) can read all payments
create policy "payments_read" on public.payments
  for select using (auth.role() = 'authenticated');

-- Authenticated users can insert
create policy "payments_insert" on public.payments
  for insert with check (auth.role() = 'authenticated');

-- Authenticated users can update/delete their own payments
create policy "payments_update" on public.payments
  for update using (teacher_id = auth.uid());

create policy "payments_delete" on public.payments
  for delete using (teacher_id = auth.uid());

-- ── Trigger: payment received → top up lesson_balance ────────────────────────
create or replace function public.on_payment_received()
returns trigger language plpgsql security definer as $$
begin
  if NEW.lessons_paid > 0 then
    update public.students
    set lesson_balance = lesson_balance + NEW.lessons_paid
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_on_payment_received on public.payments;
create trigger trg_on_payment_received
  after insert on public.payments
  for each row execute function public.on_payment_received();

-- ── Trigger: lesson attended → decrement lesson_balance ──────────────────────
-- lesson_attendance.status = 'present' means the student was actually there.
-- We only decrement on INSERT (not updates to status) to avoid double-counting.
create or replace function public.on_lesson_attended()
returns trigger language plpgsql security invoker as $$
begin
  if NEW.present = true then
    update public.students
    set lesson_balance = lesson_balance - 1
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_on_lesson_attended on public.lesson_attendance;
create trigger trg_on_lesson_attended
  after insert on public.lesson_attendance
  for each row execute function public.on_lesson_attended();

-- ── Undo trigger if attendance is corrected ──────────────────────────────────
create or replace function public.on_lesson_attendance_updated()
returns trigger language plpgsql security invoker as $$
begin
  if OLD.present = true and NEW.present = false then
    update public.students
    set lesson_balance = lesson_balance + 1
    where id = NEW.student_id;
  elsif OLD.present = false and NEW.present = true then
    update public.students
    set lesson_balance = lesson_balance - 1
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_on_lesson_attendance_updated on public.lesson_attendance;
create trigger trg_on_lesson_attendance_updated
  after update of present on public.lesson_attendance
  for each row execute function public.on_lesson_attendance_updated();

-- ── Helper RPC: monthly summary for the teacher ───────────────────────────────
-- Returns (received, expected, debt, forecast) for the current teacher.
-- "received"  = sum of payments.amount this calendar month
-- "expected"  = sum of payment_amount for students with payment_due this month (not yet paid)
-- "debt"      = sum of payment_amount for overdue students (payment_due < today)
-- "forecast"  = received + expected  (simplified)
create or replace function public.teacher_finance_summary(p_teacher_id uuid)
returns table (
  received  bigint,
  expected  bigint,
  debt      bigint,
  forecast  bigint
) language sql security definer as $$
  select
    coalesce((
      select sum(p.amount)
      from public.payments p
      where p.teacher_id = p_teacher_id
        and date_trunc('month', p.paid_at) = date_trunc('month', now())
    ), 0)::bigint as received,

    coalesce((
      select sum(s.payment_amount)
      from public.students s
      where s.payment_due >= current_date
        and s.payment_due < date_trunc('month', now()) + interval '1 month'
    ), 0)::bigint as expected,

    coalesce((
      select sum(s.payment_amount)
      from public.students s
      where s.payment_due < current_date
        and coalesce(s.payment_amount, 0) > 0
    ), 0)::bigint as debt,

    coalesce((
      select sum(p.amount)
      from public.payments p
      where p.teacher_id = p_teacher_id
        and date_trunc('month', p.paid_at) = date_trunc('month', now())
    ), 0)::bigint +
    coalesce((
      select sum(s.payment_amount)
      from public.students s
      where s.payment_due >= current_date
        and s.payment_due < date_trunc('month', now()) + interval '1 month'
    ), 0)::bigint as forecast;
$$;
