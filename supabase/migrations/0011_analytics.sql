-- 0011_analytics.sql
-- Admin-only behavioural analytics: raw event stream + aggregation RPCs.
-- Collection is automatic (no consent banner); events carry ids + behaviour
-- only, never names/emails/PII. Read access is admin-only via RLS + RPC guard.

-- ── admin gate ──────────────────────────────────────────────────────────────
-- Matches the frontend check (user_metadata.role === 'admin'). NOTE for later
-- hardening: user_metadata is self-editable; move admin flag to app_metadata or
-- a dedicated admins table if escalation becomes a concern.
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'app_metadata'  ->> 'role') = 'admin',
    false
  );
$$;

-- ── raw event stream ────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,                 -- auth user (teacher/admin), null for students
  student_id  uuid,                 -- students.id for student sessions
  role        text,                 -- 'student' | 'teacher' | 'admin' | 'anon'
  session_id  text,                 -- client-generated per-tab session id
  event       text not null,        -- session_start | page_view | action | heartbeat ...
  path        text,                 -- route / page key
  meta        jsonb not null default '{}'::jsonb,
  ua          text                  -- user agent (coarse device/browser)
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_idx   on public.analytics_events (event);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_student_idx on public.analytics_events (student_id);
create index if not exists analytics_events_user_idx    on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

-- Anyone (incl. anon students on the publishable key) may write their own
-- events — this is the automatic-collection beacon. No one but admins can read.
drop policy if exists "analytics insert any" on public.analytics_events;
create policy "analytics insert any" on public.analytics_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists "analytics admin read" on public.analytics_events;
create policy "analytics admin read" on public.analytics_events
  for select to authenticated
  using (public.is_admin());

-- ── aggregation RPCs (admin-guarded, security definer) ──────────────────────
-- Identity for active-user counts: prefer auth user, then student, then session.

create or replace function public.admin_analytics_overview(p_days int default 30)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'events_total',   (select count(*) from analytics_events where created_at > now() - make_interval(days => p_days)),
    'sessions',       (select count(distinct session_id) from analytics_events where created_at > now() - make_interval(days => p_days)),
    'dau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id)) from analytics_events where created_at > now() - interval '1 day'),
    'wau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id)) from analytics_events where created_at > now() - interval '7 days'),
    'mau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id)) from analytics_events where created_at > now() - interval '30 days'),
    'students_total', (select count(*) from students),
    'students_active',(select count(distinct student_id) from analytics_events where student_id is not null and created_at > now() - interval '7 days'),
    'groups_total',   (select count(*) from groups)
  ) into result;
  return result;
end; $$;

-- Day-of-week (0=Sun) × hour grid, Moscow time.
create or replace function public.admin_activity_heatmap(p_days int default 30)
returns table(dow int, hour int, cnt bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select extract(dow  from (created_at at time zone 'Europe/Moscow'))::int,
           extract(hour from (created_at at time zone 'Europe/Moscow'))::int,
           count(*)::bigint
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
    group by 1, 2;
end; $$;

create or replace function public.admin_daily_activity(p_days int default 30)
returns table(day date, events bigint, users bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select (created_at at time zone 'Europe/Moscow')::date as day,
           count(*)::bigint as events,
           count(distinct coalesce(user_id::text, student_id::text, session_id))::bigint as users
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
    group by 1
    order by 1;
end; $$;

create or replace function public.admin_event_breakdown(p_days int default 30)
returns table(event text, cnt bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.event, count(*)::bigint
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
    group by ae.event
    order by 2 desc;
end; $$;

-- Funnel from existing data — works immediately, before any events land.
-- lesson_progress.status: unviewed → current → submitted → completed
create or replace function public.admin_progress_funnel()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'assigned',  (select count(*) from lesson_progress),
    'started',   (select count(*) from lesson_progress where status in ('current','submitted','completed')),
    'submitted', (select count(*) from lesson_progress where status in ('submitted','completed')),
    'completed', (select count(*) from lesson_progress where status = 'completed')
  ) into result;
  return result;
end; $$;
