-- Отчёт родителю (функция parent_report, концепт «Связь» → «Итог»).
--
-- Раз в неделю учитель отправляет родителю короткий честный итог: уроки,
-- домашние работы, средний балл и две фразы — «Получается» и «Работаем над».
-- Аккаунта у родителя нет и не будет: отчёт приходит текстом в Telegram
-- (родитель подключает бота по коду /start p_<код>) или открывается по
-- постоянной ссылке /#/r/<токен> без входа.
--
-- Порядок недели (время московское):
--   пт 17:00 — parent_reports_build_all(): цифры недели + черновики фраз
--              (правила, не ИИ). Флаги ставит правило, а не модель:
--              absent_2 — пропущено ≥ 2 уроков, drop_15 — балл упал ≥ 15 п.п.,
--              thin_data — меньше 2 событий за неделю, new_student — первые
--              2 недели ученика, first_weeks — первые 2 недели учителя с
--              отчётами (все на проверку), no_channel — родитель не подключён.
--   учитель — правит фразы, утверждает пачкой «готовые» и по одному отмеченные;
--   вс 18:00 — run_parent_reports_send() → edge parent-report (mode send):
--              утверждённые уходят в Telegram; без Telegram отчёт виден по
--              ссылке. Статусы: draft → approved → sent / failed; skipped.
--
-- Сервер держит правило доступа: все ручки проверяют
-- iskra_private.teacher_feature_on(uid, 'parent_report'); сборка и отправка
-- берут только учителей с включённой функцией; страница по ссылке пуста,
-- если функцию у учителя забрали.
--
-- Таблицы закрыты от anon/authenticated целиком: чтение и запись только через
-- функции ниже (security definer). Токен ссылки хранится только как sha256.

-- ── 1. Таблицы ──────────────────────────────────────────────────────────────

create table if not exists public.parent_contacts (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students(id) on delete cascade,
  teacher_id           uuid not null references auth.users(id) on delete cascade,
  name                 text not null check (length(btrim(name)) between 1 and 80),
  relation             text check (relation is null or length(relation) <= 40),
  -- Одноразовый код приглашения в бота: t.me/<бот>?start=p_<код>.
  link_code            text unique check (link_code is null or link_code ~ '^[a-z0-9]{10,32}$'),
  link_code_expires_at timestamptz,
  tg_chat_id           bigint,
  tg_linked_at         timestamptz,
  stopped_at           timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists parent_contacts_student_idx on public.parent_contacts (student_id);
create index if not exists parent_contacts_chat_idx on public.parent_contacts (tg_chat_id) where tg_chat_id is not null;

create table if not exists public.parent_reports (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1),
  stats       jsonb not null default '{}'::jsonb,
  strengths   text check (strengths is null or length(strengths) <= 600),
  focus       text check (focus is null or length(focus) <= 600),
  -- Учитель правил фразы — пересборка цифр их больше не трогает.
  edited_at   timestamptz,
  flags       text[] not null default '{}',
  status      text not null default 'draft'
              check (status in ('draft','approved','skipped','sent','failed')),
  approved_at timestamptz,
  sent_at     timestamptz,
  send_error  text,
  delivered   jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, week_start)
);
create index if not exists parent_reports_teacher_week_idx on public.parent_reports (teacher_id, week_start);
create index if not exists parent_reports_approved_idx on public.parent_reports (status) where status = 'approved';

create table if not exists public.parent_report_links (
  token_hash   bytea primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  teacher_id   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  last_seen_at timestamptz
);
create index if not exists parent_report_links_student_idx on public.parent_report_links (student_id) where revoked_at is null;

alter table public.parent_contacts     enable row level security;
alter table public.parent_reports      enable row level security;
alter table public.parent_report_links enable row level security;
revoke all on public.parent_contacts     from anon, authenticated;
revoke all on public.parent_reports      from anon, authenticated;
revoke all on public.parent_report_links from anon, authenticated;


