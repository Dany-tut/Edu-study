-- 0037_plans.sql — Тарифный каркас (этап «квоты + ручные счета», без платёжки).
-- plans: справочник тарифов. teacher_subscriptions: назначение тарифа учителю
-- (админ назначает вручную из Админки; оплата пока вне системы).
-- Квота: триггер на INSERT в students считает активных учеников владельца группы.
-- ВАЖНО: учитель БЕЗ строки подписки = внутренний/бета-аккаунт, лимиты НЕ
-- применяются. Enforcement включается только явным назначением тарифа.

create table if not exists public.plans (
  code         text primary key,
  name         text not null,
  price_rub    integer not null default 0,
  max_students integer,              -- null = безлимит
  features     jsonb not null default '{}'::jsonb,
  sort         integer not null default 0
);
alter table public.plans enable row level security;
drop policy if exists plans_read_all on public.plans;
create policy plans_read_all on public.plans for select to anon, authenticated using (true);
-- Записи в plans — только через SQL/сервис (политик записи нет = deny).

insert into public.plans (code, name, price_rub, max_students, features, sort) values
  ('free',   'Бесплатный', 0,    3,    '{"finances":false,"annotations":false,"hard_rounds":false}'::jsonb, 0),
  ('solo',   'Соло',       690,  15,   '{"finances":false,"annotations":true,"hard_rounds":true}'::jsonb,  1),
  ('pro',    'Про',        1690, 40,   '{"finances":true,"annotations":true,"hard_rounds":true}'::jsonb,   2),
  ('school', 'Школа',      4490, null, '{"finances":true,"annotations":true,"hard_rounds":true,"team":true}'::jsonb, 3)
on conflict (code) do update
  set name = excluded.name, price_rub = excluded.price_rub,
      max_students = excluded.max_students, features = excluded.features, sort = excluded.sort;

create table if not exists public.teacher_subscriptions (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  plan_code  text not null references public.plans(code),
  status     text not null default 'active',   -- active | paused
  started_at timestamptz not null default now(),
  expires_at timestamptz,                      -- null = бессрочно (ручные счета)
  note       text,
  updated_at timestamptz not null default now()
);
alter table public.teacher_subscriptions enable row level security;
drop policy if exists subs_read_own on public.teacher_subscriptions;
create policy subs_read_own on public.teacher_subscriptions for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());
-- Запись — только через admin_set_teacher_plan (definer).

-- Админ назначает/меняет тариф. p_plan = null → снять подписку (без лимитов).
create or replace function public.admin_set_teacher_plan(
  p_teacher uuid, p_plan text, p_expires timestamptz default null, p_note text default null
)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can set plans'; end if;
  if p_plan is null then
    delete from public.teacher_subscriptions where teacher_id = p_teacher;
    return;
  end if;
  insert into public.teacher_subscriptions (teacher_id, plan_code, expires_at, note)
  values (p_teacher, p_plan, p_expires, p_note)
  on conflict (teacher_id) do update
    set plan_code = excluded.plan_code, expires_at = excluded.expires_at,
        note = excluded.note, status = 'active', updated_at = now();
end;
$$;

-- Тариф текущего учителя + фактическое использование. Без подписки возвращает
-- plan_code = null (= внутренний аккаунт, лимитов нет).
create or replace function public.my_plan()
returns table(plan_code text, plan_name text, price_rub integer, max_students integer,
              expires_at timestamptz, status text, students_used bigint)
language sql stable security definer
set search_path to 'public'
as $$
  select s.plan_code, p.name, p.price_rub, p.max_students, s.expires_at, s.status,
         (select count(*) from public.students st
            join public.groups g on g.id = st.group_id
           where g.created_by = auth.uid()) as students_used
  from public.teacher_subscriptions s
  join public.plans p on p.code = s.plan_code
  where s.teacher_id = auth.uid();
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- Список подписок для админки (плашка тарифа у учителя).
create or replace function public.admin_teacher_plans()
returns table(teacher_id uuid, plan_code text, plan_name text, expires_at timestamptz, status text)
language sql stable security definer
set search_path to 'public'
as $$
  select s.teacher_id, s.plan_code, p.name, s.expires_at, s.status
  from public.teacher_subscriptions s
  join public.plans p on p.code = s.plan_code
  where public.is_admin();
$$;

-- Квота учеников: срабатывает на добавлении карточки, считает учеников по всем
-- группам владельца. Просроченная подписка (expires_at в прошлом) НЕ блокирует —
-- этап «ручных счетов» мягкий; жёсткий paywall появится вместе с платёжкой.
create or replace function public.enforce_student_limit()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
  v_max integer;
  v_used bigint;
begin
  select g.created_by into v_owner from public.groups g where g.id = new.group_id;
  if v_owner is null then return new; end if;
  select p.max_students into v_max
    from public.teacher_subscriptions s join public.plans p on p.code = s.plan_code
   where s.teacher_id = v_owner and s.status = 'active'
     and (s.expires_at is null or s.expires_at > now());
  if v_max is null then return new; end if; -- нет подписки/лимита = не ограничиваем
  select count(*) into v_used
    from public.students st join public.groups g on g.id = st.group_id
   where g.created_by = v_owner;
  if v_used >= v_max then
    raise exception 'STUDENT_LIMIT:%', v_max
      using hint = 'Достигнут лимит учеников тарифа. Обновите тариф.';
  end if;
  return new;
end;
$$;
drop trigger if exists students_enforce_limit on public.students;
create trigger students_enforce_limit
  before insert on public.students
  for each row execute function public.enforce_student_limit();
