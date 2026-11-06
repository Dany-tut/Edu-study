-- Напоминания ученикам в Telegram (функция reminders, концепт «Связь» → «Итог»).
--
-- 1. Привязка: учитель в карточке ученика получает одноразовую ссылку
--    t.me/<бот>?start=<код> (7 дней). Ученик жмёт «Start» — tg-webhook зовёт
--    tg_link_claim и связывает chat_id со всеми карточками этого человека у
--    этого учителя (person_id). /stop в боте отвязывает. Учитель может отвязать
--    из карточки.
-- 2. Правила учителя (reminder_settings): урок скоро (30/60/120 мин), ДЗ завтра
--    (накануне в 17/18/19), ДЗ просрочено (на следующий день в 10:00, 1/3/5 раз).
--    Время — московское, как и само расписание (schedule_lessons.time_start).
--    Тихие часы: раньше 07:00 ничего не уходит.
-- 3. Очередь и журнал (reminder_outbox): планировщик раз в 5 минут ставит
--    строки на ближайшие сутки, диспетчер раз в минуту будит Edge Function
--    reminders-send, она шлёт ботом и пишет статус: sent / failed (бот
--    заблокирован, чат не найден) / cancelled (ДЗ сдано, урок отменён,
--    функцию выключили …).
-- 4. Доступ: всё за iskra_private.teacher_feature_on(teacher, 'reminders') —
--    без функции ссылку не создать, строки не планируются, стоящие гасятся.

-- ── 1. Привязка Telegram ────────────────────────────────────────────────────

create table if not exists public.student_tg_links (
  student_id uuid primary key references public.students(id) on delete cascade,
  chat_id    bigint not null,
  username   text,
  first_name text,
  linked_at  timestamptz not null default now(),
  -- Telegram ответил 403 (ученик заблокировал бота) — не шлём, пока он не
  -- нажмёт «Start» заново по новой ссылке.
  blocked_at timestamptz
);
create index if not exists student_tg_links_chat_idx on public.student_tg_links (chat_id);