-- ── 2. Общие проверки ───────────────────────────────────────────────────────

-- Учитель вошёл, прошёл MFA (если она у него есть) и функция включена.
create or replace function iskra_private.parent_report_guard()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not public.mfa_ok() then raise exception 'mfa required' using errcode = '42501'; end if;
  if not iskra_private.teacher_feature_on(uid, 'parent_report') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  return uid;
end; $$;

-- Ученик принадлежит учителю.
create or replace function iskra_private.parent_report_own_student(p_uid uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from students s where s.id = p_student and s.created_by = p_uid)
$$;

-- Понедельник недели по Москве.
create or replace function iskra_private.parent_report_week(p_day date)
returns date language sql immutable as $$
  select p_day - (extract(isodow from p_day)::int - 1)
$$;

-- Случайный код [a-z0-9].
create or replace function iskra_private.parent_report_code(p_len int)
returns text language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '')
    from (select extensions.gen_random_bytes(p_len) b) r, generate_series(0, p_len - 1) i
$$;

revoke all on function iskra_private.parent_report_guard() from public, anon, authenticated;
revoke all on function iskra_private.parent_report_own_student(uuid, uuid) from public, anon, authenticated;
revoke all on function iskra_private.parent_report_week(date) from public, anon, authenticated;
revoke all on function iskra_private.parent_report_code(int) from public, anon, authenticated;


-- ── 3. Сборка недели ────────────────────────────────────────────────────────

-- Цифры недели одного ученика. Время работ — по Москве.
create or replace function iskra_private.parent_report_stats(p_student uuid, p_week date)
returns jsonb language sql stable security definer set search_path = public as $$
  with
  att as (
    select a.lesson_date, a.present, a.grade, coalesce(nullif(btrim(a.lesson_title), ''), null) title
      from lesson_attendance a
     where a.student_id = p_student and a.lesson_date between p_week and p_week + 6
  ),
  work as (
    select lp.status, lp.score
      from lesson_progress lp
     where lp.student_id = p_student
       and lp.status in ('submitted', 'completed', 'returned')
       and (lp.updated_at at time zone 'Europe/Moscow')::date between p_week and p_week + 6
  ),
  prev as (
    select round(avg(lp.score))::int v
      from lesson_progress lp
     where lp.student_id = p_student and lp.status = 'completed' and lp.score is not null
       and (lp.updated_at at time zone 'Europe/Moscow')::date between p_week - 7 and p_week - 1
  )
  select jsonb_build_object(
    'week_start', p_week,
    'child', split_part(btrim(s.name), ' ', 1),
    'subject', coalesce(g.subject, ''),
    'lessons_total', (select count(*) from att),
    'lessons_attended', (select count(*) from att where present),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object('date', lesson_date, 'title', title, 'present', present, 'grade', grade)
                                           order by lesson_date) from att), '[]'::jsonb),
    'hw_done', (select count(*) from work where status in ('submitted', 'completed')),
    'hw_checked', (select count(*) from work where status = 'completed'),
    'hw_returned', (select count(*) from work where status = 'returned'),
    'avg_pct', (select round(avg(score))::int from work where status = 'completed' and score is not null),
    'prev_avg_pct', (select v from prev),
    'new_student', coalesce(s.started_at, s.created_at::date) > p_week - 14
  )
  from students s left join groups g on g.id = s.group_id
  where s.id = p_student
$$;

-- Черновики фраз по правилам. Только факты недели; о пропусках и падении
-- балла правило молчит — это решает учитель (флаг ставится отдельно).
create or replace function iskra_private.parent_report_phrases(p jsonb, out strengths text, out focus text)
language plpgsql immutable as $$
declare
  total int := coalesce((p->>'lessons_total')::int, 0);
  came  int := coalesce((p->>'lessons_attended')::int, 0);
  done  int := coalesce((p->>'hw_done')::int, 0);
  back  int := coalesce((p->>'hw_returned')::int, 0);
  avg_  int := (p->>'avg_pct')::int;
  prev_ int := (p->>'prev_avg_pct')::int;
  s text[] := '{}'; f text[] := '{}';
