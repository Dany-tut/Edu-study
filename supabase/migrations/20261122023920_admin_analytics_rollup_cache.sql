-- Keep the admin analytics overview off the 176 MB raw JSON event stream.
-- Compact rollups are maintained for new inserts and backfilled in bounded
-- batches by the existing nightly prune job.

create schema if not exists iskra_private;

create table if not exists iskra_private.analytics_overview_events (
  event_id bigint primary key,
  created_at timestamptz not null,
  role text,
  session_id text,
  actor_key text,
  student_id uuid
);
create index if not exists analytics_overview_events_role_created_idx
  on iskra_private.analytics_overview_events (role, created_at desc);
create index if not exists analytics_overview_events_created_student_idx
  on iskra_private.analytics_overview_events (created_at desc, student_id)
  where student_id is not null;

create table if not exists iskra_private.analytics_overview_sessions (
  role text not null,
  session_id text not null,
  last_seen timestamptz not null,
  primary key (role, session_id)
);
create index if not exists analytics_overview_sessions_seen_idx
  on iskra_private.analytics_overview_sessions (role, last_seen desc);

create table if not exists iskra_private.analytics_overview_actors (
  role text not null,
  actor_key text not null,
  last_seen timestamptz not null,
  primary key (role, actor_key)
);
create index if not exists analytics_overview_actors_seen_idx
  on iskra_private.analytics_overview_actors (role, last_seen desc);

create table if not exists iskra_private.analytics_overview_students (
  student_id uuid primary key,
  last_seen timestamptz not null
);
create index if not exists analytics_overview_students_seen_idx
  on iskra_private.analytics_overview_students (last_seen desc);

revoke all on iskra_private.analytics_overview_events, iskra_private.analytics_overview_sessions, iskra_private.analytics_overview_actors, iskra_private.analytics_overview_students from public, anon, authenticated;

create or replace function iskra_private.capture_analytics_overview_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := coalesce(new.user_id::text, new.student_id::text, new.session_id);
begin
  if new.created_at < now() - interval '90 days' then return new; end if;

  insert into iskra_private.analytics_overview_events
    (event_id, created_at, role, session_id, actor_key, student_id)
  values (new.id, new.created_at, new.role, new.session_id, v_actor, new.student_id)
  on conflict (event_id) do nothing;

  if new.role is not null and new.session_id is not null then
    insert into iskra_private.analytics_overview_sessions(role, session_id, last_seen)
    values (new.role, new.session_id, new.created_at)
    on conflict (role, session_id) do update
      set last_seen = greatest(iskra_private.analytics_overview_sessions.last_seen, excluded.last_seen);
  end if;
  if new.role is not null and v_actor is not null then
    insert into iskra_private.analytics_overview_actors(role, actor_key, last_seen)
    values (new.role, v_actor, new.created_at)
    on conflict (role, actor_key) do update
      set last_seen = greatest(iskra_private.analytics_overview_actors.last_seen, excluded.last_seen);
  end if;
  if new.student_id is not null then
    insert into iskra_private.analytics_overview_students(student_id, last_seen)
    values (new.student_id, new.created_at)
    on conflict (student_id) do update
      set last_seen = greatest(iskra_private.analytics_overview_students.last_seen, excluded.last_seen);
  end if;
  return new;
end;
$$;

drop trigger if exists analytics_overview_rollup_capture on public.analytics_events;
create trigger analytics_overview_rollup_capture
after insert on public.analytics_events
for each row execute function iskra_private.capture_analytics_overview_event();