create table if not exists public.tg_link_codes (
  code       text primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tg_link_codes_student_idx on public.tg_link_codes (student_id);

alter table public.student_tg_links enable row level security;
alter table public.tg_link_codes    enable row level security;
revoke all on public.student_tg_links from anon, authenticated;
revoke all on public.tg_link_codes    from anon, authenticated;
-- Чтение и запись — только через функции ниже.

-- Учитель ведёт этого ученика (карточка его или ученик в его группе).
create or replace function iskra_private.reminders_owns_student(p_uid uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and exists (
    select 1 from students s
      left join groups g on g.id = s.group_id
     where s.id = p_student
       and (s.created_by = p_uid or g.created_by = p_uid or public.is_admin_user(p_uid)))
$$;
revoke all on function iskra_private.reminders_owns_student(uuid, uuid) from public, anon, authenticated;

-- Учитель ученика для правил и журнала.
create or replace function iskra_private.reminders_teacher_of(p_student uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(s.created_by, g.created_by)
    from students s left join groups g on g.id = s.group_id
   where s.id = p_student
$$;
revoke all on function iskra_private.reminders_teacher_of(uuid) from public, anon, authenticated;

-- Новая ссылка: старые неиспользованные коды этого ученика гаснут.
create or replace function public.tg_link_create(p_student uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_code text; v_exp timestamptz := now() + interval '7 days'; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not iskra_private.teacher_feature_on(uid, 'reminders') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  if not iskra_private.reminders_owns_student(uid, p_student) then
    raise exception 'not your student' using errcode = '42501';
  end if;
  delete from tg_link_codes c where c.student_id = p_student and c.used_at is null;
  -- 32 hex-символа: Telegram пускает в start только [A-Za-z0-9_-] до 64.
  v_code := replace(gen_random_uuid()::text, '-', '');
  insert into tg_link_codes (code, student_id, created_by, expires_at)
  values (v_code, p_student, uid, v_exp);
  return query select v_code, v_exp;
end; $$;
revoke all on function public.tg_link_create(uuid) from public, anon;
grant execute on function public.tg_link_create(uuid) to authenticated;

-- Вызывает tg-webhook (service_role). Возвращает имя ученика или null, если
-- код неизвестен, использован или истёк.
create or replace function public.tg_link_claim(p_code text, p_chat bigint, p_username text, p_first_name text)
returns text language plpgsql security definer set search_path = public as $$
declare c record; v_person uuid; v_teacher uuid; v_name text;
begin
  select * into c from tg_link_codes where code = p_code for update;
  if not found or c.used_at is not null or c.expires_at < now() then return null; end if;
  update tg_link_codes set used_at = now() where code = p_code;

  select s.person_id, s.name into v_person, v_name from students s where s.id = c.student_id;
  v_teacher := iskra_private.reminders_teacher_of(c.student_id);

  -- Тот же человек по другим предметам у этого же учителя — та же переписка.
  insert into student_tg_links (student_id, chat_id, username, first_name, linked_at, blocked_at)
  select s.id, p_chat, p_username, p_first_name, now(), null
    from students s
   where s.id = c.student_id
      or (v_person is not null and s.person_id = v_person
          and iskra_private.reminders_teacher_of(s.id) is not distinct from v_teacher)
  on conflict (student_id) do update
     set chat_id = excluded.chat_id, username = excluded.username,
         first_name = excluded.first_name, linked_at = now(), blocked_at = null;
  return coalesce(nullif(split_part(btrim(v_name), ' ', 1), ''), v_name);
end; $$;
revoke all on function public.tg_link_claim(text, bigint, text, text) from public, anon, authenticated;

-- /stop в боте: отвязать все карточки этого чата.
create or replace function public.tg_unlink_chat(p_chat bigint)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from student_tg_links where chat_id = p_chat;
  get diagnostics n = row_count;
  update reminder_outbox o set status = 'cancelled', error = 'unlinked', updated_at = now()
   where o.status = 'queued'
     and not exists (select 1 from student_tg_links l where l.student_id = o.student_id);
  return n;
end; $$;
-- (тело ссылается на reminder_outbox, созданную ниже, — plpgsql проверит при вызове)
revoke all on function public.tg_unlink_chat(bigint) from public, anon, authenticated;

-- Учитель отвязывает из карточки: ссылка и тот же человек по другим предметам.
create or replace function public.tg_unlink(p_student uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_chat bigint; uid uuid := auth.uid();
begin
  if not iskra_private.reminders_owns_student(uid, p_student) then
    raise exception 'not your student' using errcode = '42501';
  end if;
  select chat_id into v_chat from student_tg_links where student_id = p_student;
  if v_chat is null then return; end if;
  delete from student_tg_links l
   where l.chat_id = v_chat and iskra_private.reminders_owns_student(uid, l.student_id);
  delete from tg_link_codes c where c.student_id = p_student and c.used_at is null;
  update reminder_outbox o set status = 'cancelled', error = 'unlinked', updated_at = now()
   where o.status = 'queued'
     and not exists (select 1 from student_tg_links l where l.student_id = o.student_id);
end; $$;
revoke all on function public.tg_unlink(uuid) from public, anon;
grant execute on function public.tg_unlink(uuid) to authenticated;

-- Статус для карточки: подключён ли, кем, заблокирован ли бот; есть ли
-- живая ссылка.
create or replace function public.tg_link_status(p_student uuid)
returns table (linked boolean, username text, first_name text, linked_at timestamptz,
               blocked_at timestamptz, pending_until timestamptz)
language sql stable security definer set search_path = public as $$
  select l.student_id is not null, l.username, l.first_name, l.linked_at, l.blocked_at,
         (select max(c.expires_at) from tg_link_codes c
           where c.student_id = p_student and c.used_at is null and c.expires_at > now())
    from (select 1) one
    left join student_tg_links l on l.student_id = p_student
   where iskra_private.reminders_owns_student(auth.uid(), p_student)
$$;
revoke all on function public.tg_link_status(uuid) from public, anon;
grant execute on function public.tg_link_status(uuid) to authenticated;


-- ── 2. Правила учителя ──────────────────────────────────────────────────────

create table if not exists public.reminder_settings (
  teacher_id        uuid primary key references auth.users(id) on delete cascade,
  lesson_soon       boolean not null default true,
  lesson_offset_min integer not null default 60 check (lesson_offset_min in (30, 60, 120)),
  hw_due            boolean not null default true,
  hw_due_hour       integer not null default 18 check (hw_due_hour in (17, 18, 19)),
  hw_late           boolean not null default true,
  hw_late_max       integer not null default 3 check (hw_late_max in (1, 3, 5)),
  updated_at        timestamptz not null default now()
);
alter table public.reminder_settings enable row level security;
revoke all on public.reminder_settings from anon, authenticated;

-- Настройки с умолчаниями, даже если учитель их ещё не трогал.
create or replace function iskra_private.reminder_settings_of(p_teacher uuid)
returns public.reminder_settings language sql stable security definer set search_path = public as $$
  select coalesce(
    (select r from reminder_settings r where r.teacher_id = p_teacher),
    row(p_teacher, true, 60, true, 18, true, 3, now())::reminder_settings)
$$;
revoke all on function iskra_private.reminder_settings_of(uuid) from public, anon, authenticated;

create or replace function public.my_reminder_settings()
returns table (lesson_soon boolean, lesson_offset_min integer, hw_due boolean,
               hw_due_hour integer, hw_late boolean, hw_late_max integer)
language sql stable security definer set search_path = public as $$
  select s.lesson_soon, s.lesson_offset_min, s.hw_due, s.hw_due_hour, s.hw_late, s.hw_late_max
    from iskra_private.reminder_settings_of(auth.uid()) s
   where iskra_private.teacher_feature_on(auth.uid(), 'reminders')
$$;
revoke all on function public.my_reminder_settings() from public, anon;
grant execute on function public.my_reminder_settings() to authenticated;

create or replace function public.set_my_reminder_settings(
  p_lesson_soon boolean, p_lesson_offset_min integer, p_hw_due boolean,
  p_hw_due_hour integer, p_hw_late boolean, p_hw_late_max integer)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not iskra_private.teacher_feature_on(uid, 'reminders') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  insert into reminder_settings as r (teacher_id, lesson_soon, lesson_offset_min, hw_due, hw_due_hour, hw_late, hw_late_max)
  values (uid, p_lesson_soon, p_lesson_offset_min, p_hw_due, p_hw_due_hour, p_hw_late, p_hw_late_max)
  on conflict (teacher_id) do update set
    lesson_soon = excluded.lesson_soon, lesson_offset_min = excluded.lesson_offset_min,
    hw_due = excluded.hw_due, hw_due_hour = excluded.hw_due_hour,
    hw_late = excluded.hw_late, hw_late_max = excluded.hw_late_max, updated_at = now();
  -- Новое время/выключенный тип: стоящие строки пересоберёт планировщик.
  update reminder_outbox set status = 'cancelled', error = 'rules_changed', updated_at = now()
   where teacher_id = uid and status = 'queued';
  perform public.reminders_plan();
end; $$;
revoke all on function public.set_my_reminder_settings(boolean, integer, boolean, integer, boolean, integer) from public, anon;
grant execute on function public.set_my_reminder_settings(boolean, integer, boolean, integer, boolean, integer) to authenticated;


-- ── 3. Очередь и журнал ─────────────────────────────────────────────────────

create table if not exists public.reminder_outbox (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  kind        text not null check (kind in ('lesson_soon', 'hw_due', 'hw_late')),
  -- lesson_soon:{student}:{date}:{HH:MM} — дубли строк расписания (урок + запись)
  -- не дают второго сообщения; hw_due:{student}:{hw}; hw_late:{student}:{hw}:{n}.
  dedupe_key  text not null unique,
  send_at     timestamptz not null,
  status      text not null default 'queued'
              check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  schedule_id uuid,
  homework_id uuid,
  -- Урок: когда начинается (перенос/отмена гасит строку).
  starts_at   timestamptz,
  title       text not null,
  body        text not null,
  error       text,
  attempts    integer not null default 0,
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reminder_outbox_due_idx on public.reminder_outbox (send_at) where status in ('queued', 'sending');
create index if not exists reminder_outbox_teacher_idx on public.reminder_outbox (teacher_id, send_at desc);

alter table public.reminder_outbox enable row level security;
revoke all on public.reminder_outbox from anon, authenticated;
-- Учитель видит только свой журнал (виджет читает через reminders_today).
drop policy if exists reminder_outbox_teacher_read on public.reminder_outbox;
create policy reminder_outbox_teacher_read on public.reminder_outbox
  for select to authenticated using (teacher_id = (select auth.uid()));
grant select on public.reminder_outbox to authenticated;

-- ДЗ сдано (или на проверке/возвращено).
create or replace function iskra_private.reminders_hw_done(p_student uuid, p_hw uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lesson_progress lp
      join homework h on h.id = p_hw
      left join lessons l on l.id = h.lesson_id
     where lp.student_id = p_student
       and lp.lesson_ref in ('hw-' || p_hw::text, h.lesson_id::text, l.short_id)
       and lp.status in ('submitted', 'returned', 'completed'))
$$;
revoke all on function iskra_private.reminders_hw_done(uuid, uuid) from public, anon, authenticated;

-- Почему строка больше не должна уходить (null — всё в силе).
create or replace function iskra_private.reminder_stale_reason(r public.reminder_outbox, p_now timestamptz)
returns text language plpgsql stable security definer set search_path = public as $$
declare s public.reminder_settings; sl record; h record;
begin
  if not iskra_private.teacher_feature_on(r.teacher_id, 'reminders') then return 'feature_off'; end if;
  if not exists (select 1 from student_tg_links l where l.student_id = r.student_id and l.blocked_at is null) then
    return 'unlinked';
  end if;
  s := iskra_private.reminder_settings_of(r.teacher_id);
  if r.kind = 'lesson_soon' then
    if not s.lesson_soon then return 'rule_off'; end if;
    if r.starts_at is null or p_now >= r.starts_at then return 'too_late'; end if;
    select x.status, x.date, x.time_start into sl from schedule_lessons x where x.id = r.schedule_id;
    if not found or sl.status = 'cancelled' then return 'lesson_cancelled'; end if;
    if sl.time_start !~ '^\d{1,2}:\d{2}$'
       or ((sl.date + (sl.time_start || ':00')::interval) at time zone 'Europe/Moscow') <> r.starts_at then
      return 'lesson_moved';
    end if;
  else
    if r.kind = 'hw_due' and not s.hw_due then return 'rule_off'; end if;
    if r.kind = 'hw_late' and not s.hw_late then return 'rule_off'; end if;
    select x.status, x.due_date into h from homework x where x.id = r.homework_id;
    if not found or h.status is distinct from 'active' or h.due_date is null then return 'homework_closed'; end if;
    if iskra_private.reminders_hw_done(r.student_id, r.homework_id) then return 'homework_done'; end if;
    if r.kind = 'hw_due' and (p_now at time zone 'Europe/Moscow')::date >= h.due_date then return 'too_late'; end if;
    if r.kind = 'hw_late' and p_now - r.send_at > interval '12 hours' then return 'too_late'; end if;
  end if;
  return null;
end; $$;
revoke all on function iskra_private.reminder_stale_reason(public.reminder_outbox, timestamptz) from public, anon, authenticated;

-- Время отправки с тихими часами: раньше 07:00 по Москве — переносим на 07:00.
create or replace function iskra_private.reminders_quiet(p_at timestamptz)
returns timestamptz language sql stable set search_path = public as $$
  select case when (p_at at time zone 'Europe/Moscow')::time < time '07:00'
              then (((p_at at time zone 'Europe/Moscow')::date + time '07:00') at time zone 'Europe/Moscow')
              else p_at end
$$;

create or replace function iskra_private.reminders_lesson_lead(p_min integer)
returns text language sql immutable as $$
  select case p_min when 30 then 'Через 30 минут' when 120 then 'Через 2 часа' else 'Через час' end
$$;

-- Планировщик: строки на ближайшие сутки + гасит то, что уже не в силе.
create or replace function public.reminders_plan(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare v_added integer := 0; v_n integer;
        v_today date := (p_now at time zone 'Europe/Moscow')::date;
        v_horizon timestamptz := p_now + interval '26 hours';
begin
  -- Урок скоро.
  insert into reminder_outbox (teacher_id, student_id, kind, dedupe_key, send_at, schedule_id, starts_at, title, body)
  select distinct on (st.id, e.date, e.t0)
         e.teacher_id, st.id, 'lesson_soon',
         'lesson_soon:' || st.id || ':' || e.date || ':' || e.t0,
         e.send_at, e.id, e.starts_at,
         iskra_private.reminders_lesson_lead(e.offset_min) || ' урок',
         concat_ws(E'\n',
           concat_ws(' · ', nullif(btrim(coalesce(e.subject, '')), ''), e.t0),
           case when nullif(btrim(coalesce(e.lesson_title, '')), '') is not null
                then 'Тема: ' || btrim(e.lesson_title) end)
    from (
      select sl.*, lpad(sl.time_start, 5, '0') as t0,
             coalesce(g.created_by, ss.created_by) as teacher_id,
             rs.lesson_offset_min as offset_min,
             x.starts_at,
             iskra_private.reminders_quiet(x.starts_at - make_interval(mins => rs.lesson_offset_min)) as send_at
        from schedule_lessons sl
        left join groups g on g.id = sl.group_id
        left join students ss on ss.id = sl.student_id
        cross join lateral (select ((sl.date + (sl.time_start || ':00')::interval) at time zone 'Europe/Moscow') as starts_at) x
        cross join lateral iskra_private.reminder_settings_of(coalesce(g.created_by, ss.created_by)) rs
       where sl.status is distinct from 'cancelled'
         and sl.time_start ~ '^\d{1,2}:\d{2}$'
         and sl.date between v_today and v_today + 2
         and rs.lesson_soon
         and iskra_private.teacher_feature_on(coalesce(g.created_by, ss.created_by), 'reminders')
    ) e
    join students st on (e.group_id is not null and st.group_id = e.group_id) or st.id = e.student_id
    join student_tg_links lk on lk.student_id = st.id and lk.blocked_at is null
   where e.starts_at > p_now
     and e.send_at < e.starts_at
     and e.send_at > p_now - interval '10 minutes'
     and e.send_at <= v_horizon
   order by st.id, e.date, e.t0, e.id
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_added := v_added + v_n;

  -- ДЗ завтра: накануне срока в выбранный час, если не сдано.
  insert into reminder_outbox (teacher_id, student_id, kind, dedupe_key, send_at, homework_id, title, body)
  select h.created_by, st.id, 'hw_due', 'hw_due:' || st.id || ':' || h.id,
         x.send_at, h.id, 'ДЗ завтра',
         '«' || btrim(h.title) || '» — срок ' || to_char(h.due_date, 'DD.MM') || '. Ещё не сдано.'
    from homework h
    cross join lateral iskra_private.reminder_settings_of(h.created_by) rs
    cross join lateral (select (((h.due_date - 1) + make_time(rs.hw_due_hour, 0, 0)) at time zone 'Europe/Moscow') as send_at) x
    join students st on st.group_id = h.group_id
    join student_tg_links lk on lk.student_id = st.id and lk.blocked_at is null
   where h.status = 'active' and h.due_date between v_today and v_today + 2
     and rs.hw_due
     and iskra_private.teacher_feature_on(h.created_by, 'reminders')
     and x.send_at > p_now - interval '10 minutes' and x.send_at <= v_horizon
     and not iskra_private.reminders_hw_done(st.id, h.id)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_added := v_added + v_n;

  -- ДЗ просрочено: на следующий день после срока и далее раз в сутки в 10:00.
  insert into reminder_outbox (teacher_id, student_id, kind, dedupe_key, send_at, homework_id, title, body)
  select h.created_by, st.id, 'hw_late', 'hw_late:' || st.id || ':' || h.id || ':' || n,
         x.send_at, h.id, 'ДЗ просрочено',
         '«' || btrim(h.title) || '»: срок был ' || to_char(h.due_date, 'DD.MM') || '. Учитель ещё принимает — сдай, как сможешь.'
    from homework h
    cross join lateral iskra_private.reminder_settings_of(h.created_by) rs
    cross join lateral generate_series(1, rs.hw_late_max) n
    cross join lateral (select (((h.due_date + n) + time '10:00') at time zone 'Europe/Moscow') as send_at) x
    join students st on st.group_id = h.group_id
    join student_tg_links lk on lk.student_id = st.id and lk.blocked_at is null
   where h.status = 'active' and h.due_date between v_today - 6 and v_today
     and rs.hw_late
     and iskra_private.teacher_feature_on(h.created_by, 'reminders')
     and x.send_at > p_now - interval '10 minutes' and x.send_at <= v_horizon
     and not iskra_private.reminders_hw_done(st.id, h.id)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_added := v_added + v_n;

  -- То, что уже не в силе, гасим сразу, чтобы виджет не обещал лишнего.
  update reminder_outbox o
     set status = 'cancelled', error = iskra_private.reminder_stale_reason(o, p_now), updated_at = now()
   where o.status = 'queued' and iskra_private.reminder_stale_reason(o, p_now) is not null;

  -- Отправка оборвалась на полпути: вернуть в очередь (до 3 попыток).
  update reminder_outbox
     set status = case when attempts >= 3 then 'failed' else 'queued' end,
         error = case when attempts >= 3 then 'send_timeout' else error end, updated_at = now()
   where status = 'sending' and updated_at < p_now - interval '10 minutes';
  return v_added;
end; $$;
revoke all on function public.reminders_plan(timestamptz) from public, anon, authenticated;

-- Диспетчер (Edge Function reminders-send, service_role): забрать созревшие.
create or replace function public.reminders_claim(p_limit integer default 50)
returns table (id uuid, chat_id bigint, kind text, title text, body text)
language plpgsql security definer set search_path = public as $$
begin
  update reminder_outbox o
     set status = 'cancelled', error = iskra_private.reminder_stale_reason(o, now()), updated_at = now()
   where o.status = 'queued' and o.send_at <= now()
     and iskra_private.reminder_stale_reason(o, now()) is not null;

  return query
  with c as (
    select o.id from reminder_outbox o
     where o.status = 'queued' and o.send_at <= now()
     order by o.send_at
     limit greatest(1, least(p_limit, 200))
     for update skip locked
  ), u as (
    update reminder_outbox o set status = 'sending', attempts = o.attempts + 1, updated_at = now()
      from c where o.id = c.id
    returning o.id, o.student_id, o.kind, o.title, o.body
  )
  select u.id, l.chat_id, u.kind, u.title, u.body
    from u join student_tg_links l on l.student_id = u.student_id;
end; $$;
revoke all on function public.reminders_claim(integer) from public, anon, authenticated;

-- Итог отправки. p_retry — временная ошибка (429/5xx): обратно в очередь.
-- p_blocked — бот заблокирован / чат не найден: ссылка помечается, остальное
-- для этого ученика гаснет.
create or replace function public.reminders_mark(p_id uuid, p_ok boolean, p_error text default null,
                                                 p_blocked boolean default false, p_retry boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare r public.reminder_outbox;
begin
  select * into r from reminder_outbox where id = p_id;
  if not found then return; end if;
  if p_ok then
    update reminder_outbox set status = 'sent', sent_at = now(), error = null, updated_at = now() where id = p_id;
    return;
  end if;
  if p_retry and r.attempts < 3 then
    update reminder_outbox set status = 'queued', send_at = now() + interval '2 minutes',
           error = left(p_error, 300), updated_at = now() where id = p_id;
    return;
  end if;
  update reminder_outbox set status = 'failed', error = left(coalesce(p_error, 'unknown'), 300), updated_at = now()
   where id = p_id;
  if p_blocked then
    update student_tg_links set blocked_at = now()
     where chat_id = (select chat_id from student_tg_links where student_id = r.student_id);
    update reminder_outbox o set status = 'cancelled', error = 'blocked', updated_at = now()
     where o.status = 'queued'
       and o.student_id in (select l.student_id from student_tg_links l where l.blocked_at is not null);
  end if;
end; $$;
revoke all on function public.reminders_mark(uuid, boolean, text, boolean, boolean) from public, anon, authenticated;


-- ── 4. Виджет «Связь с учениками» ───────────────────────────────────────────

-- Что уйдёт сегодня (по Москве), что не дошло за 3 дня, кто подключил бота.
-- Ученик = человек: карточки одного person_id у учителя считаются один раз.
create or replace function public.reminders_today(p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
        v_today date := (p_now at time zone 'Europe/Moscow')::date;
        v_result jsonb;
begin
  if uid is null or not iskra_private.teacher_feature_on(uid, 'reminders') then return null; end if;
  with roster as (
    select distinct on (coalesce(s.person_id, s.id)) s.id, s.name, coalesce(s.person_id, s.id) as person,
           exists (select 1 from students s2 join student_tg_links l on l.student_id = s2.id and l.blocked_at is null
                    where coalesce(s2.person_id, s2.id) = coalesce(s.person_id, s.id) and s2.created_by = uid) as linked
      from students s
     where s.created_by = uid
     order by coalesce(s.person_id, s.id), s.created_at
  ), today as (
    select o.* from reminder_outbox o
     where o.teacher_id = uid and (o.send_at at time zone 'Europe/Moscow')::date = v_today
  ), upcoming as (
    select t.send_at, t.kind, t.title, t.body, count(*) as n,
           jsonb_agg(s.name order by s.name) as names
      from today t join students s on s.id = t.student_id
     where t.status in ('queued', 'sending')
     group by t.send_at, t.kind, t.title, t.body
  ), failed as (
    select o.id, o.student_id, s.name, o.kind, o.title, o.error, o.updated_at
      from reminder_outbox o join students s on s.id = o.student_id
     where o.teacher_id = uid and o.status = 'failed' and o.updated_at > p_now - interval '3 days'
     order by o.updated_at desc limit 20
  )
  select jsonb_build_object(
    'queued',   (select count(*) from today where status in ('queued', 'sending')),
    'sent',     (select count(*) from today where status = 'sent'),
    'next_at',  (select min(send_at) from today where status in ('queued', 'sending')),
    'upcoming', coalesce((select jsonb_agg(jsonb_build_object('at', u.send_at, 'kind', u.kind, 'title', u.title,
                                   'body', u.body, 'count', u.n, 'names', u.names) order by u.send_at) from upcoming u), '[]'::jsonb),
    'failed',   coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'student_id', f.student_id, 'name', f.name,
                                   'kind', f.kind, 'title', f.title, 'error', f.error, 'at', f.updated_at)) from failed f), '[]'::jsonb),
    'linked',   (select count(*) from roster where linked),
    'total',    (select count(*) from roster),
    'unlinked', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.name)
                            from roster r where not r.linked), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.reminders_today(timestamptz) from public, anon;
grant execute on function public.reminders_today(timestamptz) to authenticated;


-- ── 5. Расписание ───────────────────────────────────────────────────────────
-- Планировщик — чистый SQL раз в 5 минут. Диспетчер раз в минуту будит
-- reminders-send, только если есть созревшие строки и секрет в Vault.
create extension if not exists pg_net;

create or replace function public.reminders_dispatch()
returns void language plpgsql security definer set search_path = public as $$
declare fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/reminders-send';
        secret text;
begin
  if not exists (select 1 from reminder_outbox where status = 'queued' and send_at <= now()) then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'reminders_cron_secret' limit 1;
  if secret is null then
    raise notice 'reminders_cron_secret нет в Vault — отправка пропущена';
    return;
  end if;
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-reminders-secret', secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end; $$;
revoke all on function public.reminders_dispatch() from public, anon, authenticated;

select cron.unschedule('reminders-plan') where exists (select 1 from cron.job where jobname = 'reminders-plan');
select cron.unschedule('reminders-dispatch') where exists (select 1 from cron.job where jobname = 'reminders-dispatch');
select cron.schedule('reminders-plan', '*/5 * * * *', $$select public.reminders_plan()$$);
select cron.schedule('reminders-dispatch', '* * * * *', $$select public.reminders_dispatch()$$);