begin
  if total > 0 and came = total then s := array_append(s, format('Все уроки недели посещены: %s из %s.', came, total)); end if;
  if avg_ is not null and prev_ is not null and avg_ - prev_ >= 10 then
    s := array_append(s, format('Средний балл вырос: %s%% → %s%%.', prev_, avg_));
  elsif avg_ is not null and avg_ >= 80 then
    s := array_append(s, format('Средний балл за работы — %s%%.', avg_));
  end if;
  if done > 0 and back = 0 then s := array_append(s, format('Сдано работ за неделю: %s.', done)); end if;
  if back > 0 then f := array_append(f, format('Работ на доработке: %s.', back)); end if;
  if avg_ is not null and avg_ < 60 then f := array_append(f, 'Подтягиваем точность в работах.'); end if;
  strengths := nullif(array_to_string(s, ' '), '');
  focus := nullif(array_to_string(f, ' '), '');
end; $$;

-- Флаги по правилам.
create or replace function iskra_private.parent_report_flags(p_teacher uuid, p_student uuid, p_week date, p jsonb)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  total int := coalesce((p->>'lessons_total')::int, 0);
  came  int := coalesce((p->>'lessons_attended')::int, 0);
  done  int := coalesce((p->>'hw_done')::int, 0);
  avg_  int := (p->>'avg_pct')::int;
  prev_ int := (p->>'prev_avg_pct')::int;
  fl text[] := '{}';
begin
  if total - came >= 2 then fl := array_append(fl, 'absent_2'); end if;
  if avg_ is not null and prev_ is not null and prev_ - avg_ >= 15 then fl := array_append(fl, 'drop_15'); end if;
  if total + done < 2 then fl := array_append(fl, 'thin_data'); end if;
  if coalesce((p->>'new_student')::boolean, false) then fl := array_append(fl, 'new_student'); end if;
  if (select count(distinct r.week_start) from parent_reports r
       where r.teacher_id = p_teacher and r.week_start < p_week
         and r.status in ('approved', 'sent', 'failed', 'skipped')) < 2 then
    fl := array_append(fl, 'first_weeks');
  end if;
  if not exists (select 1 from parent_contacts c where c.student_id = p_student
                  and c.tg_chat_id is not null and c.stopped_at is null)
     and not exists (select 1 from parent_report_links l where l.student_id = p_student and l.revoked_at is null) then
    fl := array_append(fl, 'no_channel');
  end if;
  return fl;
end; $$;

-- Собрать неделю учителя. Ученики — с активностью за 4 недели или с
-- подключённым родителем. Утверждённые/отправленные отчёты не трогает;
-- у черновика обновляет цифры и флаги, фразы — только если учитель их не правил.
create or replace function iskra_private.parent_reports_build(p_teacher uuid, p_week date)
returns int language plpgsql security definer set search_path = public as $$
declare st record; p jsonb; ph record; n int := 0;
begin
  if extract(isodow from p_week) <> 1 then raise exception 'week must start on Monday'; end if;
  for st in
    select s.id from students s
     where s.created_by = p_teacher
       and (exists (select 1 from lesson_attendance a where a.student_id = s.id
                     and a.lesson_date between p_week - 21 and p_week + 6)
            or exists (select 1 from lesson_progress lp where lp.student_id = s.id
                        and lp.status in ('submitted', 'completed', 'returned')
                        and lp.updated_at >= (p_week - 21)::timestamptz)
            or exists (select 1 from parent_contacts c where c.student_id = s.id and c.stopped_at is null))
  loop
    p := iskra_private.parent_report_stats(st.id, p_week);
    select * into ph from iskra_private.parent_report_phrases(p);
    insert into parent_reports (student_id, teacher_id, week_start, stats, strengths, focus, flags)
    values (st.id, p_teacher, p_week, p, ph.strengths, ph.focus,
            iskra_private.parent_report_flags(p_teacher, st.id, p_week, p))
    on conflict (student_id, week_start) do update
       set stats = excluded.stats,
           flags = excluded.flags,
           strengths = case when parent_reports.edited_at is null then excluded.strengths else parent_reports.strengths end,
           focus     = case when parent_reports.edited_at is null then excluded.focus else parent_reports.focus end,
           updated_at = now()
     where parent_reports.status = 'draft' and parent_reports.teacher_id = p_teacher;
    n := n + 1;
  end loop;
  return n;