create or replace function iskra_private.backfill_analytics_overview(p_limit integer default 5000)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with batch as materialized (
    select e.id, e.created_at, e.role, e.session_id,
           coalesce(e.user_id::text, e.student_id::text, e.session_id) as actor_key,
           e.student_id
    from public.analytics_events e
    left join iskra_private.analytics_overview_events cached on cached.event_id = e.id
    where cached.event_id is null
      and e.created_at >= now() - interval '90 days'
    order by e.id
    limit greatest(1, least(coalesce(p_limit, 5000), 10000))
  ), inserted as (
    insert into iskra_private.analytics_overview_events(event_id, created_at, role, session_id, actor_key, student_id)
    select id, created_at, role, session_id, actor_key, student_id from batch
    on conflict (event_id) do nothing
    returning created_at, role, session_id, actor_key, student_id
  ), sessions as (
    insert into iskra_private.analytics_overview_sessions(role, session_id, last_seen)
    select role, session_id, max(created_at) from inserted
    where role is not null and session_id is not null group by role, session_id
    on conflict (role, session_id) do update
      set last_seen = greatest(iskra_private.analytics_overview_sessions.last_seen, excluded.last_seen)
    returning 1
  ), actors as (
    insert into iskra_private.analytics_overview_actors(role, actor_key, last_seen)
    select role, actor_key, max(created_at) from inserted
    where role is not null and actor_key is not null group by role, actor_key
    on conflict (role, actor_key) do update
      set last_seen = greatest(iskra_private.analytics_overview_actors.last_seen, excluded.last_seen)
    returning 1
  ), students as (
    insert into iskra_private.analytics_overview_students(student_id, last_seen)
    select student_id, max(created_at) from inserted where student_id is not null group by student_id
    on conflict (student_id) do update
      set last_seen = greatest(iskra_private.analytics_overview_students.last_seen, excluded.last_seen)
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;
revoke all on function iskra_private.backfill_analytics_overview(integer) from public, anon, authenticated;

create or replace function iskra_private.prune_analytics_overview()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  delete from iskra_private.analytics_overview_events where created_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  delete from iskra_private.analytics_overview_sessions where last_seen < now() - interval '90 days';
  delete from iskra_private.analytics_overview_actors where last_seen < now() - interval '90 days';
  delete from iskra_private.analytics_overview_students where last_seen < now() - interval '90 days';
  return v_count;
end;
$$;
revoke all on function iskra_private.prune_analytics_overview() from public, anon, authenticated;

create or replace function public.prune_analytics()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  removed integer := 0;
  n integer;
begin
  delete from public.analytics_events
   where event in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '14 days';
  get diagnostics n = row_count;
  removed := removed + n;

  delete from public.analytics_events
   where event not in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  removed := removed + n;

  perform iskra_private.prune_analytics_overview();
  perform iskra_private.backfill_analytics_overview(5000);
  return removed;
end $$;

create or replace function public.admin_analytics_overview_by_role(
  p_role text,
  p_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  roles text[] := case when p_role = 'student' then array['student','anon'] else array['teacher','admin'] end;
  v_days int := greatest(1, least(coalesce(p_days, 30), 90));
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'events_total', (select count(*) from iskra_private.analytics_overview_events e
      where e.role = any(roles) and e.created_at > now() - make_interval(days => v_days) and e.created_at <= now()),
    'sessions', (select count(*) from iskra_private.analytics_overview_sessions s
      where s.role = any(roles) and s.last_seen > now() - make_interval(days => v_days) and s.last_seen <= now()),
    'dau', (select count(*) from iskra_private.analytics_overview_actors a
      where a.role = any(roles) and a.last_seen > now() - interval '1 day' and a.last_seen <= now()),
    'wau', (select count(*) from iskra_private.analytics_overview_actors a
      where a.role = any(roles) and a.last_seen > now() - interval '7 days' and a.last_seen <= now()),
    'mau', (select count(*) from iskra_private.analytics_overview_actors a
      where a.role = any(roles) and a.last_seen > now() - interval '30 days' and a.last_seen <= now()),
    'students_total', (select count(*) from public.students),
    'students_active', (select count(*) from iskra_private.analytics_overview_students s
      where s.last_seen > now() - interval '7 days' and s.last_seen <= now()),
    'groups_total', (select count(*) from public.groups)
  ) into result;
  return result;
end;
$$;
grant execute on function public.admin_analytics_overview_by_role(text, int) to authenticated;

-- Seed the cache with one bounded batch; the existing nightly prune job resumes
-- the idempotent backfill until all recent events are represented.
select iskra_private.backfill_analytics_overview(5000);