end; $$;

revoke all on function iskra_private.parent_report_stats(uuid, date) from public, anon, authenticated;
revoke all on function iskra_private.parent_report_phrases(jsonb) from public, anon, authenticated;
revoke all on function iskra_private.parent_report_flags(uuid, uuid, date, jsonb) from public, anon, authenticated;
revoke all on function iskra_private.parent_reports_build(uuid, date) from public, anon, authenticated;

-- Cron: все учителя с включённой функцией, текущая неделя по Москве.
create or replace function public.parent_reports_build_all()
returns int language plpgsql security definer set search_path = public as $$
declare t uuid; n int := 0;
  wk date := iskra_private.parent_report_week((now() at time zone 'Europe/Moscow')::date);
begin
  for t in select distinct s.created_by from students s
            where s.created_by is not null
              and iskra_private.teacher_feature_on(s.created_by, 'parent_report') loop
    n := n + iskra_private.parent_reports_build(t, wk);
  end loop;
  return n;
end; $$;
revoke all on function public.parent_reports_build_all() from public, anon, authenticated;


-- ── 4. Ручки учителя ────────────────────────────────────────────────────────

-- Собрать (или обновить цифры) своей недели вручную.
create or replace function public.parent_reports_build_mine(p_week date)
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard();
begin
  if p_week > (now() at time zone 'Europe/Moscow')::date then raise exception 'future week'; end if;
  return iskra_private.parent_reports_build(uid, iskra_private.parent_report_week(p_week));
end; $$;

-- Неделя учителя: отчёты с контактами и наличием ссылки.
create or replace function public.parent_reports_week(p_week date)
returns table (
  id uuid, student_id uuid, student_name text, week_start date, stats jsonb,
  strengths text, focus text, flags text[], status text,
  approved_at timestamptz, sent_at timestamptz, send_error text, delivered jsonb,
  contacts jsonb, has_link boolean
) language plpgsql stable security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard();
begin
  return query
    select r.id, r.student_id, s.name, r.week_start, r.stats, r.strengths, r.focus, r.flags, r.status,
           r.approved_at, r.sent_at, r.send_error, r.delivered,
           coalesce((select jsonb_agg(jsonb_build_object(
                       'id', c.id, 'name', c.name, 'relation', c.relation,
                       'linked', c.tg_chat_id is not null, 'stopped', c.stopped_at is not null,
                       'pending', c.tg_chat_id is null and c.link_code is not null and c.link_code_expires_at > now())
                     order by c.created_at)
                       from parent_contacts c where c.student_id = r.student_id), '[]'::jsonb),
           exists (select 1 from parent_report_links l where l.student_id = r.student_id and l.revoked_at is null)
      from parent_reports r join students s on s.id = r.student_id
     where r.teacher_id = uid and s.created_by = uid
       and r.week_start = iskra_private.parent_report_week(p_week)
     order by s.name;
end; $$;

-- Правка фраз. После отправки текст не меняется.
create or replace function public.parent_report_save(p_id uuid, p_strengths text, p_focus text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard();
begin
  update parent_reports
     set strengths = nullif(btrim(left(coalesce(p_strengths, ''), 600)), ''),
         focus     = nullif(btrim(left(coalesce(p_focus, ''), 600)), ''),
         edited_at = now(), updated_at = now()
   where id = p_id and teacher_id = uid and status in ('draft', 'approved', 'failed');
  if not found then raise exception 'report not editable' using errcode = 'P0002'; end if;
end; $$;

-- Решение учителя: approve (в очередь на воскресенье), skip (пропустить неделю),
-- reopen (вернуть в черновик). Возвращает id, к которым действие применилось.
create or replace function public.parent_report_decide(p_ids uuid[], p_action text)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard(); done uuid[];
begin
  if coalesce(array_length(p_ids, 1), 0) > 300 then raise exception 'too_many'; end if;
  if p_action = 'approve' then
    with u as (update parent_reports set status = 'approved', approved_at = now(), send_error = null, updated_at = now()
                where id = any(p_ids) and teacher_id = uid and status in ('draft', 'failed') returning id)
    select coalesce(array_agg(id), '{}') into done from u;
  elsif p_action = 'skip' then
    with u as (update parent_reports set status = 'skipped', updated_at = now()
                where id = any(p_ids) and teacher_id = uid and status in ('draft', 'approved', 'failed') returning id)
    select coalesce(array_agg(id), '{}') into done from u;
  elsif p_action = 'reopen' then
    with u as (update parent_reports set status = 'draft', approved_at = null, updated_at = now()
                where id = any(p_ids) and teacher_id = uid and status in ('approved', 'skipped', 'failed') returning id)
    select coalesce(array_agg(id), '{}') into done from u;
  else
    raise exception 'unknown action %', p_action;
  end if;
  return done;
end; $$;

-- Сводка для виджета: неделя, готовые, требующие решения, утверждённые, отправленные, не дошедшие.
create or replace function public.parent_reports_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard();
  wk date := iskra_private.parent_report_week((now() at time zone 'Europe/Moscow')::date);
begin
  return (
    select jsonb_build_object(
      'week_start', wk,
      'total', count(*),
      'ready', count(*) filter (where r.status = 'draft' and cardinality(r.flags) = 0),
      'flagged', count(*) filter (where r.status = 'draft' and cardinality(r.flags) > 0),
      'approved', count(*) filter (where r.status = 'approved'),
      'sent', count(*) filter (where r.status = 'sent'),
      'failed', count(*) filter (where r.status = 'failed'),
      'ready_ids', coalesce(jsonb_agg(r.id) filter (where r.status = 'draft' and cardinality(r.flags) = 0), '[]'::jsonb),
      'attention', coalesce((select jsonb_agg(x order by x->>'name') from (
          select jsonb_build_object('id', r2.id, 'name', s2.name, 'flags', to_jsonb(r2.flags), 'status', r2.status) x
            from parent_reports r2 join students s2 on s2.id = r2.student_id
           where r2.teacher_id = uid and r2.week_start = wk
             and ((r2.status = 'draft' and cardinality(r2.flags) > 0) or r2.status = 'failed')
           limit 8) q), '[]'::jsonb))
      from parent_reports r
     where r.teacher_id = uid and r.week_start = wk);
end; $$;

-- Контакт родителя: имя и кем приходится. Возвращает код приглашения в бота.
create or replace function public.parent_contact_add(p_student uuid, p_name text, p_relation text default null)
returns table (id uuid, code text) language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard(); new_id uuid; c text;
begin
  if not iskra_private.parent_report_own_student(uid, p_student) then
    raise exception 'not your student' using errcode = '42501';
  end if;
  if (select count(*) from parent_contacts pc where pc.student_id = p_student) >= 4 then raise exception 'too_many'; end if;
  c := iskra_private.parent_report_code(12);
  insert into parent_contacts (student_id, teacher_id, name, relation, link_code, link_code_expires_at)
  values (p_student, uid, btrim(left(p_name, 80)), nullif(btrim(left(coalesce(p_relation, ''), 40)), ''), c, now() + interval '14 days')
  returning parent_contacts.id into new_id;
  -- Отчёты недели больше не «без канала», если появится Telegram; флаг
  -- пересчитает следующая сборка.
  return query select new_id, c;
end; $$;

-- Новый код приглашения (старый перестаёт работать).
create or replace function public.parent_contact_code(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard(); c text := iskra_private.parent_report_code(12);
begin
  update parent_contacts set link_code = c, link_code_expires_at = now() + interval '14 days'
   where id = p_id and teacher_id = uid;
  if not found then raise exception 'contact not found' using errcode = 'P0002'; end if;
  return c;
end; $$;

create or replace function public.parent_contact_remove(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard();
begin
  delete from parent_contacts where id = p_id and teacher_id = uid;
end; $$;

-- Постоянная ссылка на страницу отчётов ученика. Токен возвращается один раз.
create or replace function public.parent_report_link_create(p_student uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := iskra_private.parent_report_guard(); tok text;
begin
  if not iskra_private.parent_report_own_student(uid, p_student) then
    raise exception 'not your student' using errcode = '42501';
  end if;
  if (select count(*) from parent_report_links l where l.student_id = p_student and l.revoked_at is null) >= 5 then
    raise exception 'too_many';
  end if;
  tok := iskra_private.parent_report_code(24);
  insert into parent_report_links (token_hash, student_id, teacher_id)
  values (extensions.digest(tok, 'sha256'), p_student, uid);
  update parent_reports set flags = array_remove(flags, 'no_channel'), updated_at = now()
   where student_id = p_student and status = 'draft';
  return tok;
end; $$;

create or replace function public.parent_report_links_revoke(p_student uuid)
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := iskra_private.parent_report_guard(); n int;
begin
  update parent_report_links set revoked_at = now()
   where student_id = p_student and teacher_id = uid and revoked_at is null;
  get diagnostics n = row_count;
  return n;
end; $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.parent_reports_build_mine(date)', 'public.parent_reports_week(date)',
    'public.parent_report_save(uuid, text, text)', 'public.parent_report_decide(uuid[], text)',
    'public.parent_reports_summary()', 'public.parent_contact_add(uuid, text, text)',
    'public.parent_contact_code(uuid)', 'public.parent_contact_remove(uuid)',
    'public.parent_report_link_create(uuid)', 'public.parent_report_links_revoke(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;


-- ── 5. Сервер: бот, отправка, страница по ссылке (только service_role) ─────

-- /start p_<код>: привязать чат родителя. Возвращает имена для приветствия.
create or replace function public.parent_contact_link_chat(p_code text, p_chat bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  update parent_contacts set tg_chat_id = p_chat, tg_linked_at = now(), stopped_at = null,
         link_code = null, link_code_expires_at = null
   where link_code = lower(p_code) and link_code_expires_at > now()
     and iskra_private.teacher_feature_on(teacher_id, 'parent_report')
  returning * into c;
  if c.id is null then return null; end if;
  update parent_reports set flags = array_remove(flags, 'no_channel'), updated_at = now()
   where student_id = c.student_id and status = 'draft';
  return jsonb_build_object(
    'parent', c.name,
    'child', (select split_part(btrim(s.name), ' ', 1) from students s where s.id = c.student_id),
    'teacher', (select coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), 'Ваш преподаватель')
                  from auth.users u where u.id = c.teacher_id));
end; $$;

-- /stop: отписать все родительские подписки этого чата.
create or replace function public.parent_contact_stop_chat(p_chat bigint)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update parent_contacts set stopped_at = now() where tg_chat_id = p_chat and stopped_at is null;
  get diagnostics n = row_count;
  return n;
end; $$;

-- Утверждённые отчёты к отправке (учителя с включённой функцией).
create or replace function public.parent_reports_due(p_teacher uuid default null)
returns table (id uuid, teacher_id uuid, teacher_name text, stats jsonb, strengths text, focus text,
               chats bigint[], has_link boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.teacher_id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), 'Ваш преподаватель'),
         r.stats, r.strengths, r.focus,
         coalesce((select array_agg(c.tg_chat_id) from parent_contacts c
                    where c.student_id = r.student_id and c.tg_chat_id is not null and c.stopped_at is null), '{}'),
         exists (select 1 from parent_report_links l where l.student_id = r.student_id and l.revoked_at is null)
    from parent_reports r
    join auth.users u on u.id = r.teacher_id
   where r.status = 'approved'
     and (p_teacher is null or r.teacher_id = p_teacher)
     and iskra_private.teacher_feature_on(r.teacher_id, 'parent_report')
   order by r.approved_at
   limit 500
$$;

create or replace function public.parent_report_mark(p_id uuid, p_ok boolean, p_error text, p_delivered jsonb)
returns void language sql security definer set search_path = public as $$
  update parent_reports
     set status = case when p_ok then 'sent' else 'failed' end,
         sent_at = case when p_ok then now() else sent_at end,
         send_error = case when p_ok then null else left(p_error, 200) end,
         delivered = p_delivered, updated_at = now()
   where id = p_id and status = 'approved'
$$;

-- Страница по ссылке: имя ребёнка (без фамилии), предмет, учитель и
-- отправленные недели. Ни других учеников, ни контактов.
create or replace function public.parent_report_page(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare l record;
begin
  if p_token is null or p_token !~ '^[a-z0-9]{24}$' then return null; end if;
  update parent_report_links set last_seen_at = now()
   where token_hash = extensions.digest(p_token, 'sha256') and revoked_at is null
  returning * into l;
  if l.token_hash is null or not iskra_private.teacher_feature_on(l.teacher_id, 'parent_report') then return null; end if;
  return jsonb_build_object(
    'child', (select split_part(btrim(s.name), ' ', 1) from students s where s.id = l.student_id),
    'subject', (select coalesce(g.subject, '') from students s left join groups g on g.id = s.group_id where s.id = l.student_id),
    'teacher', (select coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), 'Преподаватель') from auth.users u where u.id = l.teacher_id),
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('week_start', r.week_start, 'stats', r.stats - 'child',
                                                           'strengths', r.strengths, 'focus', r.focus)
                                        order by r.week_start desc)
                         from (select * from parent_reports r0
                                where r0.student_id = l.student_id and r0.teacher_id = l.teacher_id and r0.status = 'sent'
                                order by r0.week_start desc limit 12) r), '[]'::jsonb));
end; $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.parent_contact_link_chat(text, bigint)', 'public.parent_contact_stop_chat(bigint)',
    'public.parent_reports_due(uuid)', 'public.parent_report_mark(uuid, boolean, text, jsonb)',
    'public.parent_report_page(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;


-- ── 6. Расписание ───────────────────────────────────────────────────────────

create extension if not exists pg_net;

-- Воскресенье: edge-функция отправляет утверждённые. Секрет cron — тот же
-- analytics_digest_secret в Vault, что у разбора аналитики и обратной связи.
create or replace function public.run_parent_reports_send()
returns void language plpgsql security definer set search_path = public as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/parent-report';
  secret text;
begin
  if not exists (select 1 from parent_reports where status = 'approved') then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'analytics_digest_secret' limit 1;
  if secret is null then
    raise notice 'analytics_digest_secret нет в Vault — отправка отчётов пропущена';
    return;
  end if;
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', secret),
    body := jsonb_build_object('mode', 'send'),
    timeout_milliseconds := 120000);
end; $$;
revoke all on function public.run_parent_reports_send() from public, anon, authenticated;

select cron.unschedule('parent-reports-build') where exists (select 1 from cron.job where jobname = 'parent-reports-build');
select cron.unschedule('parent-reports-send')  where exists (select 1 from cron.job where jobname = 'parent-reports-send');
-- Пятница 14:00 UTC = 17:00 МСК — сборка; воскресенье 15:00 UTC = 18:00 МСК — отправка.
select cron.schedule('parent-reports-build', '0 14 * * 5', $$select public.parent_reports_build_all()$$);
select cron.schedule('parent-reports-send',  '0 15 * * 0', $$select public.run_parent_reports_send()$$);
