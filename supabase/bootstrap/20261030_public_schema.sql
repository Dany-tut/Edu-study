--
-- PostgreSQL database dump
--

\restrict K6iu0je7o2YEVzK0CeeoZVKyd5sYL8BbxKs3B9nONHGB5kudKOrSZwqiJYZub1P

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _hhmm_diff(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._hhmm_diff(p_from text, p_to text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $_$
  select case when p_from ~ '^\d{1,2}:\d{2}$' and p_to ~ '^\d{1,2}:\d{2}$'
    then (extract(epoch from (p_to || ':00')::interval - (p_from || ':00')::interval) / 60)::int end
$_$;


--
-- Name: _hhmm_plus(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._hhmm_plus(p_time text, p_min integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  select case when p_time ~ '^\d{1,2}:\d{2}$'
    then to_char(time '00:00' + (p_time || ':00')::interval + make_interval(mins => p_min), 'HH24:MI') end
$_$;


--
-- Name: _schedule_label(date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_label(p_date date, p_time text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select to_char(p_date, 'DD.MM') || coalesce(' в ' || p_time, '')
$$;


--
-- Name: _schedule_notify(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_notify(p_row uuid, p_type text, p_title text, p_body text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into notifications (recipient_id, recipient_role, type, title, body, link)
  select st, 'student', p_type, p_title, p_body, jsonb_build_object('scheduleId', p_row)
  from schedule_lessons r, _schedule_students(r.group_id, r.student_id) st
  where r.id = p_row
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: schedule_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    date date NOT NULL,
    time_start text NOT NULL,
    subject text NOT NULL,
    lesson_title text DEFAULT ''::text NOT NULL,
    lesson_number integer DEFAULT 1,
    time_end text DEFAULT '10:30'::text NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    lesson_id uuid,
    student_id uuid,
    node_type text DEFAULT 'lesson'::text NOT NULL,
    CONSTRAINT schedule_lessons_node_type_chk CHECK ((node_type = ANY (ARRAY['lesson'::text, 'rec'::text]))),
    CONSTRAINT schedule_lessons_scope_chk CHECK (((group_id IS NOT NULL) OR (student_id IS NOT NULL))),
    CONSTRAINT schedule_lessons_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'live'::text, 'upcoming'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN schedule_lessons.lesson_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_lessons.lesson_id IS 'Links a scheduled session ("Запись") to its course lesson ("Урок"). Null = ad-hoc session with no lesson content.';


--
-- Name: _schedule_occasion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_occasion(p_id uuid) RETURNS SETOF public.schedule_lessons
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select sl.* from schedule_lessons r
  join schedule_lessons sl
    on sl.id = r.id
    or (r.group_id is not null
        and sl.date = r.date
        and lpad(sl.time_start, 5, '0') = lpad(r.time_start, 5, '0')
        and sl.lesson_title is not distinct from r.lesson_title
        and sl.node_type is not distinct from r.node_type
        and (sl.group_id = r.group_id
             or (sl.group_id is null
                 and sl.student_id in (select s.id from students s where s.group_id = r.group_id))))
  where r.id = p_id
$$;


--
-- Name: _schedule_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_owner(p_group uuid, p_student uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
select coalesce((select created_by from public.groups where id=p_group),(select created_by from public.students where id=p_student));
$$;


--
-- Name: _schedule_snapshot(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_snapshot(p_ids uuid[]) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', sl.id, 'date', sl.date, 'time_start', sl.time_start,
        'time_end', sl.time_end, 'status', sl.status))
      from schedule_lessons sl where sl.id = any(p_ids)), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'scheduled_date', l.scheduled_date, 'scheduled_time', l.scheduled_time,
        'rec_date', l.rec_date, 'rec_time', l.rec_time))
      from lessons l where l.id in (select lesson_id from schedule_lessons where id = any(p_ids))), '[]'::jsonb),
    'homework', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'due_date', h.due_date))
      from homework h where h.lesson_id in (select lesson_id from schedule_lessons where id = any(p_ids))), '[]'::jsonb)
  )
$$;


--
-- Name: _schedule_students(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_students(p_group uuid, p_student uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select s.id from students s where p_group is not null and s.group_id = p_group
  union
  select p_student where p_group is null and p_student is not null
$$;


--
-- Name: _schedule_sync_lesson(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._schedule_sync_lesson(p_row uuid, p_old_date date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r schedule_lessons;
  l lessons;
  single boolean;
  mirrored boolean;
  d text;
begin
  select * into r from schedule_lessons where id = p_row;
  if r.lesson_id is null then return; end if;
  select * into l from lessons where id = r.lesson_id;
  select coalesce(array_length(c.group_ids, 1), 0) + coalesce(array_length(c.student_ids, 1), 0) = 1
    into single from courses c where c.id = l.course_id;
  if not coalesce(single, false) then return; end if;

  d := to_char(r.date, 'DD.MM.YYYY');
  mirrored := l.rec_date is not distinct from l.scheduled_date and l.rec_time is not distinct from l.scheduled_time;
  if r.node_type = 'rec' or mirrored then
    update lessons set rec_date = d, rec_time = r.time_start where id = l.id;
  end if;
  if r.node_type = 'lesson' or mirrored then
    update lessons set scheduled_date = d, scheduled_time = r.time_start where id = l.id;
  end if;
  update homework set due_date = due_date + (r.date - p_old_date)
   where lesson_id = l.id and due_date is not null and r.date <> p_old_date;
end $$;


--
-- Name: admin_activity_heatmap(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_activity_heatmap(p_days integer DEFAULT 30) RETURNS TABLE(dow integer, hour integer, cnt bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: admin_activity_heatmap_by_role(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_activity_heatmap_by_role(p_role text, p_days integer DEFAULT 30) RETURNS TABLE(dow integer, hour integer, cnt bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select extract(dow  from (created_at at time zone 'Europe/Moscow'))::int,
           extract(hour from (created_at at time zone 'Europe/Moscow'))::int,
           count(*)::bigint
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
      and role = p_role
    group by 1, 2;
end; $$;


--
-- Name: admin_analytics_digest_input(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_analytics_digest_input(p_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  click_days int := least(p_days, 14);
  result jsonb;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  with clicks as (
    select path, role,
           (meta->>'xr')::numeric xr,
           (meta->>'yr')::numeric yr,
           (meta->>'w')::int w,
           ((meta->>'xr')::numeric = 0 and (meta->>'yr')::numeric = 0) as synthetic
    from analytics_events
    where event = 'click' and meta ? 'xr'
      and created_at > now() - make_interval(days => click_days)
  ),
  views as (
    select path, count(*) n
    from analytics_events
    where event = 'page_view' and created_at > now() - make_interval(days => p_days)
    group by path
  ),
  screens as (
    select c.path,
           count(*)                                              clicks,
           count(*) filter (where c.synthetic)                   synthetic,
           count(*) filter (where c.role in ('teacher','admin')) teacher_clicks,
           count(*) filter (where c.role = 'student')            student_clicks,
           coalesce(v.n, 0)                                      page_views,
           count(*) filter (where not c.synthetic and c.yr < 0.10)                   y_top,
           count(*) filter (where not c.synthetic and c.yr >= 0.10 and c.yr < 0.55)  y_mid,
           count(*) filter (where not c.synthetic and c.yr >= 0.55 and c.yr < 0.85)  y_low,
           count(*) filter (where not c.synthetic and c.yr >= 0.85)                  y_bottom,
           count(*) filter (where not c.synthetic and c.w < 768)                     phone,
           count(*) filter (where not c.synthetic and c.w >= 768)                    desktop
    from clicks c
    left join views v on v.path = c.path
    group by c.path, v.n
    order by 2 desc
    limit 30
  ),
  errors as (
    select coalesce(meta->>'msg', '') msg, path, count(*) n, max(created_at)::date last_seen
    from analytics_events
    where event in ('js_error', 'promise_rejection', 'react_crash', 'db_error')
      and created_at > now() - make_interval(days => p_days)
    group by 1, 2 order by 3 desc limit 20
  ),
  rage as (
    select path, left(coalesce(meta->>'text', meta->>'tag', ''), 60) target, count(*) n
    from analytics_events
    where event = 'rage_click' and created_at > now() - make_interval(days => p_days)
    group by 1, 2 order by 3 desc limit 10
  ),
  totals as (
    select count(*) events,
           count(distinct user_id) users,
           count(distinct session_id) sessions,
           count(*) filter (where event = 'click') clicks,
           count(*) filter (where event = 'click'
             and (meta->>'xr')::numeric = 0
             and (meta->>'yr')::numeric = 0) synthetic_clicks
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
  )
  select jsonb_build_object(
    'period_days',  p_days,
    'click_days',   click_days,
    'generated_at', now(),
    'totals',       (select to_jsonb(t) from totals t),
    'screens',      coalesce((select jsonb_agg(to_jsonb(s)) from screens s), '[]'::jsonb),
    'errors',       coalesce((select jsonb_agg(to_jsonb(e)) from errors e), '[]'::jsonb),
    'rage_clicks',  coalesce((select jsonb_agg(to_jsonb(r)) from rage r), '[]'::jsonb),
    'funnel',       jsonb_build_object(
      'assigned',  (select count(*) from lesson_progress),
      'started',   (select count(*) from lesson_progress where status in ('current','submitted','completed')),
      'submitted', (select count(*) from lesson_progress where status in ('submitted','completed')),
      'completed', (select count(*) from lesson_progress where status = 'completed'))
  ) into result;

  return result;
end; $$;


--
-- Name: admin_analytics_overview(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_analytics_overview(p_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: admin_analytics_overview_by_role(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_analytics_overview_by_role(p_role text, p_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  result jsonb;
  roles  text[] := case when p_role = 'student' then array['student','anon']
                        else array['teacher','admin'] end;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'events_total',   (select count(*) from analytics_events
                        where role = any(roles)
                          and created_at > now() - make_interval(days => p_days)),
    'sessions',       (select count(distinct session_id) from analytics_events
                        where role = any(roles)
                          and created_at > now() - make_interval(days => p_days)),
    'dau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id))
                        from analytics_events
                        where role = any(roles) and created_at > now() - interval '1 day'),
    'wau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id))
                        from analytics_events
                        where role = any(roles) and created_at > now() - interval '7 days'),
    'mau',            (select count(distinct coalesce(user_id::text, student_id::text, session_id))
                        from analytics_events
                        where role = any(roles) and created_at > now() - interval '30 days'),
    'students_total', (select count(*) from students),
    'students_active',(select count(distinct student_id) from analytics_events
                        where student_id is not null and created_at > now() - interval '7 days'),
    'groups_total',   (select count(*) from groups)
  ) into result;
  return result;
end; $$;


--
-- Name: admin_analytics_reports(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_analytics_reports(p_limit integer DEFAULT 12) RETURNS TABLE(id uuid, created_at timestamp with time zone, period_days integer, model text, body text, stats jsonb, tokens_in integer, tokens_out integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select r.id, r.created_at, r.period_days, r.model, r.body, r.stats, r.tokens_in, r.tokens_out
    from analytics_reports r
    order by r.created_at desc
    limit greatest(1, least(p_limit, 50));
end; $$;


--
-- Name: admin_click_heatmap(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_click_heatmap(p_path text, p_role text DEFAULT 'teacher'::text, p_days integer DEFAULT 30) RETURNS TABLE(gx integer, gy integer, cnt bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select least(47, greatest(0, floor((ae.meta->>'xr')::numeric * 48)))::int,
           least(29, greatest(0, floor((ae.meta->>'yr')::numeric * 30)))::int,
           count(*)::bigint
    from analytics_events ae
    where ae.event = 'click' and ae.path = p_path
      and ae.created_at > now() - make_interval(days => p_days)
      and (ae.meta ? 'xr')
      and ((p_role = 'student' and ae.role = 'student')
        or (p_role = 'teacher' and ae.role in ('teacher','admin')))
    group by 1, 2;
end; $$;


--
-- Name: admin_click_paths(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_click_paths(p_days integer DEFAULT 30) RETURNS TABLE(path text, teacher_clicks bigint, student_clicks bigint, total bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.path,
           count(*) filter (where ae.role in ('teacher','admin'))::bigint,
           count(*) filter (where ae.role = 'student')::bigint,
           count(*)::bigint
    from analytics_events ae
    where ae.event = 'click' and ae.path is not null
      and ae.created_at > now() - make_interval(days => p_days)
      and (ae.meta ? 'xr')
    group by ae.path order by 4 desc;
end; $$;


--
-- Name: admin_content_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_content_list() RETURNS TABLE(kind text, id uuid, short_id text, title text, status text, owner_id uuid, owner_name text, detail bigint, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    'course'::text as kind,
    c.id, c.short_id, c.title, c.status,
    c.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    (select count(*) from public.lessons l where l.course_id = c.id) as detail,
    c.created_at
  from public.courses c
  left join public.profiles p on p.id = c.created_by
  where public.is_admin()
  union all
  select
    'group'::text as kind,
    g.id, null::text as short_id, g.name as title, null::text as status,
    g.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    (select count(*) from public.students s where s.group_id = g.id) as detail,
    g.created_at
  from public.groups g
  left join public.profiles p on p.id = g.created_by
  where public.is_admin()
  order by kind, created_at;
$$;


--
-- Name: admin_create_teacher_invite(text, text[], text[], jsonb, uuid[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_create_teacher_invite(p_email text, p_hidden_tabs text[], p_hidden_widgets text[], p_course_assignments jsonb, p_group_ids uuid[], p_subjects text[] DEFAULT '{}'::text[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_token uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create invites';
  end if;
  insert into public.teacher_invites
    (email, hidden_tabs, hidden_widgets, course_assignments, group_ids, subjects, created_by)
  values
    (p_email, coalesce(p_hidden_tabs, '{}'), coalesce(p_hidden_widgets, '{}'),
     coalesce(p_course_assignments, '[]'::jsonb), coalesce(p_group_ids, '{}'),
     coalesce(p_subjects, '{}'), auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;


--
-- Name: admin_daily_activity(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_daily_activity(p_days integer DEFAULT 30) RETURNS TABLE(day date, events bigint, users bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: admin_delete_content(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_content(p_kind text, p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete content';
  end if;
  if p_kind = 'course' then
    delete from public.courses where id = p_id;
  elsif p_kind = 'group' then
    delete from public.groups where id = p_id;
  else
    raise exception 'Unknown content kind: %', p_kind;
  end if;
end;
$$;


--
-- Name: admin_delete_task(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_task(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete tasks';
  end if;
  delete from public.teacher_tasks where id = p_id;
end;
$$;


--
-- Name: admin_delete_teacher(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_teacher(p_teacher uuid, p_keep_account boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete a teacher';
  end if;
  if p_teacher = auth.uid() then
    raise exception 'Cannot delete yourself';
  end if;
  select role into v_role from public.profiles where id = p_teacher;
  if v_role is distinct from 'teacher' then
    raise exception 'Only a teacher account can be deleted';
  end if;

  delete from public.groups             where created_by = p_teacher;
  delete from public.courses            where created_by = p_teacher;
  delete from public.trainers           where created_by = p_teacher;
  delete from public.task_bank          where created_by = p_teacher;
  delete from public.card_groups        where created_by = p_teacher;
  delete from public.homework           where created_by = p_teacher;
  delete from public.widgets            where created_by = p_teacher;
  delete from public.course_enrollments where created_by = p_teacher;
  delete from public.test_assignments   where created_by = p_teacher;
  delete from public.teacher_tasks      where created_by = p_teacher;
  delete from public.payments           where teacher_id = p_teacher;
  delete from public.course_shares      where teacher_id = p_teacher;
  delete from public.desk_layouts       where teacher_id = p_teacher;

  if not p_keep_account then
    delete from auth.users where id = p_teacher;
  end if;
end;
$$;


--
-- Name: admin_duplicate_course(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_duplicate_course(p_course_id uuid, p_new_owner uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can duplicate a course';
  end if;
  return public.duplicate_course(p_course_id, p_new_owner);
end;
$$;


--
-- Name: admin_event_breakdown(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_event_breakdown(p_days integer DEFAULT 30) RETURNS TABLE(event text, cnt bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.event, count(*)::bigint
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
    group by ae.event
    order by 2 desc;
end; $$;


--
-- Name: admin_group_options(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_group_options() RETURNS TABLE(id uuid, name text, subject text, is_individual boolean, owner_id uuid, owner_name text, students bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    g.id, g.name, g.subject, coalesce(g.is_individual, false),
    g.created_by, coalesce(p.name, '—'),
    (select count(*) from students s where s.group_id = g.id)
  from groups g
  left join profiles p on p.id = g.created_by
  order by coalesce(p.name, '—'), g.name;
end $$;


--
-- Name: admin_page_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_page_stats(p_days integer DEFAULT 30) RETURNS TABLE(path text, role text, visits bigint, avg_dwell_sec numeric, errors bigint, rage_clicks bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.path,
      ae.role,
      count(*) filter (where ae.event = 'page_view')            as visits,
      round(avg((ae.meta->>'dwell_ms')::numeric) filter (where ae.event = 'page_leave') / 1000, 1) as avg_dwell_sec,
      count(*) filter (where ae.event in ('js_error','promise_rejection')) as errors,
      count(*) filter (where ae.event = 'rage_click')           as rage_clicks
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and ae.path is not null
    group by ae.path, ae.role
    order by errors desc, rage_clicks desc, visits desc;
end; $$;


--
-- Name: admin_pending_teacher_invites(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_pending_teacher_invites() RETURNS TABLE(token uuid, email text, created_at timestamp with time zone, created_by uuid, created_by_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    ti.token, ti.email, ti.created_at, ti.created_by,
    (select p.name from public.profiles p where p.id = ti.created_by) as created_by_name
  from public.teacher_invites ti
  where ti.consumed_at is null
    and public.is_admin()
  order by ti.created_at desc;
$$;


--
-- Name: admin_progress_funnel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_progress_funnel() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: admin_rage_hotspots(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_rage_hotspots(p_days integer DEFAULT 30) RETURNS TABLE(path text, element text, cnt bigint, last_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.path,
      coalesce(ae.meta->>'text', ae.meta->>'cls', ae.meta->>'tag', '—') as element,
      count(*)::bigint, max(ae.created_at)
    from analytics_events ae
    where ae.event = 'rage_click' and ae.created_at > now() - make_interval(days => p_days)
    group by ae.path, element order by 3 desc limit 20;
end; $$;


--
-- Name: admin_reassign_content(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_reassign_content(p_kind text, p_id uuid, p_new_owner uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reassign content';
  end if;
  if p_kind = 'course' then
    update public.courses set created_by = p_new_owner, updated_at = now() where id = p_id;
  elsif p_kind = 'group' then
    update public.groups set created_by = p_new_owner where id = p_id;
  else
    raise exception 'Unknown content kind: %', p_kind;
  end if;
end;
$$;


--
-- Name: admin_reassign_task(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_reassign_task(p_id uuid, p_new_owner uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reassign tasks';
  end if;
  update public.teacher_tasks set created_by = p_new_owner where id = p_id;
end;
$$;


--
-- Name: admin_recent_errors(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_recent_errors(p_limit integer DEFAULT 50) RETURNS TABLE(created_at timestamp with time zone, role text, path text, event text, msg text, src text, line integer, session_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.created_at,
      ae.role,
      ae.path,
      ae.event,
      (ae.meta->>'msg')::text,
      (ae.meta->>'src')::text,
      (ae.meta->>'line')::int,
      ae.session_id
    from analytics_events ae
    where ae.event in ('js_error','promise_rejection','rage_click')
    order by ae.created_at desc
    limit p_limit;
end; $$;


--
-- Name: admin_revoke_teacher_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_revoke_teacher_invite(p_token uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Только администратор может отозвать приглашение';
  end if;
  delete from public.teacher_invites
  where token = p_token and consumed_at is null;
end;
$$;


--
-- Name: admin_set_teacher_access(uuid, text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_teacher_access(p_teacher uuid, p_hidden_tabs text[], p_hidden_widgets text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  update public.profiles
     set hidden_tabs = coalesce(p_hidden_tabs, '{}'),
         hidden_widgets = coalesce(p_hidden_widgets, '{}'),
         updated_at = now()
   where id = p_teacher;
end;
$$;


--
-- Name: admin_set_teacher_plan(uuid, text, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_teacher_plan(p_teacher uuid, p_plan text, p_expires timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: admin_set_teacher_subjects(uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_teacher_subjects(p_teacher uuid, p_subjects text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  update public.profiles
     set subjects = coalesce(p_subjects, '{}'),
         updated_at = now()
   where id = p_teacher;
end;
$$;


--
-- Name: admin_student_delete(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_student_delete(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_group uuid;
  v_individual boolean;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.group_id into v_group from students s where s.id = p_id;
  select coalesce(g.is_individual, false) into v_individual from groups g where g.id = v_group;

  delete from students where id = p_id;

  if v_individual and v_group is not null
     and not exists (select 1 from students s where s.group_id = v_group) then
    delete from groups where id = v_group;
  end if;
end $$;


--
-- Name: admin_student_move(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_student_move(p_student uuid, p_group uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_old uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.group_id into v_old from students s where s.id = p_student;
  if v_old is null and not exists (select 1 from students s where s.id = p_student) then
    raise exception 'student not found';
  end if;
  if not exists (select 1 from groups g where g.id = p_group) then
    raise exception 'group not found';
  end if;
  if v_old = p_group then return; end if;

  update students set group_id = p_group, updated_at = now() where id = p_student;
  update schedule_lessons set group_id = p_group where student_id = p_student;
  update lesson_attendance set group_id = p_group where student_id = p_student;
end $$;


--
-- Name: admin_student_reassign(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_student_reassign(p_student uuid, p_owner uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  g record;
  v_name text;
  v_cnt int;
  v_new uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from profiles pr where pr.id = p_owner) then
    raise exception 'owner not found';
  end if;

  select s.name into v_name from students s where s.id = p_student;
  if v_name is null and not exists (select 1 from students s where s.id = p_student) then
    raise exception 'student not found';
  end if;

  select gr.* into g from groups gr
    where gr.id = (select s.group_id from students s where s.id = p_student);
  if g.id is null then raise exception 'student has no group'; end if;
  if g.created_by is not distinct from p_owner then return 'noop'; end if;

  select count(*) into v_cnt from students s where s.group_id = g.id;

  if coalesce(g.is_individual, false) and v_cnt <= 1 then
    update groups set created_by = p_owner where id = g.id;
    return 'group_moved';
  end if;

  insert into groups (name, subject, icon, level, color, color_soft,
                      start_date, total_lessons, is_individual, created_by)
  values (coalesce(v_name, g.name), g.subject, g.icon, g.level, g.color, g.color_soft,
          null, 0, true, p_owner)
  returning id into v_new;

  perform public.admin_student_move(p_student, v_new);
  return 'new_group';
end $$;


--
-- Name: admin_student_update(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_student_update(p_id uuid, p_patch jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update students s set
    name           = coalesce(nullif(p_patch->>'name', ''), s.name),
    email          = case when p_patch ? 'email' then nullif(p_patch->>'email', '') else s.email end,
    phone          = case when p_patch ? 'phone' then p_patch->>'phone' else s.phone end,
    telegram_link  = case when p_patch ? 'telegram_link' then p_patch->>'telegram_link' else s.telegram_link end,
    parent_contact = case when p_patch ? 'parent_contact' then p_patch->>'parent_contact' else s.parent_contact end,
    comment        = case when p_patch ? 'comment' then p_patch->>'comment' else s.comment end,
    updated_at     = now()
  where s.id = p_id;
  if not found then raise exception 'student not found'; end if;
end $$;


--
-- Name: admin_students_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_students_list() RETURNS TABLE(id uuid, name text, email text, phone text, telegram_link text, parent_contact text, comment text, group_id uuid, group_name text, subject text, is_individual boolean, owner_id uuid, owner_name text, person_id uuid, siblings bigint, has_account boolean, progress_rows bigint, last_visit date, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    s.id, s.name, s.email, s.phone, s.telegram_link,
    s.parent_contact, s.comment,
    s.group_id, g.name, g.subject, coalesce(g.is_individual, false),
    g.created_by, coalesce(p.name, '—'),
    s.person_id,
    (select count(*) from students sib
      where sib.person_id is not null and sib.person_id = s.person_id and sib.id <> s.id),
    s.auth_user_id is not null,
    (select count(*) from lesson_progress lp where lp.student_id = s.id),
    s.last_visit, s.created_at
  from students s
  left join groups g on g.id = s.group_id
  left join profiles p on p.id = g.created_by
  order by coalesce(p.name, '—'), s.name;
end $$;


--
-- Name: admin_tasks_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_tasks_list() RETURNS TABLE(id uuid, owner_id uuid, owner_name text, type_label text, title text, date text, "time" text, comment text, done boolean, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    t.id, t.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    t.type_label, t.title, t.date, t.time,
    t.comment, t.done, t.created_at
  from public.teacher_tasks t
  left join public.profiles p on p.id = t.created_by
  where public.is_admin()
  order by t.created_by, t.created_at desc;
$$;


--
-- Name: admin_teacher_content(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_teacher_content(p_teacher uuid) RETURNS TABLE(kind text, id uuid, title text, via text, detail bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select 'course'::text, c.id, c.title, 'owned'::text,
         (select count(*) from public.lessons l where l.course_id = c.id)
  from public.courses c
  where c.created_by = p_teacher and public.is_admin()
  union all
  select 'course'::text, c.id, c.title, 'shared'::text,
         (select count(*) from public.lessons l where l.course_id = c.id)
  from public.course_shares cs
  join public.courses c on c.id = cs.course_id
  where cs.teacher_id = p_teacher and c.created_by is distinct from p_teacher
    and public.is_admin()
  union all
  select 'group'::text, g.id, g.name, 'owned'::text,
         (select count(*) from public.students s where s.group_id = g.id)
  from public.groups g
  where g.created_by = p_teacher and public.is_admin()
  order by 1, 4, 3;
$$;


--
-- Name: admin_teacher_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_teacher_list() RETURNS TABLE(id uuid, name text, username text, subject text, role text, created_at timestamp with time zone, group_count bigint, student_count bigint, hidden_tabs text[], hidden_widgets text[], subjects text[])
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    p.id, p.name, p.username, p.subject, p.role, p.created_at,
    (select count(*) from public.groups g where g.created_by = p.id) as group_count,
    (select count(*) from public.students s
       join public.groups g on g.id = s.group_id
       where g.created_by = p.id) as student_count,
    p.hidden_tabs, p.hidden_widgets, p.subjects
  from public.profiles p
  where p.role in ('teacher', 'admin')
    and public.is_admin()
  order by p.created_at;
$$;


--
-- Name: admin_teacher_plans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_teacher_plans() RETURNS TABLE(teacher_id uuid, plan_code text, plan_name text, expires_at timestamp with time zone, status text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select s.teacher_id, s.plan_code, p.name, s.expires_at, s.status
  from public.teacher_subscriptions s
  join public.plans p on p.code = s.plan_code
  where public.is_admin();
$$;


--
-- Name: admin_teacher_usage(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_teacher_usage(p_days integer DEFAULT 30) RETURNS TABLE(teacher_id uuid, name text, email text, plan_code text, expires_at timestamp with time zone, total_students bigint, active_students bigint, active_min bigint, sessions bigint, last_seen timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    pr.id, pr.name, u.email::text, sub.plan_code, sub.expires_at,
    (select count(*) from students st join groups g on g.id = st.group_id where g.created_by = pr.id),
    (select count(distinct st.id) from students st join groups g on g.id = st.group_id
      join analytics_events ae on ae.student_id = st.id
      where g.created_by = pr.id and ae.created_at > now() - make_interval(days => p_days)),
    coalesce((select count(*) from analytics_events ae
      where ae.user_id = pr.id and ae.event = 'heartbeat' and ae.created_at > now() - make_interval(days => p_days)), 0),
    coalesce((select count(distinct ae.session_id) from analytics_events ae
      where ae.user_id = pr.id and ae.created_at > now() - make_interval(days => p_days)), 0),
    (select max(ae.created_at) from analytics_events ae where ae.user_id = pr.id)
  from profiles pr
  left join auth.users u on u.id = pr.id
  left join teacher_subscriptions sub on sub.teacher_id = pr.id
  where pr.role in ('teacher','admin')
  order by pr.name;
end $$;


--
-- Name: admin_user_activity(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_user_activity(p_days integer DEFAULT 30) RETURNS TABLE(actor_kind text, actor_id uuid, name text, email text, sessions bigint, active_min bigint, events bigint, logins bigint, last_seen timestamp with time zone, first_seen timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with ev as (
    select coalesce(ae.user_id, ae.student_id) as aid, ae.role,
           ae.session_id, ae.event, ae.created_at
    from analytics_events ae
    where ae.created_at > now() - make_interval(days => p_days)
      and coalesce(ae.user_id, ae.student_id) is not null
  )
  select
    max(ev.role), ev.aid, coalesce(p.name, s.name, '—'),
    coalesce(u.email::text, s.email),
    count(distinct ev.session_id),
    count(*) filter (where ev.event = 'heartbeat'),
    count(*),
    count(*) filter (where ev.event = 'login'),
    max(ev.created_at), min(ev.created_at)
  from ev
  left join profiles p on p.id = ev.aid
  left join students s on s.id = ev.aid
  left join auth.users u on u.id = ev.aid
  group by ev.aid, p.name, s.name, u.email, s.email
  order by max(ev.created_at) desc;
end $$;


--
-- Name: apply_teacher_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_teacher_invite(p_token uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  inv public.teacher_invites%rowtype;
  me uuid := auth.uid();
  a jsonb;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into inv from public.teacher_invites where token = p_token;
  if not found then raise exception 'invalid invite token'; end if;
  if inv.consumed_at is not null then raise exception 'invite already used'; end if;

  update public.profiles
     set hidden_tabs = inv.hidden_tabs,
         hidden_widgets = inv.hidden_widgets,
         subjects = inv.subjects,
         updated_at = now()
   where id = me;

  for a in select * from jsonb_array_elements(inv.course_assignments) loop
    if a ->> 'mode' = 'copy' then
      perform public.duplicate_course((a ->> 'course_id')::uuid, me);
    else
      insert into public.course_shares (course_id, teacher_id)
      values ((a ->> 'course_id')::uuid, me)
      on conflict do nothing;
    end if;
  end loop;

  update public.groups set created_by = me where id = any(inv.group_ids);

  update public.teacher_invites
     set consumed_at = now(), consumed_by = me
   where token = p_token;
end;
$$;


--
-- Name: can_read_avatar(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_avatar(p_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
select (storage.foldername(p_name))[1] = auth.uid()::text or public.is_admin()
or exists(select 1 from public.students s where s.auth_user_id::text = (storage.foldername(p_name))[1] and s.created_by = auth.uid());
$$;


--
-- Name: can_read_course(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_course(p_course uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course and (
         c.created_by = auth.uid()
      or exists (select 1 from public.course_shares cs
                  where cs.course_id = c.id and cs.teacher_id = auth.uid())
      or c.student_ids && public.my_student_ids()
      or c.group_ids   && public.my_group_ids()
      or exists (select 1 from public.course_enrollments e
                  where e.course_id = c.id
                    and e.student_id = any (select unnest(public.my_student_ids())::text))
      or exists (
        select 1 from public.students s
        where s.group_id = any (public.my_taught_group_ids())
          and (s.id = any (c.student_ids)
            or s.group_id = any (c.group_ids)
            or exists (select 1 from public.course_enrollments e2
                        where e2.course_id = c.id and e2.student_id = s.id::text))
      )
    )
  );
$$;


--
-- Name: can_read_trainer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_trainer(p_trainer uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.trainers t
    where t.id = p_trainer and (
         t.created_by = auth.uid()
      or exists (select 1 from public.lessons l
                  where l.trainer_id = t.id and l.course_id = any (public.my_course_ids()))
    )
  );
$$;


--
-- Name: card_sets_depth_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.card_sets_depth_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  grandparent uuid;
begin
  if new.parent_set_id is null then
    return new;
  end if;

  -- Сам себе родитель — вырожденный случай, который иначе даёт бесконечный цикл
  -- при сборке дерева на клиенте.
  if new.parent_set_id = new.id then
    raise exception 'набор не может быть вложен сам в себя';
  end if;

  select parent_set_id into grandparent
  from public.card_sets
  where id = new.parent_set_id;

  if grandparent is not null then
    raise exception 'глубже четырёх уровней нельзя: полка → набор → стопка → карточки';
  end if;

  return new;
end;
$$;


--
-- Name: card_sets_no_reparent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.card_sets_no_reparent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.parent_set_id is not null
     and exists (select 1 from public.card_sets where parent_set_id = new.id) then
    raise exception 'у набора есть свои стопки — его нельзя вложить в другой набор';
  end if;
  return new;
end;
$$;


--
-- Name: chembio_day_summary(uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chembio_day_summary(p_teacher uuid, p_date date DEFAULT ((now() AT TIME ZONE 'Europe/Moscow'::text))::date, p_link text DEFAULT 'https://edu-study-app.vercel.app/#/teacher/homework'::text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  with my_groups as (
    select g.*,
           case g.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
           case g.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    from groups g
    where g.created_by = p_teacher
  ),
  my_students as (
    select s.id, s.group_id from students s join my_groups g on g.id = s.group_id
  ),
  current_hw as (
    select distinct on (h.group_id) h.*
    from homework h
    join my_groups g on g.id = h.group_id
    where h.status <> 'closed'
      and not g.is_individual
      and g.subj is not null
    order by h.group_id, h.assigned_at desc nulls last, h.created_at desc
  ),
  group_rows as (
    select g.name, g.id,
           jsonb_strip_nulls(jsonb_build_object(
             'id', g.id,
             'title', g.name,
             'subject', g.subj,
             'exam', g.exam,
             'homework', jsonb_strip_nulls(jsonb_build_object(
               -- Название ДЗ — ровно как учитель написал его в Искре
               -- («ДЗ Атомы», «ДЗ Атомы 2»). Пустое — поля нет.
               'title', nullif(btrim(h.title), ''),
               'submitted', (select count(distinct lp.student_id)
                             from lesson_progress lp
                             join my_students s on s.id = lp.student_id and s.group_id = g.id
                             where lp.lesson_ref = 'hw-' || h.id
                               and lp.status in ('submitted', 'returned', 'completed')),
               'total', (select count(*) from my_students s where s.group_id = g.id)
             ))
           )) as row
    from current_hw h join my_groups g on g.id = h.group_id
  ),
  awaiting as (
    select count(*) as n
    from lesson_progress lp
    join my_students s on s.id = lp.student_id
    where lp.status = 'submitted'
      and (
        lp.lesson_ref like '%-hard'
        or exists (select 1 from homework h
                   where 'hw-' || h.id = lp.lesson_ref and h.status <> 'closed')
        or (lp.lesson_ref not like 'hw-%' and coalesce(lp.comment, '') <> '')
      )
  ),
  ai_graded as (
    select count(*) as n
    from hw_ai_grades a
    join lesson_progress lp on lp.id = a.progress_id
    where a.teacher_id = p_teacher
      and a.status = 'graded'
      and lp.status = 'submitted'
  ),
  -- Календарь «Искра» в Таскли: занятия на месяц вперёд и сроки открытых ДЗ.
  -- Строка группового занятия бывает на группу и на каждого ученика — берём одну.
  upcoming_lessons as (
    select distinct on (sl.date, lpad(sl.time_start, 5, '0'), coalesce(g.id::text, sl.student_id::text))
           sl.date, lpad(sl.time_start, 5, '0') as t0,
           case when sl.time_end ~ '^\d{1,2}:\d{2}$' then lpad(sl.time_end, 5, '0') end as t1,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid,
           coalesce(g.subj, case sl.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end) as subj,
           nullif(btrim(sl.lesson_title), '') as title,
           sl.node_type
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date between p_date and p_date + 31
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
      and sl.status <> 'cancelled'
      and (g.id is not null
           or sl.student_id in (select id from my_students))
    order by sl.date, lpad(sl.time_start, 5, '0'), coalesce(g.id::text, sl.student_id::text),
             (sl.student_id is null) desc
  ),
  upcoming_hw as (
    select h.id, h.due_date::date as due_date, h.title, g.id as gid, g.name, g.subj,
           (select count(distinct lp.student_id)
              from lesson_progress lp
              join my_students s on s.id = lp.student_id and s.group_id = g.id
             where lp.lesson_ref = 'hw-' || h.id
               and lp.status in ('submitted', 'returned', 'completed')) as submitted,
           (select count(*) from my_students s where s.group_id = g.id) as total
    from homework h
    join my_groups g on g.id = h.group_id
    where h.status <> 'closed'
      and h.due_date::date between p_date - 7 and p_date + 31
  ),
  upcoming_rows as (
    select l.date as d, l.t0 as t, jsonb_strip_nulls(jsonb_build_object(
             'kind', 'lesson',
             'at', to_char(l.date, 'YYYY-MM-DD') || 'T' || l.t0 || ':00+03:00',
             'end', case when l.t1 > l.t0 then to_char(l.date, 'YYYY-MM-DD') || 'T' || l.t1 || ':00+03:00' end,
             'group', l.label,
             'group_id', l.gid,
             'subject', l.subj,
             'title', l.title,
             'rec', case when l.node_type = 'rec' then true end,
             'link', regexp_replace(p_link, '#.*$', '') || '#/teacher/groups'
           )) as row
    from upcoming_lessons l
    union all
    select h.due_date, '99:99', jsonb_strip_nulls(jsonb_build_object(
             'kind', 'homework',
             'due', to_char(h.due_date, 'YYYY-MM-DD'),
             'id', h.id,
             'group', h.name,
             'group_id', h.gid,
             'subject', h.subj,
             'title', nullif(btrim(h.title), ''),
             'submitted', h.submitted,
             'total', h.total,
             'link', p_link
           ))
    from upcoming_hw h
  ),
  lesson_rows as (
    select distinct
           sl.time_start,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date = p_date
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
      and sl.status <> 'cancelled'
      and (g.id is not null
           or sl.student_id in (select id from my_students))
  )
  select jsonb_build_object(
    'version', 1,
    'date', to_char(p_date, 'YYYY-MM-DD'),
    'updated', to_char(now() at time zone 'Europe/Moscow', 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
    'source', 'iskra',
    'groups', coalesce((select jsonb_agg(row order by name) from group_rows), '[]'::jsonb),
    'review', jsonb_build_object(
      'ai_graded', (select n from ai_graded),
      'awaiting', (select n from awaiting)
    ),
    'lessons', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'at', to_char(p_date, 'YYYY-MM-DD') || 'T' || lpad(time_start, 5, '0') || ':00+03:00',
               'group', label,
               'group_id', gid
             )) order by lpad(time_start, 5, '0'), label)
      from lesson_rows
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(row order by d, t, row->>'group') from upcoming_rows
    ), '[]'::jsonb),
    'link', p_link
  );
$_$;


--
-- Name: chembio_mark_dirty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chembio_mark_dirty() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r record;
  g uuid;
  t uuid;
begin
  if TG_OP = 'DELETE' then r := OLD; else r := NEW; end if;
  if TG_TABLE_NAME = 'groups' then
    t := r.created_by;
  else
    if TG_TABLE_NAME = 'lesson_progress' then
      select s.group_id into g from students s where s.id = r.student_id;
    elsif TG_TABLE_NAME = 'schedule_lessons' then
      g := coalesce(r.group_id, (select s.group_id from students s where s.id = r.student_id));
    else
      g := r.group_id;
    end if;
    select created_by into t from groups where id = g;
  end if;
  if t is not null and exists (select 1 from chembio_taskly_teachers where teacher_id = t) then
    insert into chembio_dirty(teacher_id) values (t) on conflict (teacher_id) do nothing;
  end if;
  return null;
end; $$;


--
-- Name: claim_sibling_cards(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_sibling_cards(p_token uuid, p_email text, p_password text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_self public.students%rowtype;
  v_cnt integer := 0;
  r record;
begin
  select * into v_self from public.students where invite_token = p_token;
  if v_self.id is null or v_self.auth_user_id is distinct from auth.uid() then
    return 0;
  end if;
  if v_self.person_id is null then return 0; end if;
  for r in
    select id, group_id from public.students
    where person_id = v_self.person_id and id <> v_self.id and auth_user_id is null
  loop
    update public.students
       set auth_user_id = auth.uid(), email = p_email, temp_password = p_password
     where id = r.id;
    begin
      perform public.seed_student_progress(r.id, r.group_id);
    exception when others then null;
    end;
    v_cnt := v_cnt + 1;
  end loop;
  return v_cnt;
end;
$$;


--
-- Name: claim_student_account(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_student_account(p_token uuid, p_email text, p_password text) RETURNS TABLE(student_id uuid, group_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  me uuid := auth.uid();
  v_self public.students%rowtype;
  r record;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into v_self from public.students s where s.invite_token = p_token;
  if v_self.id is null then raise exception 'invalid invite token'; end if;
  if v_self.auth_user_id is not null and v_self.auth_user_id <> me then
    raise exception 'invite already used';
  end if;
  update public.students s
     set email = p_email, temp_password = p_password, auth_user_id = me
   where s.id = v_self.id;
  begin perform public.seed_student_progress(v_self.id, v_self.group_id);
  exception when others then null; end;
  if v_self.person_id is not null then
    for r in
      select s.id as sid, s.group_id as gid from public.students s
      where s.person_id = v_self.person_id and s.id <> v_self.id and s.auth_user_id is null
    loop
      update public.students s
         set auth_user_id = me, email = p_email, temp_password = p_password
       where s.id = r.sid;
      begin perform public.seed_student_progress(r.sid, r.gid);
      exception when others then null; end;
    end loop;
  end if;
  student_id := v_self.id;
  group_id := v_self.group_id;
  return next;
end;
$$;


--
-- Name: course_add_group(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.course_add_group(p_course uuid, p_group uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  update public.courses
     set group_ids = (select array(select distinct unnest(coalesce(group_ids, '{}') || p_group)))
   where id = p_course
     and not (coalesce(group_ids, '{}') @> array[p_group]);
$$;


--
-- Name: course_add_student(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.course_add_student(p_course uuid, p_student uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  update public.courses
     set student_ids = (select array(select distinct unnest(coalesce(student_ids, '{}') || p_student)))
   where id = p_course
     and not (coalesce(student_ids, '{}') @> array[p_student]);
$$;


--
-- Name: courses_stamp_published_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.courses_stamp_published_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    else
      new.published_at := coalesce(old.published_at, now());
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;


--
-- Name: diag_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diag_questions (
    id text NOT NULL,
    subject text NOT NULL,
    section text DEFAULT ''::text NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct integer DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb
);


--
-- Name: diag_correct_label(public.diag_questions); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.diag_correct_label(q public.diag_questions) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select case
    when q.payload->>'kind' = 'term' then
      (select string_agg(x, ' / ') from jsonb_array_elements_text(coalesce(q.payload->'accepts', '[]'::jsonb)) x)
    else q.options->>q.correct
  end
$$;


--
-- Name: diag_is_correct(public.diag_questions, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.diag_is_correct(q public.diag_questions, a jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select case
    when a is null or jsonb_typeof(a) = 'null' then false
    when q.payload->>'kind' = 'term' then
      jsonb_typeof(a) = 'string'
      and public.diag_norm_term(a #>> '{}') <> ''
      and exists (
        select 1 from jsonb_array_elements_text(coalesce(q.payload->'accepts', '[]'::jsonb)) x
        where public.diag_norm_term(x) = public.diag_norm_term(a #>> '{}'))
    else jsonb_typeof(a) = 'number' and (a #>> '{}') = q.correct::text
  end
$$;


--
-- Name: diag_norm_term(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.diag_norm_term(s text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(
    replace(lower(coalesce(s, '')), 'ё', 'е'),
    '[«»"''.,;:!?()]', ' ', 'g'),
    '[‐-―-]', '-', 'g'),
    '\s+', ' ', 'g'))
$$;


--
-- Name: discard_diag_progress(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.discard_diag_progress(p_token text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from public.diag_results
  where p_token is not null and length(p_token) >= 16
    and owner_token = p_token and completed = false
$$;


--
-- Name: duplicate_course(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duplicate_course(p_course_id uuid, p_new_owner uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  new_course uuid;
  m record;
  new_mod uuid;
  mod_map jsonb := '{}'::jsonb;
  l record;
begin
  insert into public.courses
    (kind, title, subject, level, description, status, color, bg, created_by, short_id, group_ids, student_ids)
  select kind, title, subject, level, description, 'draft', color, bg, p_new_owner,
         substr(md5(random()::text), 1, 10), '{}', '{}'
  from public.courses where id = p_course_id
  returning id into new_course;

  if new_course is null then
    raise exception 'course % not found', p_course_id;
  end if;

  for m in select * from public.course_modules where course_id = p_course_id order by position loop
    insert into public.course_modules (course_id, label, position)
    values (new_course, m.label, m.position)
    returning id into new_mod;
    mod_map := mod_map || jsonb_build_object(m.id::text, new_mod::text);
  end loop;

  for l in select * from public.lessons where course_id = p_course_id loop
    insert into public.lessons
      (course_id, module_id, title, position, lesson_number, kind, shape, test_tasks,
       content, youtube_url, description, timecodes, homework, materials,
       trainer_id, widget_id, lesson_sched_manual, short_id)
    values
      (new_course,
       nullif(mod_map ->> l.module_id::text, '')::uuid,
       l.title, l.position, l.lesson_number, l.kind, l.shape, l.test_tasks,
       l.content, l.youtube_url, l.description, l.timecodes, l.homework, l.materials,
       l.trainer_id, l.widget_id, l.lesson_sched_manual,
       substr(md5(random()::text), 1, 12));
  end loop;

  return new_course;
end;
$$;


--
-- Name: duplicate_my_course(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duplicate_my_course(p_short_id text, p_title text) RETURNS TABLE(id uuid, short_id text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  src uuid;
  new_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only a teacher can duplicate a course';
  end if;

  select c.id into src from public.courses c
  where c.short_id = p_short_id
    and (c.created_by = auth.uid() or public.is_admin() or c.id = any (public.my_course_ids()));
  if src is null then
    raise exception 'course % not found or not accessible', p_short_id;
  end if;

  new_id := public.duplicate_course(src, auth.uid());
  update public.courses c set title = p_title where c.id = new_id;

  return query select c.id, c.short_id, c.created_at from public.courses c where c.id = new_id;
end;
$$;


--
-- Name: enforce_student_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_student_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_max integer; v_used bigint;
begin
  -- Serialize concurrent new-person inserts for one teacher.
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 0));
  if exists(select 1 from public.students s where s.created_by = new.created_by and s.person_id = new.person_id) then return new; end if;
  select p.max_students into v_max from public.teacher_subscriptions sub join public.plans p on p.code = sub.plan_code
  where sub.teacher_id = new.created_by and sub.status = 'active' and (sub.expires_at is null or sub.expires_at > now());
  if v_max is null then return new; end if;
  select count(distinct coalesce(person_id,id)) into v_used from public.students where created_by = new.created_by;
  if v_used >= v_max then raise exception 'STUDENT_LIMIT:%', v_max; end if;
  return new;
end $$;


--
-- Name: gen_username(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gen_username(base text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  slug text;
  candidate text;
  n int := 0;
begin
  slug := regexp_replace(lower(coalesce(base, 'user')), '[^a-z0-9]+', '', 'g');
  if slug = '' then slug := 'user'; end if;
  candidate := slug;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    n := n + 1;
    candidate := slug || n::text;
  end loop;
  return candidate;
end;
$$;


--
-- Name: get_diag_questions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_diag_questions(p_subject text) RETURNS TABLE(id text, section text, text text, options jsonb, payload jsonb)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select q.id, q.section, q.text, q.options, q.payload - 'accepts'
  from public.diag_questions q
  where q.subject = p_subject
  order by q.position
$$;


--
-- Name: get_invited_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invited_student(p_token uuid) RETURNS TABLE(id uuid, name text, group_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select s.id, s.name, s.group_id
  from public.students s
  where s.invite_token = p_token
  limit 1;
$$;


--
-- Name: get_teacher_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_teacher_invite(p_token uuid) RETURNS TABLE(email text, consumed boolean, subjects text[])
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select email, (consumed_at is not null) as consumed, subjects
  from public.teacher_invites
  where token = p_token
    and expires_at > now();
$$;


--
-- Name: guard_profile_access_cols(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_profile_access_cols() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if (new.hidden_tabs is distinct from old.hidden_tabs
      or new.hidden_widgets is distinct from old.hidden_widgets)
     and not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  -- Проверка — только для запросов с сайта (anon/authenticated). Служебные
  -- роли (миграции, service_role) пользователя не несут и пропускаются.
  if new.subjects is distinct from old.subjects
     and current_user in ('anon', 'authenticated')
     and not public.is_admin()
     and new.id is distinct from auth.uid() then
    raise exception 'Only the teacher or an admin can change subjects';
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  fn text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  ln text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(concat_ws(' ', fn, ln)), ''),
    split_part(new.email, '@', 1)
  );
begin
  insert into public.profiles (id, role, name, first_name, last_name, subject, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    full_name,
    fn,
    ln,
    nullif(trim(new.raw_user_meta_data->>'subject'), ''),
    public.gen_username(coalesce(nullif(split_part(new.email, '@', 1), ''), full_name))
  );
  return new;
end;
$$;


--
-- Name: homework_photos_expired(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.homework_photos_expired(p_limit integer DEFAULT 1000) RETURNS SETOF text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select o.name from storage.objects o
  where o.bucket_id = 'homework-photos' and o.created_at < now() - interval '7 days'
  order by o.created_at
  limit greatest(1, least(p_limit, 1000));
$$;


--
-- Name: hw_ai_grade_confirm(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hw_ai_grade_confirm(p_id uuid, p_score integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update hw_ai_grades
     set status = case when p_score = score then 'confirmed' else 'changed' end,
         final_score = p_score,
         confirmed_by = auth.uid(),
         confirmed_at = now(),
         updated_at = now()
   where id = p_id
     and teacher_id = auth.uid()
     and status in ('graded', 'dismissed');
  if not found then
    raise exception 'предоценки нет или она не ждёт решения';
  end if;
end; $$;


--
-- Name: hw_ai_grade_dirty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hw_ai_grade_dirty() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  t uuid := coalesce(NEW.teacher_id, OLD.teacher_id);
begin
  if t is not null and exists (select 1 from chembio_taskly_teachers where teacher_id = t) then
    insert into chembio_dirty(teacher_id) values (t) on conflict (teacher_id) do nothing;
  end if;
  return null;
end; $$;


--
-- Name: hw_ai_grade_track(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hw_ai_grade_track() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  g record;
  hw uuid;
  base text;
  hard boolean;
begin
  -- Работа ушла из submitted (учитель проверил): незавершённая предоценка
  -- больше не нужна.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted' and NEW.status <> 'submitted' then
    update hw_ai_grades
       set status = case status when 'graded' then 'dismissed' else 'skipped' end,
           updated_at = now()
     where progress_id = NEW.id
       and status in ('pending', 'working', 'graded', 'error');
    return null;
  end if;

  hard := NEW.lesson_ref like '%-hard';
  if NEW.status <> 'submitted' or not (hard or NEW.lesson_ref ~ '^hw-[0-9a-f-]{36}$') then
    return null;
  end if;
  -- Та же сдача без изменений (повторная запись статуса) — очередь не трогаем.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted'
     and OLD.attachments is not distinct from NEW.attachments
     and OLD.comment is not distinct from NEW.comment then
    return null;
  end if;
  if not exists (select 1 from app_flags where key = 'ai_hw_grade' and enabled) then
    return null;
  end if;

  -- Предмет и учитель — по группе ученика; домашка (условия, эталоны) —
  -- по ключу `hw-<id>` или по уроку, к которому она привязана.
  select gr.created_by, gr.id as group_id,
         case gr.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
         case gr.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    into g
    from students s join groups gr on gr.id = s.group_id
   where s.id = NEW.student_id;
  if g.subj is null then
    return null;  -- не ХимБио
  end if;

  base := case when hard then left(NEW.lesson_ref, length(NEW.lesson_ref) - 5) else NEW.lesson_ref end;
  if base ~ '^hw-[0-9a-f-]{36}$' then
    hw := substring(base from 4)::uuid;
  else
    select h.id into hw from homework h
     where h.lesson_id::text = base and h.group_id = g.group_id
     order by h.created_at desc limit 1;
  end if;
  if not hard and not exists (select 1 from homework where id = hw) then
    return null;
  end if;

  insert into hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                            kind, subject, exam, status, submitted_at)
  values (NEW.id, NEW.student_id, NEW.lesson_ref, hw, g.created_by,
          case when hard then 'hard' else 'basic' end, g.subj, g.exam,
          'pending', coalesce(NEW.updated_at, now()))
  on conflict (progress_id) do update
     set status = 'pending', submitted_at = excluded.submitted_at, kind = excluded.kind,
         homework_id = excluded.homework_id,
         subject = excluded.subject, exam = excluded.exam, teacher_id = excluded.teacher_id,
         claimed_at = null, result = null, primary_score = null, max_score = null,
         score = null, comment = null, model = null, graded_at = null, error = null,
         final_score = null, confirmed_by = null, confirmed_at = null, updated_at = now();
  return null;
end; $_$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false); $$;


--
-- Name: is_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select (u.raw_app_meta_data ->> 'role') = 'admin'
       from auth.users u where u.id = uid),
    false);
$$;


--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('teacher', 'admin')
  );
$$;


--
-- Name: is_teacher(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_teacher() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
$$;


--
-- Name: lesson_hw_has_hard(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lesson_hw_has_hard(hw jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select case
    when jsonb_typeof(hw -> 'hwTasks') = 'array' and jsonb_array_length(hw -> 'hwTasks') > 0
      then coalesce((
        select bool_or(t -> 'isHard' = 'true'::jsonb)
        from jsonb_array_elements(hw -> 'hwTasks') as t
      ), false)
    else true
  end
$$;


--
-- Name: load_diag_progress(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.load_diag_progress(p_token text) RETURNS TABLE(name text, subject text, answers jsonb, completed boolean, student_id uuid, assignment_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select d.name, d.subject, d.answers, d.completed, d.student_id, d.assignment_id
  from public.diag_results d
  where p_token is not null and length(p_token) >= 16 and d.owner_token = p_token
  limit 1
$$;


--
-- Name: lock_admin_function_execute(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_admin_function_execute() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare obj record;
begin
  for obj in
    select object_identity, schema_name
    from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE FUNCTION'
  loop
    if obj.schema_name = 'public' and obj.object_identity like 'public.admin\_%' then
      execute format('revoke execute on function %s from public, anon;', obj.object_identity);
    end if;
  end loop;
end;
$$;


--
-- Name: log_diag_confidence(text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_diag_confidence(p_token text, p_question_id text, p_confident boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_row public.diag_results;
  q     public.diag_questions;
begin
  if p_token is null or length(p_token) < 16 or p_confident is null then return; end if;
  select * into v_row from public.diag_results where owner_token = p_token;
  if v_row.owner_token is null or not (v_row.answers ? p_question_id) then return; end if;
  select * into q from public.diag_questions where id = p_question_id and subject = v_row.subject;
  if q.id is null then return; end if;
  insert into public.confidence_log (student_id, anon_name, subject, source, confident, correct)
  values (v_row.student_id::text, case when v_row.student_id is null then v_row.name end,
          v_row.subject, 'diagnostic', p_confident, public.diag_is_correct(q, v_row.answers -> p_question_id));
end
$$;


--
-- Name: my_course_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_course_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(c.id), '{}'::uuid[])
  from public.courses c
  where c.created_by = auth.uid()
     or exists (select 1 from public.course_shares cs
                 where cs.course_id = c.id and cs.teacher_id = auth.uid())
     or c.student_ids && public.my_student_ids()
     or c.group_ids   && public.my_group_ids()
     or exists (select 1 from public.course_enrollments e
                 where e.course_id = c.id
                   and e.student_id = any (select unnest(public.my_student_ids())::text))
     or exists (
       select 1 from public.students s
       where s.group_id = any (public.my_taught_group_ids())
         and (s.id = any (c.student_ids)
           or s.group_id = any (c.group_ids)
           or exists (select 1 from public.course_enrollments e2
                       where e2.course_id = c.id and e2.student_id = s.id::text))
     );
$$;


--
-- Name: my_group_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_group_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(distinct s.group_id), '{}'::uuid[])
  from public.students s where s.auth_user_id = auth.uid() and s.group_id is not null;
$$;


--
-- Name: my_plan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_plan() RETURNS TABLE(plan_code text, plan_name text, price_rub integer, max_students integer, expires_at timestamp with time zone, status text, students_used bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
select s.plan_code,p.name,p.price_rub,p.max_students,s.expires_at,s.status,
(select count(distinct coalesce(st.person_id,st.id)) from public.students st where st.created_by = auth.uid())
from public.teacher_subscriptions s join public.plans p on p.code=s.plan_code where s.teacher_id=auth.uid();
$$;


--
-- Name: my_student_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_student_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM students WHERE auth_user_id = auth.uid() LIMIT 1
$$;


--
-- Name: my_student_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_student_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(s.id), '{}'::uuid[])
  from public.students s where s.auth_user_id = auth.uid();
$$;


--
-- Name: my_taught_group_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_taught_group_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(g.id), '{}'::uuid[])
  from public.groups g where g.created_by = auth.uid();
$$;


--
-- Name: notify_on_lesson_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_lesson_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    select g.created_by, s.name into v_teacher, v_sname
    from public.students s
    join public.groups g on g.id = s.group_id
    where s.id = NEW.student_id;
    v_teacher := coalesce(v_teacher, public.primary_teacher_id());
    if v_teacher is not null then
      insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
      values (v_teacher, 'teacher', 'hw_submitted',
              'Новая работа на проверку',
              coalesce(v_sname,'Ученик') || ' отправил(а) '
                || case when v_hard then 'решение сложного задания' else 'домашку' end
                || case when v_lesson is not null and v_lesson <> '' then ' · урок «' || v_lesson || '»' else '' end
                || '.',
              jsonb_build_object('page','teacher/homework','lessonRef',NEW.lesson_ref,
                                 'subject',NEW.subject,'studentId',NEW.student_id));
    end if;
  end if;
  return NEW;
end;
$$;


--
-- Name: notify_on_payment_due(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_payment_due() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_teacher uuid;
  v_overdue boolean;
  v_amount  text;
begin
  if NEW.payment_due is null then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.payment_due is not distinct from NEW.payment_due then
    return NEW;
  end if;
  if NEW.payment_due > current_date + 7 then return NEW; end if;

  select coalesce(g.created_by, public.primary_teacher_id())
    into v_teacher
  from public.groups g where g.id = NEW.group_id;
  v_teacher := NEW.created_by;
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


--
-- Name: notify_on_student_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_student_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_teacher uuid;
  v_group   text;
begin
  select coalesce(g.created_by, public.primary_teacher_id()), g.name
    into v_teacher, v_group
  from public.groups g where g.id = NEW.group_id;
  v_teacher := NEW.created_by;
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


--
-- Name: notify_on_test_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_test_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  select distinct s.id, 'student', 'test_assigned',
         'Новый тест: ' || NEW.title,
         'Тебе назначен ' || case when NEW.assign_type = 'trial' then 'пробный тест' else 'тест' end
           || coalesce(' · до ' || to_char(NEW.due_date,'DD.MM'), '') || '.',
         jsonb_build_object('page','home','assignmentId',NEW.id,'subject',NEW.subject)
  from public.students s
  where s.id = any(NEW.student_ids)
     or s.group_id = any(NEW.group_ids);
  return NEW;
end;
$$;


--
-- Name: notify_on_test_completed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_test_completed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_teacher     uuid;
  v_test_title  text;
  v_student     text;
  v_score       text;
begin
  if NEW.assignment_id is not null then
    select coalesce(ta.created_by, public.primary_teacher_id()), ta.title
      into v_teacher, v_test_title
    from public.test_assignments ta
    where ta.id = NEW.assignment_id;
  end if;
  v_teacher    := coalesce(v_teacher, public.primary_teacher_id());
  v_test_title := coalesce(v_test_title, NEW.subject::text, 'Тест');

  if v_teacher is null then return NEW; end if;

  v_student := coalesce(nullif(trim(NEW.name),''), 'Аноним');
  v_score   := case when NEW.score_pct is not null then NEW.score_pct::text || '%' else null end;

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (
    v_teacher,
    'teacher',
    'test_completed',
    'Тест пройден',
    v_student
      || ' · ' || v_test_title
      || coalesce(' · ' || v_score, ''),
    jsonb_build_object(
      'page',         'teacher/testing',
      'assignmentId', NEW.assignment_id,
      'subject',      NEW.subject,
      'studentId',    NEW.student_id
    )
  );

  return NEW;
end;
$$;


--
-- Name: on_lesson_attendance_updated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_lesson_attendance_updated() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: on_lesson_attended(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_lesson_attended() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if NEW.present = true then
    update public.students
    set lesson_balance = lesson_balance - 1
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$;


--
-- Name: on_payment_received(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_payment_received() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if NEW.lessons_paid > 0 then
    update public.students
    set lesson_balance = lesson_balance + NEW.lessons_paid
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$;


--
-- Name: person_student_rows(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.person_student_rows(p_student uuid) RETURNS TABLE(id uuid, group_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (
    select s.person_id, s.auth_user_id from students s where s.id = p_student
  )
  select s.id, s.group_id
  from students s, me
  where s.id = p_student
     or (me.person_id is not null and s.person_id = me.person_id)
     or (me.auth_user_id is not null and s.auth_user_id = me.auth_user_id)
$$;


--
-- Name: primary_teacher_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.primary_teacher_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select created_by from public.groups where created_by is not null order by created_by limit 1),
    (select id from auth.users order by created_at limit 1)
  );
$$;


--
-- Name: prune_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prune_analytics() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  removed integer := 0;
  -- Отдельная переменная под счётчик: справа от `get diagnostics` стоит ИМЯ
  -- элемента диагностики (row_count), а не выражение. `removed + row_count`
  -- Postgres не принимает — 42601, unrecognized GET DIAGNOSTICS item.
  n integer;
begin
  -- Поток поведения: две недели. Дальше он не нужен ни одному экрану.
  delete from public.analytics_events
   where event in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '14 days';
  get diagnostics n = row_count;
  removed := removed + n;

  -- Всё остальное — полгода: воронку смотрят по кварталам.
  delete from public.analytics_events
   where event not in ('heartbeat', 'click', 'rage_click', 'page_leave')
     and created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  removed := removed + n;

  return removed;
end $$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: run_analytics_digest(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_analytics_digest() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/analytics-digest';
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'analytics_digest_secret'
  limit 1;

  if secret is null then
    raise notice 'analytics_digest_secret нет в Vault — разбор пропущен';
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-digest-secret', secret
    ),
    body    := jsonb_build_object('days', 30),
    timeout_milliseconds := 300000
  );
end; $$;


--
-- Name: run_chembio_day(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_chembio_day() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day';
  secret text;
  t uuid;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'chembio_cron_secret'
  limit 1;

  if secret is null then
    raise notice 'chembio_cron_secret нет в Vault — сводка ХимБио пропущена';
    return;
  end if;

  for t in select teacher_id from public.chembio_taskly_teachers loop
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-chembio-secret', secret
      ),
      body    := jsonb_build_object('teacher_id', t),
      timeout_milliseconds := 30000
    );
  end loop;
end; $$;


--
-- Name: run_chembio_dirty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_chembio_dirty() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day';
  secret text;
  t uuid;
begin
  if not exists (select 1 from chembio_dirty) then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets
  where name = 'chembio_cron_secret' limit 1;
  if secret is null then return; end if;

  for t in delete from chembio_dirty returning teacher_id loop
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-chembio-secret', secret),
      body    := jsonb_build_object('teacher_id', t),
      timeout_milliseconds := 30000
    );
  end loop;
end; $$;


--
-- Name: run_homework_photos_cleanup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_homework_photos_cleanup() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  fn_url text;
  secret text;
begin
  if not exists (select 1 from public.app_flags where key = 'homework_photos_storage' and enabled) then
    return;
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_secret' limit 1;
  if secret is null then
    raise notice 'homework_photos_cleanup_secret is missing; cleanup skipped';
    return;
  end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_url' limit 1;
  fn_url := coalesce(fn_url, 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/homework-photos-cleanup');
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cleanup-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;


--
-- Name: save_diag_progress(text, text, text, jsonb, jsonb, uuid, uuid, integer, integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_row       public.diag_results;
  v_subject   text;
  v_student   uuid;
  v_assign    uuid;
  v_feedback  boolean;
  v_answers   jsonb;
  v_completed boolean;
  v_results   jsonb := '{}'::jsonb;
  v_fb        jsonb := '{}'::jsonb;
  v_answered  int := 0;
  v_correct   int := 0;
  v_total     int := 0;
  v_score     int;
  v_type      text;
  q           public.diag_questions;
  a           jsonb;
  ok          boolean;
  sec         jsonb;
begin
  -- Токен короче 16 символов — это не uuid, а попытка перебора.
  if p_token is null or length(p_token) < 16 then
    raise exception 'save_diag_progress: bad owner token';
  end if;

  select * into v_row from public.diag_results where owner_token = p_token for update;

  -- Предмет, ученик и назначение берутся при заведении строки и дальше не
  -- меняются: подменять их на ходу токен права не даёт.
  v_subject := coalesce(v_row.subject, p_subject);
  if v_row.owner_token is not null then
    v_student := v_row.student_id;
    v_assign  := v_row.assignment_id;
  else
    v_student := p_student_id;
    -- Назначение — только настоящее и на этот же тест: по нему открывается
    -- обратная связь с верными ответами.
    select ta.id into v_assign from public.test_assignments ta
    where ta.id = p_assignment_id and ta.subject = v_subject;
  end if;
  v_feedback := v_assign is not null;

  -- Записанный ответ не переписывается: старое значение побеждает при слиянии.
  -- У сданного прогона присланное не учитывается вовсе: иначе ответ функции
  -- (пересчитанный балл) выдавал бы верность новых ответов.
  v_answers := case
    when coalesce(v_row.completed, false) then v_row.answers
    else case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end
         || coalesce(v_row.answers, '{}'::jsonb)
  end;
  v_completed := coalesce(v_row.completed, false) or coalesce(p_completed, false);

  for q in select * from public.diag_questions where subject = v_subject order by position loop
    v_total := v_total + 1;
    a := v_answers -> q.id;
    -- Брошенный на середине прогон считается только по отвеченным: иначе 3/36
    -- вместо 3/3 по первой системе читалось бы как провал.
    if a is null and not v_completed then continue; end if;
    ok := public.diag_is_correct(q, a);
    if a is not null then v_answered := v_answered + 1; end if;
    if ok then v_correct := v_correct + 1; end if;
    sec := coalesce(v_results -> q.section, '{"correct":0,"total":0}'::jsonb);
    v_results := v_results || jsonb_build_object(q.section, jsonb_build_object(
      'correct', (sec->>'correct')::int + ok::int,
      'total',   (sec->>'total')::int + 1));
    if v_feedback and a is not null then
      v_fb := v_fb || jsonb_build_object(q.id, jsonb_build_object(
        'correct', ok,
        'label', coalesce(public.diag_correct_label(q), '')));
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'save_diag_progress: unknown test %', v_subject;
  end if;

  v_score := case
    when v_completed then round(v_correct * 100.0 / v_total)
    when v_answered > 0 then round(v_correct * 100.0 / v_answered)
    else 0 end;

  -- Сданный прогон не переписывается — только отдаём его итог (повтор отправки).
  if not coalesce(v_row.completed, false) then
    insert into public.diag_results as d (
      owner_token, name, subject, results, answers,
      linked_student_id, student_id, assignment_id,
      score_pct, answered, total, completed
    ) values (
      p_token, p_name, v_subject, v_results, v_answers,
      v_student, v_student, v_assign,
      v_score, case when v_completed then v_total else v_answered end, v_total, v_completed
    )
    -- Условие индекса приходится повторить: под ЧАСТИЧНЫЙ уникальный индекс
    -- Postgres цель конфликта сам не подбирает и падает с 42P10.
    on conflict (owner_token) where owner_token is not null do update set
      name      = excluded.name,
      results   = excluded.results,
      answers   = excluded.answers || d.answers,
      score_pct = excluded.score_pct,
      answered  = excluded.answered,
      total     = excluded.total,
      completed = excluded.completed
    where d.completed = false;

    -- Балл в карточку ученика — только по назначению, где он и правда есть.
    if v_completed and v_assign is not null and v_student is not null then
      select ta.assign_type into v_type from public.test_assignments ta
      where ta.id = v_assign
        and (v_student = any(ta.student_ids) or exists (
          select 1 from public.students s where s.id = v_student and s.group_id = any(ta.group_ids)));
      if v_type = 'trial' then
        update public.students set trial_score = v_score where id = v_student;
      elsif v_type is not null then
        update public.students set test_score = v_score where id = v_student;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'completed', v_completed,
    'answered',  v_answered,
    'total',     v_total,
    -- По общей ссылке разбивка — только после сдачи: на ходу она выдавала бы
    -- верность каждого ответа.
    'results',   case when v_completed or v_feedback then v_results end,
    'score_pct', case when v_completed or v_feedback then v_score end,
    'feedback',  case when v_feedback then v_fb end
  );
end
$$;


--
-- Name: schedule_add(uuid, uuid, text, date, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_add(p_group uuid, p_student uuid, p_title text, p_date date, p_time text, p_end text DEFAULT NULL::text, p_notify boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  new_id uuid;
  subj text;
begin
  if _schedule_owner(p_group, p_student) is distinct from auth.uid() then
    raise exception 'Это не ваша группа';
  end if;
  if p_time !~ '^\d{1,2}:\d{2}$' then raise exception 'Время в виде ЧЧ:ММ'; end if;
  if coalesce(btrim(p_title), '') = '' then raise exception 'Нужно название занятия'; end if;
  if p_group is not null and exists (
       select 1 from schedule_lessons sl
        where sl.group_id = p_group and sl.date = p_date
          and lpad(sl.time_start, 5, '0') = lpad(p_time, 5, '0') and sl.status <> 'cancelled') then
    raise exception 'В это время у группы уже есть занятие';
  end if;

  select g.subject into subj from groups g where g.id = p_group;
  insert into schedule_lessons (group_id, student_id, date, time_start, time_end,
                                lesson_title, lesson_number, subject, status, node_type)
  values (p_group, p_student, p_date, lpad(p_time, 5, '0'),
          -- time_end NOT NULL: нет конца — ставим +90 минут.
          coalesce(case when p_end ~ '^\d{1,2}:\d{2}$' then lpad(p_end, 5, '0') end, _hhmm_plus(p_time, 90)),
          btrim(p_title), null, subj, 'upcoming', 'lesson')
  returning id into new_id;

  if p_notify then
    perform _schedule_notify(new_id, 'lesson_moved', 'Новое занятие',
      '«' || btrim(p_title) || '», ' || _schedule_label(p_date, lpad(p_time, 5, '0')));
  end if;
  return jsonb_build_object('undo', jsonb_build_object('created', jsonb_build_array(new_id)), 'id', new_id);
end $_$;


--
-- Name: schedule_cancel(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_cancel(p_id uuid, p_notify boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r schedule_lessons;
  ids uuid[];
  undo jsonb;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;
  select array_agg(id) into ids from _schedule_occasion(p_id);
  undo := _schedule_snapshot(ids);
  update schedule_lessons set status = 'cancelled' where id = any(ids);
  if p_notify then
    perform _schedule_notify(r.id, 'lesson_cancelled', 'Занятие отменено',
      coalesce('«' || nullif(r.lesson_title, '') || '», ', '') || _schedule_label(r.date, r.time_start));
  end if;
  return jsonb_build_object('undo', undo, 'moved', array_length(ids, 1));
end $$;


--
-- Name: schedule_move(uuid, date, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_move(p_id uuid, p_date date, p_time text DEFAULT NULL::text, p_notify boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  r schedule_lessons;
  ids uuid[];
  undo jsonb;
  t text;
  dur int;
  x uuid;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;
  if p_time is not null and p_time !~ '^\d{1,2}:\d{2}$' then raise exception 'Время в виде ЧЧ:ММ'; end if;

  t := coalesce(lpad(p_time, 5, '0'), r.time_start);
  dur := _hhmm_diff(r.time_start, r.time_end);
  select array_agg(id) into ids from _schedule_occasion(p_id);
  undo := _schedule_snapshot(ids);

  if exists (select 1 from schedule_lessons sl
             where sl.group_id = r.group_id and sl.date = p_date
               and lpad(sl.time_start, 5, '0') = lpad(t, 5, '0') and not (sl.id = any(ids))) then
    raise exception 'В это время у группы уже есть занятие';
  end if;

  update schedule_lessons
     set date = p_date, time_start = t,
         time_end = coalesce(_hhmm_plus(t, dur), time_end),
         status = case when status = 'cancelled' then 'upcoming' else status end
   where id = any(ids);
  foreach x in array ids loop perform _schedule_sync_lesson(x, r.date); end loop;

  if p_notify then
    perform _schedule_notify(r.id, 'lesson_moved', 'Занятие перенесено',
      coalesce('«' || nullif(r.lesson_title, '') || '»: ', '') ||
      _schedule_label(r.date, r.time_start) || ' → ' || _schedule_label(p_date, t));
  end if;
  return jsonb_build_object('undo', undo, 'moved', array_length(ids, 1));
end $_$;


--
-- Name: schedule_shift(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_shift(p_id uuid, p_notify boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r schedule_lessons;
  occ record;
  ids uuid[];
  undo jsonb;
  n int;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;

  -- Занятия этой группы (или ученика без группы) с этого и дальше.
  create temp table _occ on commit drop as
    select sl.id, sl.date, lpad(sl.time_start, 5, '0') as t, sl.time_end,
           row_number() over (order by sl.date, lpad(sl.time_start, 5, '0')) as n
    from schedule_lessons sl
    where sl.status <> 'cancelled'
      and sl.node_type is not distinct from r.node_type
      and (case when r.group_id is not null then sl.group_id = r.group_id
                else sl.group_id is null and sl.student_id = r.student_id end)
      and (sl.date, lpad(sl.time_start, 5, '0')) >= (r.date, lpad(r.time_start, 5, '0'));
  select count(*) into n from _occ;
  if n = 0 then raise exception 'Нечего сдвигать'; end if;

  -- Куда встаёт каждое: на место следующего; последнее — через тот же промежуток.
  create temp table _dst on commit drop as
    select a.id, a.date as old_date,
           coalesce(b.date, a.date + coalesce(a.date - p.date, 7)) as date,
           coalesce(b.t, a.t) as t,
           _hhmm_diff(a.t, a.time_end) as dur
    from _occ a
    left join _occ b on b.n = a.n + 1
    left join _occ p on p.n = a.n - 1;

  -- Двойники у учеников едут за строкой группы.
  create temp table _move on commit drop as
    select o.id as row_id, d.old_date, d.date, d.t, d.dur
    from _dst d, _schedule_occasion(d.id) o;

  select array_agg(row_id) into ids from _move;
  undo := _schedule_snapshot(ids);

  -- В два шага: уникальность (группа, дата, время) не отложенная, а места меняются по цепочке.
  update schedule_lessons sl set time_start = sl.id::text from _move m where sl.id = m.row_id;
  update schedule_lessons sl
     set date = m.date, time_start = m.t, time_end = coalesce(_hhmm_plus(m.t, m.dur), sl.time_end)
    from _move m where sl.id = m.row_id;
  perform _schedule_sync_lesson(m.row_id, m.old_date) from _move m;

  if p_notify then
    perform _schedule_notify(r.id, 'lesson_moved', 'Расписание сдвинуто',
      coalesce('«' || nullif(r.lesson_title, '') || '» и следующие занятия', 'Занятия') ||
      ' сдвинуты на одно вперёд, начиная с ' || _schedule_label(r.date, null));
  end if;
  return jsonb_build_object('undo', undo, 'moved', n);
end $$;


--
-- Name: schedule_undo(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_undo(p_undo jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  x jsonb;
begin
  if exists (select 1 from jsonb_array_elements(p_undo -> 'rows') e
             join schedule_lessons sl on sl.id = (e ->> 'id')::uuid
             where _schedule_owner(sl.group_id, sl.student_id) is distinct from auth.uid()) then
    raise exception 'Это занятие не ваше';
  end if;
  update schedule_lessons sl set time_start = sl.id::text
    from jsonb_array_elements(p_undo -> 'rows') e where sl.id = (e ->> 'id')::uuid;
  for x in select * from jsonb_array_elements(p_undo -> 'rows') loop
    update schedule_lessons
       set date = (x ->> 'date')::date, time_start = x ->> 'time_start',
           time_end = x ->> 'time_end', status = x ->> 'status'
     where id = (x ->> 'id')::uuid;
  end loop;
  for x in select * from jsonb_array_elements(p_undo -> 'lessons') loop
    update lessons
       set scheduled_date = x ->> 'scheduled_date', scheduled_time = x ->> 'scheduled_time',
           rec_date = x ->> 'rec_date', rec_time = x ->> 'rec_time'
     where id = (x ->> 'id')::uuid
       and id in (select sl.lesson_id from jsonb_array_elements(p_undo -> 'rows') e
                  join schedule_lessons sl on sl.id = (e ->> 'id')::uuid);
  end loop;
  for x in select * from jsonb_array_elements(p_undo -> 'homework') loop
    update homework set due_date = (x ->> 'due_date')::date
     where id = (x ->> 'id')::uuid
       and lesson_id in (select sl.lesson_id from jsonb_array_elements(p_undo -> 'rows') e
                         join schedule_lessons sl on sl.id = (e ->> 'id')::uuid);
  end loop;
  -- Откат добавления: удалить созданные «+» строки, только свои.
  delete from schedule_lessons
   where id in (select e::uuid from jsonb_array_elements_text(coalesce(p_undo -> 'created', '[]'::jsonb)) e)
     and _schedule_owner(group_id, student_id) is not distinct from auth.uid();
end $$;


--
-- Name: seed_student_progress(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_student_progress(p_student_id uuid, p_group_id uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  INSERT INTO lesson_progress (student_id, lesson_ref, subject, status)
  SELECT DISTINCT ON (lp.lesson_ref)
    p_student_id,
    lp.lesson_ref,
    lp.subject,
    'current'
  FROM lesson_progress lp
  JOIN students s ON s.id = lp.student_id
  WHERE s.group_id = p_group_id
    AND s.id != p_student_id
    AND lp.status != 'locked'
  ON CONFLICT (student_id, lesson_ref) DO NOTHING;
$$;


--
-- Name: set_course_order(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_course_order(p_student uuid, p_courses uuid[]) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
with rows as (
  select id, group_id from public.person_student_rows(p_student)
),
ord as (
  select cid, (ordinality - 1)::smallint pos
  from unnest(coalesce(p_courses, '{}'::uuid[])) with ordinality t(cid, ordinality)
),
tgt as (
  select o.cid, o.pos,
         coalesce(
           (select r.id from rows r where c.student_ids @> array[r.id] limit 1),
           (select r.id from rows r where r.group_id is not null and c.group_ids @> array[r.group_id] limit 1)
         ) owner
    from ord o
    join public.courses c on c.id = o.cid
)
insert into public.course_enrollments (course_id, student_id, access_mode, position)
select cid, owner::text, 'custom', pos from tgt where owner is not null
on conflict (course_id, student_id) do update set position = excluded.position;
$$;


--
-- Name: set_my_avatar(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_my_avatar(p_path text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> me::text then
    raise exception 'avatar path outside own folder';
  end if;
  update public.students set avatar_path = p_path where auth_user_id = me;
end; $$;


--
-- Name: set_student_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_student_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare owner uuid;
begin
  if new.group_id is not null then
    select created_by into owner from public.groups where id = new.group_id;
    if owner is null then raise exception 'Group has no owner'; end if;
    if new.created_by is not null and new.created_by <> owner and not public.is_admin() then raise exception 'Student and group owners differ'; end if;
    new.created_by := owner;
  end if;
  if new.created_by is null then raise exception 'Student requires an owner'; end if;
  if not public.is_admin() and pg_trigger_depth() <= 1 and (tg_op = 'INSERT' or old.person_id is distinct from new.person_id)
    and exists(select 1 from public.students s where s.person_id = new.person_id and s.created_by <> new.created_by) then raise exception 'Person belongs to another teacher'; end if;
  if tg_op = 'UPDATE' and old.created_by is distinct from new.created_by and not public.is_admin() and pg_trigger_depth() <= 1 then raise exception 'Student owner cannot change'; end if;
  return new;
end $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: storage_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.storage_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'db_limit_bytes', 524288000,            -- Supabase Free Postgres: 500 MB
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_limit_bytes', 1073741824,      -- Supabase Free Storage: 1 GB
    'storage_objects', (select count(*) from storage.objects),
    -- Base64 photos + whiteboards live inline in lesson_progress JSONB columns.
    'attachments_bytes', coalesce((
      select sum(coalesce(octet_length(attachments::text),0) + coalesce(octet_length(review_attachments::text),0))
      from lesson_progress), 0),
    'attachments_rows', (
      select count(*) from lesson_progress
      where attachments is not null or review_attachments is not null),
    'tables', (
      select jsonb_agg(t order by t->>'bytes' desc)
      from (
        select jsonb_build_object(
          'name', relname,
          'bytes', pg_total_relation_size(relid),
          'rows', n_live_tup
        ) as t
        from pg_stat_user_tables
        where schemaname = 'public'
        order by pg_total_relation_size(relid) desc
        limit 12
      ) s)
  ) into result;
  return result;
end;
$$;


--
-- Name: student_owns_group(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_owns_group(p_group uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.students s
    where s.group_id = p_group and s.auth_user_id = auth.uid()
  );
$$;


--
-- Name: student_track(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_track(p_student uuid, p_group uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
with scope as (
  select r.id, r.group_id from public.person_student_rows(p_student) r
  union
  select s.id, s.group_id from public.students s
   where auth.uid() is not null and s.auth_user_id = auth.uid()
),
sc as (
  select coalesce(array_agg(distinct id) filter (where id is not null), '{}')::uuid[] ids,
         coalesce(array_agg(distinct group_id) filter (where group_id is not null), '{}')::uuid[] gids
  from scope
),
cs as (
  select c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids, c.created_at
  from public.courses c, sc
  where c.status = 'published'
    and (c.student_ids && sc.ids or c.group_ids && sc.gids)
)
select jsonb_build_object(
  'rows', (select coalesce(jsonb_agg(jsonb_build_array(id, group_id)), '[]'::jsonb) from scope),
  'modes', (select coalesce(jsonb_object_agg(e.course_id::text, e.access_mode), '{}'::jsonb)
              from public.course_enrollments e, sc
             where e.student_id = any(sc.ids::text[])
               and e.course_id in (select id from cs)),
  'pos', (select coalesce(jsonb_object_agg(e.course_id::text, e.position), '{}'::jsonb)
            from public.course_enrollments e, sc
           where e.student_id = any(sc.ids::text[])
             and e.position is not null
             and e.course_id in (select id from cs)),
  'hard', (select coalesce(jsonb_agg(jsonb_build_array(h.lesson_id, h.hard_tasks) order by h.created_at), '[]'::jsonb)
             from public.homework h, sc
            where h.group_id = any(sc.gids)
              and h.lesson_id is not null
              and h.status = 'active'
              and h.hard_tasks is not null),
  'progress', (select coalesce(jsonb_agg(jsonb_build_array(
                 p.lesson_ref, p.subject, p.status, p.score, p.comment,
                 p.review_comment, p.hard_submitted)), '[]'::jsonb)
                 from public.lesson_progress p, sc
                where p.student_id = any(sc.ids)),
  'courses', (select coalesce(jsonb_agg(jsonb_build_array(
        c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids,
        (select coalesce(jsonb_agg(jsonb_build_array(m.position, m.label,
              (select coalesce(jsonb_agg(jsonb_build_array(
                    l.id, l.short_id, l.title, l.lesson_number, l.shape, l.has_hard,
                    l.youtube_url, l.timecodes, l.kind, l.test_tasks,
                    l.scheduled_date, l.scheduled_time, l.rec_date, l.rec_time,
                    l.lesson_sched_manual, l.materials)
                  order by l.lesson_number), '[]'::jsonb)
               from public.lessons l where l.module_id = m.id))
            order by m.position), '[]'::jsonb)
         from public.course_modules m where m.course_id = c.id)
      ) order by c.created_at), '[]'::jsonb) from cs c)
)
$$;


--
-- Name: subject_colors_for_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.subject_colors_for_student(p_student uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(p.subject_colors, '{}'::jsonb)
    from public.students s
    join public.groups g on g.id = s.group_id
    join public.profiles p on p.id = g.created_by
   where s.id = p_student
     and (
       s.auth_user_id = auth.uid()
       or g.created_by = auth.uid()
       or public.is_admin()
     )
   limit 1;
$$;


--
-- Name: sync_group_student_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_group_student_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.students set created_by = new.created_by where group_id = new.id;
  return new;
end $$;


--
-- Name: sync_student_last_visit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_student_last_visit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.students
    SET last_visit = NEW.last_sign_in_at
    WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: teacher_finance_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.teacher_finance_summary(p_teacher_id uuid) RETURNS TABLE(received bigint, expected bigint, debt bigint, forecast bigint)
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  select
    coalesce((
      select sum(p.amount) from public.payments p
      where p.teacher_id = p_teacher_id
        and date_trunc('month', p.paid_at) = date_trunc('month', now())
    ), 0)::bigint,
    coalesce((
      select sum(s.payment_amount) from public.students s
      where s.payment_due >= current_date
        and s.payment_due < date_trunc('month', now()) + interval '1 month'
    ), 0)::bigint,
    coalesce((
      select sum(s.payment_amount) from public.students s
      where s.payment_due < current_date
        and coalesce(s.payment_amount, 0) > 0
    ), 0)::bigint,
    coalesce((
      select sum(p.amount) from public.payments p
      where p.teacher_id = p_teacher_id
        and date_trunc('month', p.paid_at) = date_trunc('month', now())
    ), 0)::bigint +
    coalesce((
      select sum(s.payment_amount) from public.students s
      where s.payment_due >= current_date
        and s.payment_due < date_trunc('month', now()) + interval '1 month'
    ), 0)::bigint;
$$;


--
-- Name: tts_spend_add(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tts_spend_add(n integer) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.tts_spend (day, chars) values (current_date, n)
  on conflict (day) do update set chars = public.tts_spend.chars + excluded.chars
  returning chars;
$$;


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    student_id uuid,
    role text,
    session_id text,
    event text NOT NULL,
    path text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    ua text
);


--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.analytics_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analytics_issue_resolutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_issue_resolutions (
    signature text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_by uuid,
    app_version text,
    note text,
    snapshot jsonb
);


--
-- Name: analytics_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    period_days integer NOT NULL,
    model text NOT NULL,
    body text NOT NULL,
    stats jsonb NOT NULL,
    tokens_in integer,
    tokens_out integer
);


--
-- Name: app_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_flags (
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    about text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: app_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_seasons (
    key text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    variant text DEFAULT 'lanterns'::text NOT NULL,
    parts jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT app_seasons_variant_check CHECK ((variant = ANY (ARRAY['lanterns'::text, 'candy'::text, 'potions'::text])))
);


--
-- Name: card_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    author_student_id uuid,
    lang text NOT NULL,
    subject text,
    title text NOT NULL,
    about text DEFAULT ''::text NOT NULL,
    level text,
    sort integer DEFAULT 0 NOT NULL,
    student_ids text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT card_groups_author_chk CHECK ((((created_by IS NOT NULL) AND (author_student_id IS NULL)) OR ((created_by IS NULL) AND (author_student_id IS NOT NULL))))
);


--
-- Name: card_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    title text NOT NULL,
    about text DEFAULT ''::text NOT NULL,
    level text,
    sort integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_set_id uuid
);


--
-- Name: COLUMN card_sets.parent_set_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_sets.parent_set_id IS 'Родительский набор. NULL — обычный набор второго уровня; заполнено — стопка внутри набора (серия внутри сезона). Глубже двух уровней запрещено триггером.';


--
-- Name: chembio_dirty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chembio_dirty (
    teacher_id uuid NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chembio_taskly_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chembio_taskly_teachers (
    teacher_id uuid NOT NULL
);


--
-- Name: confidence_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.confidence_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id text,
    anon_name text,
    subject text,
    source text DEFAULT 'diagnostic'::text NOT NULL,
    confident boolean NOT NULL,
    correct boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    student_id text NOT NULL,
    access_mode text DEFAULT 'custom'::text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    "position" smallint,
    CONSTRAINT course_enrollments_access_mode_check CHECK ((access_mode = ANY (ARRAY['full'::text, 'custom'::text, 'by_date'::text])))
);


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_reactions (
    id text NOT NULL,
    equation text NOT NULL,
    name text NOT NULL,
    lesson text NOT NULL,
    module integer NOT NULL,
    emoji text DEFAULT ''::text,
    gradient text DEFAULT ''::text,
    paragraph text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: course_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_shares (
    course_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text DEFAULT 'course'::text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    level text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    color text DEFAULT '#B98FFF'::text NOT NULL,
    bg text DEFAULT '#EFE0FF'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    short_id text,
    group_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    student_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    published_at timestamp with time zone,
    seed_stamp text,
    CONSTRAINT courses_kind_check CHECK ((kind = ANY (ARRAY['course'::text, 'intensive'::text]))),
    CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: COLUMN courses.seed_stamp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.seed_stamp IS 'Отпечаток содержимого сида на момент последней синхронизации (SEED_CARDS[key].stamp). NULL — синхронизации не было или она была до появления отпечатков.';


--
-- Name: curriculum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum (
    subject text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT curriculum_subject_check CHECK ((subject = ANY (ARRAY['biology'::text, 'chemistry'::text])))
);


--
-- Name: custom_diag_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_diag_tests (
    id text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    accent text DEFAULT '#786AD7'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    icon_key text,
    chip text DEFAULT 'Диагностика'::text NOT NULL,
    subject text,
    show_done_label boolean DEFAULT false NOT NULL,
    done_label text,
    level text
);


--
-- Name: deck_stickers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deck_stickers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    deck_key text NOT NULL,
    deck_title text DEFAULT ''::text NOT NULL,
    subject text,
    score smallint NOT NULL,
    cards smallint DEFAULT 0 NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deck_stickers_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: desk_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.desk_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    desks jsonb DEFAULT '[]'::jsonb NOT NULL,
    active_desk_id text DEFAULT 'today'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: diag_question_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diag_question_defaults (
    subject text NOT NULL,
    questions jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: diag_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diag_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    subject text NOT NULL,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    linked_student_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    assignment_id uuid,
    student_id uuid,
    score_pct integer,
    owner_token text,
    answered integer,
    total integer,
    completed boolean DEFAULT true NOT NULL
);


--
-- Name: feed_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id text NOT NULL,
    lang text DEFAULT ''::text NOT NULL,
    group_id uuid,
    student_id uuid,
    author_user uuid,
    author_name text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    parent_id uuid,
    hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feed_comments_author_ck CHECK ((((student_id IS NOT NULL) AND (author_user IS NULL)) OR ((student_id IS NULL) AND (author_user IS NOT NULL)))),
    CONSTRAINT feed_comments_body_check CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 2000)))
);


--
-- Name: feed_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id text NOT NULL,
    group_id uuid,
    student_id uuid,
    author_user uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feed_likes_author_ck CHECK ((((student_id IS NOT NULL) AND (author_user IS NULL)) OR ((student_id IS NULL) AND (author_user IS NOT NULL))))
);


--
-- Name: feedback_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_role text NOT NULL,
    author_id text,
    author_name text,
    section text,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contact text,
    CONSTRAINT feedback_requests_author_role_check CHECK ((author_role = ANY (ARRAY['teacher'::text, 'student'::text, 'lead'::text]))),
    CONSTRAINT feedback_requests_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    icon text DEFAULT '📚'::text NOT NULL,
    level text DEFAULT ''::text NOT NULL,
    color text DEFAULT '#9B6DFF'::text NOT NULL,
    color_soft text DEFAULT '#E4D9FF'::text NOT NULL,
    start_date date,
    total_lessons integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_individual boolean DEFAULT false NOT NULL,
    tracks jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: COLUMN groups.tracks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.tracks IS 'Extra subject tracks: [{"subject": "...", "level": "..."}]; primary track lives in subject/level columns.';


--
-- Name: homework; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    due_date date,
    status text DEFAULT 'active'::text NOT NULL,
    task_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_students integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_count integer DEFAULT 0 NOT NULL,
    assigned_at date,
    lesson_id uuid,
    hard_task_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    hard_total integer DEFAULT 0 NOT NULL,
    hard_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    basic_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT homework_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


--
-- Name: hw_ai_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hw_ai_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    progress_id uuid NOT NULL,
    student_id uuid NOT NULL,
    lesson_ref text NOT NULL,
    homework_id uuid,
    teacher_id uuid,
    subject text NOT NULL,
    exam text,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    result jsonb,
    primary_score integer,
    max_score integer,
    score integer,
    comment text,
    model text,
    graded_at timestamp with time zone,
    error text,
    final_score integer,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'basic'::text NOT NULL,
    CONSTRAINT hw_ai_grades_kind_check CHECK ((kind = ANY (ARRAY['basic'::text, 'hard'::text]))),
    CONSTRAINT hw_ai_grades_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'working'::text, 'graded'::text, 'confirmed'::text, 'changed'::text, 'error'::text, 'skipped'::text, 'dismissed'::text])))
);


--
-- Name: lesson_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    group_id uuid,
    lesson_date date NOT NULL,
    present boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    grade smallint,
    lesson_title text
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    lesson_ref text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'locked'::text NOT NULL,
    score integer DEFAULT 0,
    comment text DEFAULT ''::text,
    updated_at timestamp with time zone DEFAULT now(),
    hard_submitted boolean DEFAULT false NOT NULL,
    review_comment text,
    attachments jsonb DEFAULT '{}'::jsonb NOT NULL,
    review_attachments jsonb,
    CONSTRAINT lesson_progress_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'returned'::text, 'unviewed'::text, 'submitted'::text, 'current'::text, 'locked'::text])))
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    trainer_id uuid,
    widget_id uuid,
    youtube_url text,
    description text,
    materials jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    module_id uuid,
    short_id text,
    shape text DEFAULT 'circle'::text,
    lesson_number integer DEFAULT 0,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    timecodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    kind text DEFAULT 'lesson'::text NOT NULL,
    test_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    scheduled_date text,
    scheduled_time text,
    scheduled_duration integer,
    rec_date text,
    rec_time text,
    rec_duration integer,
    lesson_sched_manual boolean DEFAULT false NOT NULL,
    homework jsonb DEFAULT '{}'::jsonb NOT NULL,
    has_hard boolean GENERATED ALWAYS AS (public.lesson_hw_has_hard(homework)) STORED,
    CONSTRAINT lessons_shape_check CHECK ((shape = ANY (ARRAY['circle'::text, 'square'::text, 'diamond'::text])))
);


--
-- Name: COLUMN lessons.materials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.materials IS 'Файлы урока: {"workbook": F|null, "notebook": F|null, "materials": [F]}, где F = {id, name, path, size, mime}. path — ключ объекта в бакете lesson-materials.';


--
-- Name: COLUMN lessons.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.content IS 'Authored lesson content override: { paragraphs:[{id,text}], quiz:[...], hardTask:{...} }. Empty {} falls back to code defaults.';


--
-- Name: COLUMN lessons.timecodes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.timecodes IS 'Video chapter timecodes: [{ time, label, seconds }] for the lesson recording.';


--
-- Name: COLUMN lessons.has_hard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.has_hard IS 'Есть ли у урока сложный уровень (зеркало lessonHasHardLevel). Нужен треку ученика, чтобы не тянуть колонку homework целиком.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_role text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    link jsonb,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_recipient_role_check CHECK ((recipient_role = ANY (ARRAY['student'::text, 'teacher'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid,
    amount integer NOT NULL,
    lessons_paid integer DEFAULT 0 NOT NULL,
    note text,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > 0))
);


--
-- Name: phrase_gaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phrase_gaps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id text NOT NULL,
    lang text NOT NULL,
    ru text NOT NULL,
    en text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    done_at timestamp with time zone,
    CONSTRAINT phrase_gaps_ru_check CHECK (((length(btrim(ru)) >= 1) AND (length(btrim(ru)) <= 500)))
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    code text NOT NULL,
    name text NOT NULL,
    price_rub integer DEFAULT 0 NOT NULL,
    max_students integer,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    price_usd integer DEFAULT 0 NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text DEFAULT 'student'::text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    initials text DEFAULT ''::text NOT NULL,
    color text DEFAULT '#9B6DFF'::text NOT NULL,
    phone text,
    telegram text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    test_color_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    first_name text,
    last_name text,
    subject text,
    username text,
    hidden_tabs text[] DEFAULT '{}'::text[] NOT NULL,
    hidden_widgets text[] DEFAULT '{}'::text[] NOT NULL,
    subjects text[] DEFAULT '{}'::text[] NOT NULL,
    subject_colors jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['teacher'::text, 'student'::text])))
);


--
-- Name: COLUMN profiles.subject_colors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.subject_colors IS 'Карта id предмета → hex акцента ("english" → "#E4572E"). Пусто = цвет из реестра.';


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id text NOT NULL,
    title text NOT NULL,
    subject text DEFAULT 'Химия'::text NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: review_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id text,
    anon_name text,
    subject text,
    source text DEFAULT 'manual'::text NOT NULL,
    prompt text NOT NULL,
    answer text NOT NULL,
    options jsonb,
    ease real DEFAULT 2.5 NOT NULL,
    interval_days integer DEFAULT 0 NOT NULL,
    reps integer DEFAULT 0 NOT NULL,
    lapses integer DEFAULT 0 NOT NULL,
    due_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stability real,
    difficulty real,
    CONSTRAINT review_cards_difficulty_range CHECK (((difficulty IS NULL) OR ((difficulty >= (1)::double precision) AND (difficulty <= (10)::double precision)))),
    CONSTRAINT review_cards_stability_nonneg CHECK (((stability IS NULL) OR (stability >= (0)::double precision)))
);


--
-- Name: schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    time_start text DEFAULT '09:00'::text NOT NULL,
    time_end text DEFAULT '10:30'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedule_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: science_facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.science_facts (
    id text NOT NULL,
    subject text NOT NULL,
    emoji text DEFAULT ''::text,
    body text NOT NULL,
    gradient text DEFAULT ''::text,
    image text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: science_memes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.science_memes (
    id text NOT NULL,
    subject text NOT NULL,
    emoji text DEFAULT ''::text,
    setup text NOT NULL,
    punchline text NOT NULL,
    gradient text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: screening_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_config (
    id text DEFAULT 'default'::text NOT NULL,
    config jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: set_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.set_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid NOT NULL,
    term text NOT NULL,
    ru text NOT NULL,
    reading text,
    note text,
    ep text,
    ex jsonb,
    sort integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    name text DEFAULT ''::text NOT NULL,
    phone text,
    telegram_link text,
    parent_contact text,
    started_at date,
    desired_score integer DEFAULT 80 NOT NULL,
    comment text,
    payment_due date,
    payment_amount integer,
    last_payment date,
    debt integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invite_token uuid DEFAULT gen_random_uuid(),
    auth_user_id uuid,
    email text,
    temp_password text,
    hw_score integer DEFAULT 0 NOT NULL,
    test_score integer DEFAULT 0 NOT NULL,
    trial_score integer,
    attendance integer DEFAULT 0 NOT NULL,
    last_visit date,
    preferences jsonb DEFAULT '{}'::jsonb,
    lesson_balance integer DEFAULT 0 NOT NULL,
    hidden_widgets integer[] DEFAULT '{}'::integer[] NOT NULL,
    person_id uuid DEFAULT gen_random_uuid(),
    avatar_path text,
    created_by uuid DEFAULT auth.uid()
);


--
-- Name: COLUMN students.hidden_widgets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.hidden_widgets IS 'Widget ids (see src/data/widgets.ts WIDGET_META) the teacher hid for this student; filtered out of the dashboard carousel and reorder modal.';


--
-- Name: COLUMN students.avatar_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.avatar_path IS 'Фото профиля ученика: ключ объекта в бакете avatars (<auth uid>/<мс>.webp). Пишет только set_my_avatar().';


--
-- Name: task_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_bank (
    id bigint NOT NULL,
    subject text NOT NULL,
    section text DEFAULT ''::text,
    topic text DEFAULT ''::text,
    part smallint DEFAULT 1,
    line integer DEFAULT 1,
    source text DEFAULT ''::text NOT NULL,
    question text DEFAULT ''::text NOT NULL,
    answer text DEFAULT ''::text NOT NULL,
    solution text DEFAULT ''::text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    question_table jsonb,
    question_image text,
    question_type text,
    score_mode text,
    choices jsonb,
    answer_keys jsonb,
    criteria jsonb,
    criteria_visible_on_check boolean DEFAULT false NOT NULL,
    max_points integer DEFAULT 1 NOT NULL,
    answer_type text,
    match_left jsonb,
    match_right jsonb,
    sequence_items jsonb,
    allow_photo boolean DEFAULT false NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    question_image_size text,
    block_order jsonb,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT task_bank_answer_type_check CHECK (((answer_type IS NULL) OR (answer_type = ANY (ARRAY['single'::text, 'multi'::text, 'fill'::text, 'extended'::text, 'matching'::text, 'sequence'::text, 'tableFill'::text, 'whiteboard'::text, 'wordBank'::text, 'listenType'::text, 'listenBank'::text, 'minimalPair'::text, 'speaking'::text, 'imageDescribe'::text, 'imageCompare'::text, 'flashcard'::text, 'pattern'::text, 'trace'::text, 'buildSyllable'::text, 'videoWatch'::text, 'unscramble'::text, 'blockOrder'::text, 'charBank'::text, 'jamoType'::text, 'dialogGap'::text, 'wordDrop'::text, 'crossword'::text, 'trueFalse'::text, 'dropdownGap'::text, 'columnSort'::text, 'embed'::text, 'short'::text, 'text'::text, 'choice'::text, 'match'::text, 'table'::text])))),
    CONSTRAINT task_bank_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT task_bank_part_check CHECK ((part = ANY (ARRAY[1, 2]))),
    CONSTRAINT task_bank_question_image_size_check CHECK ((question_image_size = ANY (ARRAY['sm'::text, 'md'::text, 'lg'::text, 'full'::text]))),
    CONSTRAINT task_bank_question_type_check CHECK ((question_type = ANY (ARRAY['choice'::text, 'free'::text]))),
    CONSTRAINT task_bank_score_mode_check CHECK ((score_mode = ANY (ARRAY['perOption'::text, 'criteria'::text, 'whole'::text])))
);


--
-- Name: COLUMN task_bank.section; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_bank.section IS 'Раздел кодификатора. Только у экзаменационных предметов; у языков null.';


--
-- Name: COLUMN task_bank.topic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_bank.topic IS 'Тема кодификатора. Только у экзаменационных предметов; у языков null.';


--
-- Name: COLUMN task_bank.part; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_bank.part IS 'Часть экзамена (1 или 2). Только у экзаменационных предметов; у языков null.';


--
-- Name: COLUMN task_bank.line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_bank.line IS 'Номер линии в экзамене. Только у экзаменационных предметов; у языков null.';


--
-- Name: COLUMN task_bank.payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_bank.payload IS 'Данные, специфичные для типа задания (TaskPayload, src/data/taskTypes.ts): sentence/distractors у сборки предложения, audio_url/tts_text у аудио, pair_a/pair_b/correct_pair у минимальных пар, front/back у карточки, passage у чтения. Заведена вместо колонки-на-тип: новый тип задания не требует миграции схемы.';


--
-- Name: task_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.task_bank ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.task_bank_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: teacher_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_invites (
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    hidden_tabs text[] DEFAULT '{}'::text[] NOT NULL,
    hidden_widgets text[] DEFAULT '{}'::text[] NOT NULL,
    course_assignments jsonb DEFAULT '[]'::jsonb NOT NULL,
    group_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    consumed_at timestamp with time zone,
    consumed_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    subjects text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: teacher_module_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_module_secrets (
    teacher_id uuid NOT NULL,
    module text NOT NULL,
    token text NOT NULL
);


--
-- Name: teacher_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_modules (
    teacher_id uuid NOT NULL,
    module text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teacher_modules_module_check CHECK ((module = 'testly'::text))
);


--
-- Name: teacher_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_subscriptions (
    teacher_id uuid NOT NULL,
    plan_code text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid DEFAULT auth.uid() NOT NULL,
    type_id text,
    type_label text,
    type_bg text,
    type_color text,
    title text DEFAULT ''::text NOT NULL,
    date text DEFAULT ''::text NOT NULL,
    "time" text DEFAULT ''::text NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid,
    group_id uuid
);


--
-- Name: test_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    assign_type text DEFAULT 'test'::text NOT NULL,
    group_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    student_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed boolean DEFAULT false NOT NULL,
    created_by uuid DEFAULT auth.uid()
);


--
-- Name: tg_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tg_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    direction text NOT NULL,
    text text NOT NULL,
    tg_message_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tg_messages_direction_check CHECK ((direction = ANY (ARRAY['in'::text, 'out'::text])))
);


--
-- Name: tg_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tg_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id bigint NOT NULL,
    username text,
    first_name text,
    last_name text,
    status text DEFAULT 'new'::text NOT NULL,
    last_message_text text,
    last_message_at timestamp with time zone,
    last_in_at timestamp with time zone,
    admin_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tg_threads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: trainer_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainer_questions (
    trainer_id uuid NOT NULL,
    task_id bigint NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


--
-- Name: trainers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    topic text DEFAULT ''::text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    time_per_question integer DEFAULT 2 NOT NULL,
    color text DEFAULT '#9B6DFF'::text NOT NULL,
    bg text DEFAULT '#E4D9FF'::text NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT trainers_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: tts_spend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tts_spend (
    day date NOT NULL,
    chars integer DEFAULT 0 NOT NULL
);


--
-- Name: widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'quiz'::text NOT NULL,
    linked_trainer_id uuid,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    color text DEFAULT '#7B3FCC'::text NOT NULL,
    bg text DEFAULT '#EEDBFF'::text NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: analytics_issue_resolutions analytics_issue_resolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_issue_resolutions
    ADD CONSTRAINT analytics_issue_resolutions_pkey PRIMARY KEY (signature);


--
-- Name: analytics_reports analytics_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_reports
    ADD CONSTRAINT analytics_reports_pkey PRIMARY KEY (id);


--
-- Name: app_flags app_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_flags
    ADD CONSTRAINT app_flags_pkey PRIMARY KEY (key);


--
-- Name: app_seasons app_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_seasons
    ADD CONSTRAINT app_seasons_pkey PRIMARY KEY (key);


--
-- Name: card_groups card_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_groups
    ADD CONSTRAINT card_groups_pkey PRIMARY KEY (id);


--
-- Name: card_sets card_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_sets
    ADD CONSTRAINT card_sets_pkey PRIMARY KEY (id);


--
-- Name: chembio_dirty chembio_dirty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chembio_dirty
    ADD CONSTRAINT chembio_dirty_pkey PRIMARY KEY (teacher_id);


--
-- Name: chembio_taskly_teachers chembio_taskly_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chembio_taskly_teachers
    ADD CONSTRAINT chembio_taskly_teachers_pkey PRIMARY KEY (teacher_id);


--
-- Name: confidence_log confidence_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.confidence_log
    ADD CONSTRAINT confidence_log_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_course_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_course_id_student_id_key UNIQUE (course_id, student_id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: course_reactions course_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_reactions
    ADD CONSTRAINT course_reactions_pkey PRIMARY KEY (id);


--
-- Name: course_shares course_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_shares
    ADD CONSTRAINT course_shares_pkey PRIMARY KEY (course_id, teacher_id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_short_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_short_id_key UNIQUE (short_id);


--
-- Name: curriculum curriculum_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum
    ADD CONSTRAINT curriculum_pkey PRIMARY KEY (subject);


--
-- Name: custom_diag_tests custom_diag_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_diag_tests
    ADD CONSTRAINT custom_diag_tests_pkey PRIMARY KEY (id);


--
-- Name: deck_stickers deck_stickers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck_stickers
    ADD CONSTRAINT deck_stickers_pkey PRIMARY KEY (id);


--
-- Name: deck_stickers deck_stickers_student_id_deck_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck_stickers
    ADD CONSTRAINT deck_stickers_student_id_deck_key_key UNIQUE (student_id, deck_key);


--
-- Name: desk_layouts desk_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_layouts
    ADD CONSTRAINT desk_layouts_pkey PRIMARY KEY (id);


--
-- Name: desk_layouts desk_layouts_teacher_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_layouts
    ADD CONSTRAINT desk_layouts_teacher_id_key UNIQUE (teacher_id);


--
-- Name: diag_question_defaults diag_question_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diag_question_defaults
    ADD CONSTRAINT diag_question_defaults_pkey PRIMARY KEY (subject);


--
-- Name: diag_questions diag_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diag_questions
    ADD CONSTRAINT diag_questions_pkey PRIMARY KEY (id);


--
-- Name: diag_results diag_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diag_results
    ADD CONSTRAINT diag_results_pkey PRIMARY KEY (id);


--
-- Name: feed_comments feed_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_pkey PRIMARY KEY (id);


--
-- Name: feed_likes feed_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_pkey PRIMARY KEY (id);


--
-- Name: feedback_requests feedback_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_requests
    ADD CONSTRAINT feedback_requests_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: homework homework_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_pkey PRIMARY KEY (id);


--
-- Name: hw_ai_grades hw_ai_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_pkey PRIMARY KEY (id);


--
-- Name: hw_ai_grades hw_ai_grades_progress_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_progress_id_key UNIQUE (progress_id);


--
-- Name: lesson_attendance lesson_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attendance
    ADD CONSTRAINT lesson_attendance_pkey PRIMARY KEY (id);


--
-- Name: lesson_attendance lesson_attendance_student_id_lesson_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attendance
    ADD CONSTRAINT lesson_attendance_student_id_lesson_date_key UNIQUE (student_id, lesson_date);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_student_id_lesson_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_student_id_lesson_ref_key UNIQUE (student_id, lesson_ref);


--
-- Name: lesson_progress lesson_progress_student_lesson_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_student_lesson_unique UNIQUE (student_id, lesson_ref);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_short_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_short_id_key UNIQUE (short_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: phrase_gaps phrase_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase_gaps
    ADD CONSTRAINT phrase_gaps_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: review_cards review_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_cards
    ADD CONSTRAINT review_cards_pkey PRIMARY KEY (id);


--
-- Name: schedule_lessons schedule_lessons_group_id_date_time_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_lessons
    ADD CONSTRAINT schedule_lessons_group_id_date_time_start_key UNIQUE (group_id, date, time_start);


--
-- Name: schedule_lessons schedule_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_lessons
    ADD CONSTRAINT schedule_lessons_pkey PRIMARY KEY (id);


--
-- Name: schedule schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (id);


--
-- Name: science_facts science_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.science_facts
    ADD CONSTRAINT science_facts_pkey PRIMARY KEY (id);


--
-- Name: science_memes science_memes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.science_memes
    ADD CONSTRAINT science_memes_pkey PRIMARY KEY (id);


--
-- Name: screening_config screening_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_config
    ADD CONSTRAINT screening_config_pkey PRIMARY KEY (id);


--
-- Name: set_cards set_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_cards
    ADD CONSTRAINT set_cards_pkey PRIMARY KEY (id);


--
-- Name: students students_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_invite_token_key UNIQUE (invite_token);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: task_bank task_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_bank
    ADD CONSTRAINT task_bank_pkey PRIMARY KEY (id);


--
-- Name: teacher_invites teacher_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_invites
    ADD CONSTRAINT teacher_invites_pkey PRIMARY KEY (token);


--
-- Name: teacher_module_secrets teacher_module_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_module_secrets
    ADD CONSTRAINT teacher_module_secrets_pkey PRIMARY KEY (teacher_id, module);


--
-- Name: teacher_modules teacher_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_modules
    ADD CONSTRAINT teacher_modules_pkey PRIMARY KEY (teacher_id, module);


--
-- Name: teacher_subscriptions teacher_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subscriptions
    ADD CONSTRAINT teacher_subscriptions_pkey PRIMARY KEY (teacher_id);


--
-- Name: teacher_tasks teacher_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_tasks
    ADD CONSTRAINT teacher_tasks_pkey PRIMARY KEY (id);


--
-- Name: test_assignments test_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_pkey PRIMARY KEY (id);


--
-- Name: tg_messages tg_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tg_messages
    ADD CONSTRAINT tg_messages_pkey PRIMARY KEY (id);


--
-- Name: tg_threads tg_threads_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tg_threads
    ADD CONSTRAINT tg_threads_chat_id_key UNIQUE (chat_id);


--
-- Name: tg_threads tg_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tg_threads
    ADD CONSTRAINT tg_threads_pkey PRIMARY KEY (id);


--
-- Name: trainer_questions trainer_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_questions
    ADD CONSTRAINT trainer_questions_pkey PRIMARY KEY (trainer_id, task_id);


--
-- Name: trainers trainers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);


--
-- Name: tts_spend tts_spend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tts_spend
    ADD CONSTRAINT tts_spend_pkey PRIMARY KEY (day);


--
-- Name: widgets widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widgets
    ADD CONSTRAINT widgets_pkey PRIMARY KEY (id);


--
-- Name: analytics_events_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_created_idx ON public.analytics_events USING btree (created_at DESC);


--
-- Name: analytics_events_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_event_idx ON public.analytics_events USING btree (event);


--
-- Name: analytics_events_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_session_idx ON public.analytics_events USING btree (session_id);


--
-- Name: analytics_events_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_student_idx ON public.analytics_events USING btree (student_id);


--
-- Name: analytics_events_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_user_idx ON public.analytics_events USING btree (user_id);


--
-- Name: analytics_reports_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reports_created_idx ON public.analytics_reports USING btree (created_at DESC);


--
-- Name: card_groups_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_groups_author_idx ON public.card_groups USING btree (author_student_id, sort);


--
-- Name: card_groups_lang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_groups_lang_idx ON public.card_groups USING btree (lang);


--
-- Name: card_groups_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_groups_owner_idx ON public.card_groups USING btree (created_by, sort);


--
-- Name: card_sets_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_sets_group_idx ON public.card_sets USING btree (group_id, sort);


--
-- Name: card_sets_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_sets_parent_idx ON public.card_sets USING btree (parent_set_id) WHERE (parent_set_id IS NOT NULL);


--
-- Name: confidence_log_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX confidence_log_owner ON public.confidence_log USING btree (anon_name, student_id);


--
-- Name: course_enrollments_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_enrollments_course_idx ON public.course_enrollments USING btree (course_id);


--
-- Name: course_enrollments_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_enrollments_student_idx ON public.course_enrollments USING btree (student_id);


--
-- Name: course_shares_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_shares_teacher_idx ON public.course_shares USING btree (teacher_id);


--
-- Name: courses_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_kind_idx ON public.courses USING btree (kind);


--
-- Name: courses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_status_idx ON public.courses USING btree (status);


--
-- Name: deck_stickers_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deck_stickers_student_idx ON public.deck_stickers USING btree (student_id, earned_at DESC);


--
-- Name: diag_results_assignment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diag_results_assignment_id_idx ON public.diag_results USING btree (assignment_id);


--
-- Name: diag_results_completed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diag_results_completed_idx ON public.diag_results USING btree (subject, completed);


--
-- Name: diag_results_owner_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX diag_results_owner_token_key ON public.diag_results USING btree (owner_token) WHERE (owner_token IS NOT NULL);


--
-- Name: diag_results_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diag_results_student_id_idx ON public.diag_results USING btree (student_id);


--
-- Name: feed_comments_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feed_comments_group_idx ON public.feed_comments USING btree (group_id, created_at DESC);


--
-- Name: feed_comments_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feed_comments_item_idx ON public.feed_comments USING btree (item_id, group_id, created_at);


--
-- Name: feed_likes_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feed_likes_item_idx ON public.feed_likes USING btree (item_id, group_id);


--
-- Name: feed_likes_student_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feed_likes_student_uq ON public.feed_likes USING btree (item_id, student_id) WHERE (student_id IS NOT NULL);


--
-- Name: feed_likes_user_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feed_likes_user_uq ON public.feed_likes USING btree (item_id, author_user) WHERE (author_user IS NOT NULL);


--
-- Name: feedback_requests_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_requests_created_idx ON public.feedback_requests USING btree (created_at DESC);


--
-- Name: feedback_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_requests_status_idx ON public.feedback_requests USING btree (status);


--
-- Name: homework_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX homework_group_idx ON public.homework USING btree (group_id);


--
-- Name: hw_ai_grades_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hw_ai_grades_queue ON public.hw_ai_grades USING btree (status, submitted_at);


--
-- Name: hw_ai_grades_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hw_ai_grades_teacher ON public.hw_ai_grades USING btree (teacher_id, status);


--
-- Name: idx_courses_group_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_group_ids ON public.courses USING gin (group_ids);


--
-- Name: idx_courses_student_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_student_ids ON public.courses USING gin (student_ids);


--
-- Name: idx_schedule_lessons_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_lessons_lesson_id ON public.schedule_lessons USING btree (lesson_id);


--
-- Name: lessons_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_course_idx ON public.lessons USING btree (course_id, "position");


--
-- Name: lessons_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_module_idx ON public.lessons USING btree (module_id, lesson_number);


--
-- Name: notifications_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_idx ON public.notifications USING btree (recipient_id, created_at DESC);


--
-- Name: notifications_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_unread_idx ON public.notifications USING btree (recipient_id) WHERE (read = false);


--
-- Name: payments_paid_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_paid_at_idx ON public.payments USING btree (paid_at DESC);


--
-- Name: payments_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_student_idx ON public.payments USING btree (student_id);


--
-- Name: payments_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_teacher_idx ON public.payments USING btree (teacher_id);


--
-- Name: phrase_gaps_student_lang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX phrase_gaps_student_lang_idx ON public.phrase_gaps USING btree (student_id, lang, created_at DESC);


--
-- Name: profiles_username_lower_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);


--
-- Name: review_cards_student_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_cards_student_due ON public.review_cards USING btree (student_id, due_at);


--
-- Name: schedule_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_group_idx ON public.schedule USING btree (group_id);


--
-- Name: schedule_lessons_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_lessons_student_id_idx ON public.schedule_lessons USING btree (student_id);


--
-- Name: set_cards_set_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX set_cards_set_idx ON public.set_cards USING btree (set_id, sort);


--
-- Name: students_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_created_by_idx ON public.students USING btree (created_by);


--
-- Name: students_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_group_idx ON public.students USING btree (group_id);


--
-- Name: students_person_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_person_id_idx ON public.students USING btree (person_id);


--
-- Name: task_bank_difficulty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_difficulty_idx ON public.task_bank USING btree (difficulty);


--
-- Name: task_bank_part_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_part_line_idx ON public.task_bank USING btree (part, line);


--
-- Name: task_bank_payload_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_payload_gin ON public.task_bank USING gin (payload);


--
-- Name: task_bank_question_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_question_trgm ON public.task_bank USING gin (question public.gin_trgm_ops);


--
-- Name: task_bank_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_section_idx ON public.task_bank USING btree (section);


--
-- Name: task_bank_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_source_idx ON public.task_bank USING btree (source);


--
-- Name: task_bank_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_subject_idx ON public.task_bank USING btree (subject);


--
-- Name: task_bank_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_bank_topic_idx ON public.task_bank USING btree (topic);


--
-- Name: teacher_tasks_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_tasks_owner_idx ON public.teacher_tasks USING btree (created_by, created_at);


--
-- Name: teacher_tasks_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_tasks_student_idx ON public.teacher_tasks USING btree (student_id) WHERE (student_id IS NOT NULL);


--
-- Name: test_assignments_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX test_assignments_created_idx ON public.test_assignments USING btree (created_at DESC);


--
-- Name: test_assignments_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX test_assignments_owner_idx ON public.test_assignments USING btree (created_by, created_at DESC);


--
-- Name: tg_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tg_messages_thread_idx ON public.tg_messages USING btree (thread_id, created_at);


--
-- Name: tg_threads_last_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tg_threads_last_idx ON public.tg_threads USING btree (last_message_at DESC);


--
-- Name: trainer_questions_trainer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trainer_questions_trainer_idx ON public.trainer_questions USING btree (trainer_id, "position");


--
-- Name: card_sets card_sets_depth_guard_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER card_sets_depth_guard_trg BEFORE INSERT OR UPDATE OF parent_set_id ON public.card_sets FOR EACH ROW EXECUTE FUNCTION public.card_sets_depth_guard();


--
-- Name: card_sets card_sets_no_reparent_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER card_sets_no_reparent_trg BEFORE UPDATE OF parent_set_id ON public.card_sets FOR EACH ROW EXECUTE FUNCTION public.card_sets_no_reparent();


--
-- Name: groups chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.chembio_mark_dirty();


--
-- Name: homework chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.chembio_mark_dirty();


--
-- Name: hw_ai_grades chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE OF status ON public.hw_ai_grades FOR EACH ROW EXECUTE FUNCTION public.hw_ai_grade_dirty();


--
-- Name: lesson_progress chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE OF status ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.chembio_mark_dirty();


--
-- Name: schedule_lessons chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE ON public.schedule_lessons FOR EACH ROW EXECUTE FUNCTION public.chembio_mark_dirty();


--
-- Name: students chembio_dirty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chembio_dirty AFTER INSERT OR DELETE OR UPDATE OF group_id ON public.students FOR EACH ROW EXECUTE FUNCTION public.chembio_mark_dirty();


--
-- Name: courses courses_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: desk_layouts desk_layouts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER desk_layouts_set_updated_at BEFORE UPDATE ON public.desk_layouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: groups groups_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_set_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: groups groups_sync_student_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_sync_student_owner AFTER UPDATE OF created_by ON public.groups FOR EACH ROW WHEN ((old.created_by IS DISTINCT FROM new.created_by)) EXECUTE FUNCTION public.sync_group_student_owner();


--
-- Name: homework homework_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER homework_set_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lesson_progress hw_ai_grade_track; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hw_ai_grade_track AFTER INSERT OR UPDATE OF status, attachments, comment ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.hw_ai_grade_track();


--
-- Name: lessons lessons_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: students students_00_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_00_owner BEFORE INSERT OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_student_owner();


--
-- Name: students students_enforce_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_enforce_limit BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.enforce_student_limit();


--
-- Name: students students_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_bank task_bank_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_bank_set_updated_at BEFORE UPDATE ON public.task_bank FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: trainers trainers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trainers_set_updated_at BEFORE UPDATE ON public.trainers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: courses trg_courses_published_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courses_published_at BEFORE INSERT OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.courses_stamp_published_at();


--
-- Name: profiles trg_guard_profile_access_cols; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_profile_access_cols BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_access_cols();


--
-- Name: lesson_progress trg_notify_lesson_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_lesson_progress AFTER INSERT OR UPDATE OF status ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.notify_on_lesson_progress();


--
-- Name: students trg_notify_payment_due; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_payment_due AFTER INSERT OR UPDATE OF payment_due ON public.students FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_due();


--
-- Name: students trg_notify_student_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_student_insert AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.notify_on_student_insert();


--
-- Name: test_assignments trg_notify_test_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_test_assignment AFTER INSERT ON public.test_assignments FOR EACH ROW EXECUTE FUNCTION public.notify_on_test_assignment();


--
-- Name: diag_results trg_notify_test_completed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_test_completed AFTER INSERT ON public.diag_results FOR EACH ROW EXECUTE FUNCTION public.notify_on_test_completed();


--
-- Name: lesson_attendance trg_on_lesson_attendance_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_on_lesson_attendance_updated AFTER UPDATE OF present ON public.lesson_attendance FOR EACH ROW EXECUTE FUNCTION public.on_lesson_attendance_updated();


--
-- Name: lesson_attendance trg_on_lesson_attended; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_on_lesson_attended AFTER INSERT ON public.lesson_attendance FOR EACH ROW EXECUTE FUNCTION public.on_lesson_attended();


--
-- Name: payments trg_on_payment_received; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_on_payment_received AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.on_payment_received();


--
-- Name: widgets widgets_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER widgets_set_updated_at BEFORE UPDATE ON public.widgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: analytics_issue_resolutions analytics_issue_resolutions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_issue_resolutions
    ADD CONSTRAINT analytics_issue_resolutions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: card_groups card_groups_author_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_groups
    ADD CONSTRAINT card_groups_author_student_id_fkey FOREIGN KEY (author_student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: card_sets card_sets_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_sets
    ADD CONSTRAINT card_sets_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.card_groups(id) ON DELETE CASCADE;


--
-- Name: card_sets card_sets_parent_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_sets
    ADD CONSTRAINT card_sets_parent_set_id_fkey FOREIGN KEY (parent_set_id) REFERENCES public.card_sets(id) ON DELETE CASCADE;


--
-- Name: chembio_taskly_teachers chembio_taskly_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chembio_taskly_teachers
    ADD CONSTRAINT chembio_taskly_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_modules course_modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_shares course_shares_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_shares
    ADD CONSTRAINT course_shares_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_shares course_shares_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_shares
    ADD CONSTRAINT course_shares_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: deck_stickers deck_stickers_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deck_stickers
    ADD CONSTRAINT deck_stickers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: desk_layouts desk_layouts_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_layouts
    ADD CONSTRAINT desk_layouts_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: diag_results diag_results_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diag_results
    ADD CONSTRAINT diag_results_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.test_assignments(id) ON DELETE SET NULL;


--
-- Name: diag_results diag_results_linked_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diag_results
    ADD CONSTRAINT diag_results_linked_student_id_fkey FOREIGN KEY (linked_student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: feed_comments feed_comments_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: feed_comments feed_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.feed_comments(id) ON DELETE CASCADE;


--
-- Name: feed_comments feed_comments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: feed_likes feed_likes_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: feed_likes feed_likes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: homework homework_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: homework homework_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: homework homework_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: hw_ai_grades hw_ai_grades_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: hw_ai_grades hw_ai_grades_homework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES public.homework(id) ON DELETE CASCADE;


--
-- Name: hw_ai_grades hw_ai_grades_progress_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.lesson_progress(id) ON DELETE CASCADE;


--
-- Name: hw_ai_grades hw_ai_grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: hw_ai_grades hw_ai_grades_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_ai_grades
    ADD CONSTRAINT hw_ai_grades_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_attendance lesson_attendance_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attendance
    ADD CONSTRAINT lesson_attendance_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: lesson_attendance lesson_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attendance
    ADD CONSTRAINT lesson_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id) ON DELETE SET NULL;


--
-- Name: lessons lessons_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: lessons lessons_widget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_widget_id_fkey FOREIGN KEY (widget_id) REFERENCES public.widgets(id) ON DELETE SET NULL;


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: payments payments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: schedule schedule_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: schedule_lessons schedule_lessons_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_lessons
    ADD CONSTRAINT schedule_lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: schedule_lessons schedule_lessons_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_lessons
    ADD CONSTRAINT schedule_lessons_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: schedule_lessons schedule_lessons_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_lessons
    ADD CONSTRAINT schedule_lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: set_cards set_cards_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_cards
    ADD CONSTRAINT set_cards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.card_sets(id) ON DELETE CASCADE;


--
-- Name: students students_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: students students_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: students students_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: task_bank task_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_bank
    ADD CONSTRAINT task_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: teacher_invites teacher_invites_consumed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_invites
    ADD CONSTRAINT teacher_invites_consumed_by_fkey FOREIGN KEY (consumed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: teacher_invites teacher_invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_invites
    ADD CONSTRAINT teacher_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: teacher_module_secrets teacher_module_secrets_teacher_id_module_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_module_secrets
    ADD CONSTRAINT teacher_module_secrets_teacher_id_module_fkey FOREIGN KEY (teacher_id, module) REFERENCES public.teacher_modules(teacher_id, module) ON DELETE CASCADE;


--
-- Name: teacher_modules teacher_modules_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_modules
    ADD CONSTRAINT teacher_modules_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teacher_subscriptions teacher_subscriptions_plan_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subscriptions
    ADD CONSTRAINT teacher_subscriptions_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES public.plans(code);


--
-- Name: teacher_subscriptions teacher_subscriptions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subscriptions
    ADD CONSTRAINT teacher_subscriptions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teacher_tasks teacher_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_tasks
    ADD CONSTRAINT teacher_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teacher_tasks teacher_tasks_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_tasks
    ADD CONSTRAINT teacher_tasks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: teacher_tasks teacher_tasks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_tasks
    ADD CONSTRAINT teacher_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: tg_messages tg_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tg_messages
    ADD CONSTRAINT tg_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.tg_threads(id) ON DELETE CASCADE;


--
-- Name: trainer_questions trainer_questions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_questions
    ADD CONSTRAINT trainer_questions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task_bank(id) ON DELETE CASCADE;


--
-- Name: trainer_questions trainer_questions_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_questions
    ADD CONSTRAINT trainer_questions_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: trainers trainers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: widgets widgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widgets
    ADD CONSTRAINT widgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: widgets widgets_linked_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widgets
    ADD CONSTRAINT widgets_linked_trainer_id_fkey FOREIGN KEY (linked_trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: profiles admin_read_all_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_read_all_profiles ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: analytics_events analytics admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "analytics admin read" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: analytics_events analytics insert any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "analytics insert any" ON public.analytics_events FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_issue_resolutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_issue_resolutions ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_issue_resolutions analytics_issue_resolutions_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analytics_issue_resolutions_admin_all ON public.analytics_issue_resolutions USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: analytics_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_reports analytics_reports_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analytics_reports_admin_read ON public.analytics_reports FOR SELECT USING (public.is_admin());


--
-- Name: custom_diag_tests anon_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_read ON public.custom_diag_tests FOR SELECT USING (true);


--
-- Name: screening_config anon_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_read ON public.screening_config FOR SELECT TO anon USING (true);


--
-- Name: course_modules anyone can read course_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can read course_modules" ON public.course_modules FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest))));


--
-- Name: app_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: app_flags app_flags_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_flags_read ON public.app_flags FOR SELECT TO authenticated, anon USING (true);


--
-- Name: app_flags app_flags_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_flags_write ON public.app_flags TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: app_seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: app_seasons app_seasons_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_seasons_read ON public.app_seasons FOR SELECT TO authenticated, anon USING (true);


--
-- Name: app_seasons app_seasons_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_seasons_write ON public.app_seasons TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: lesson_attendance attendance_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_owner_all ON public.lesson_attendance TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = lesson_attendance.group_id) AND (g.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.groups g ON ((g.id = s.group_id)))
  WHERE ((s.id = lesson_attendance.student_id) AND (g.created_by = auth.uid())))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = lesson_attendance.group_id) AND (g.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.groups g ON ((g.id = s.group_id)))
  WHERE ((s.id = lesson_attendance.student_id) AND (g.created_by = auth.uid()))))));


--
-- Name: feed_comments auth_delete_fc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_delete_fc ON public.feed_comments FOR DELETE TO authenticated USING ((public.is_admin() OR (author_user = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_comments.group_id) AND (g.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = feed_comments.student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: feed_likes auth_delete_fl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_delete_fl ON public.feed_likes FOR DELETE TO authenticated USING ((public.is_admin() OR (author_user = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = feed_likes.student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: lesson_progress auth_delete_lp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_delete_lp ON public.lesson_progress FOR DELETE TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: deck_stickers auth_insert_ds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_insert_ds ON public.deck_stickers FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = deck_stickers.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: feed_comments auth_insert_fc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_insert_fc ON public.feed_comments FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR ((author_user = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_comments.group_id) AND (g.created_by = auth.uid()))))) OR ((student_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = feed_comments.student_id) AND (s.auth_user_id = auth.uid()) AND (s.group_id = feed_comments.group_id)))))));


--
-- Name: feed_likes auth_insert_fl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_insert_fl ON public.feed_likes FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR ((author_user = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_likes.group_id) AND (g.created_by = auth.uid()))))) OR ((student_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = feed_likes.student_id) AND (s.auth_user_id = auth.uid()) AND (s.group_id = feed_likes.group_id)))))));


--
-- Name: lesson_progress auth_insert_lp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_insert_lp ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: screening_config auth_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_read ON public.screening_config FOR SELECT TO authenticated USING (true);


--
-- Name: deck_stickers auth_select_ds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_ds ON public.deck_stickers FOR SELECT TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = deck_stickers.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: feed_comments auth_select_fc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_fc ON public.feed_comments FOR SELECT TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_comments.group_id) AND (g.created_by = auth.uid())))) OR ((hidden = false) AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.group_id = feed_comments.group_id) AND (s.auth_user_id = auth.uid())))))));


--
-- Name: feed_likes auth_select_fl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_fl ON public.feed_likes FOR SELECT TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_likes.group_id) AND (g.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.group_id = feed_likes.group_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: lesson_progress auth_select_lp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_lp ON public.lesson_progress FOR SELECT TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: test_assignments auth_select_ta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_ta ON public.test_assignments FOR SELECT TO authenticated USING ((public.is_admin() OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.auth_user_id = auth.uid()) AND ((s.id = ANY (test_assignments.student_ids)) OR (s.group_id = ANY (test_assignments.group_ids))))))));


--
-- Name: feed_comments auth_update_fc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_update_fc ON public.feed_comments FOR UPDATE TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = feed_comments.group_id) AND (g.created_by = auth.uid()))))));


--
-- Name: lesson_progress auth_update_lp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_update_lp ON public.lesson_progress FOR UPDATE TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid())))))))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND ((s.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.groups g
          WHERE ((g.id = s.group_id) AND (g.created_by = auth.uid()))))))))));


--
-- Name: test_assignments auth_write_ta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_write_ta ON public.test_assignments TO authenticated USING ((public.is_admin() OR (created_by = auth.uid()))) WITH CHECK ((public.is_admin() OR (created_by = auth.uid())));


--
-- Name: card_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.card_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: card_groups card_groups_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY card_groups_read ON public.card_groups FOR SELECT TO authenticated, anon USING (((author_student_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = card_groups.author_student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: card_groups card_groups_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY card_groups_write ON public.card_groups TO authenticated USING (((created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = card_groups.author_student_id) AND (s.auth_user_id = auth.uid())))))) WITH CHECK (((created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = card_groups.author_student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: card_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.card_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: card_sets card_sets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY card_sets_read ON public.card_sets FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.card_groups g
  WHERE (g.id = card_sets.group_id))));


--
-- Name: card_sets card_sets_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY card_sets_write ON public.card_sets TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.card_groups g
  WHERE ((g.id = card_sets.group_id) AND ((g.created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.students s
          WHERE ((s.id = g.author_student_id) AND (s.auth_user_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.card_groups g
  WHERE ((g.id = card_sets.group_id) AND ((g.created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.students s
          WHERE ((s.id = g.author_student_id) AND (s.auth_user_id = auth.uid())))))))));


--
-- Name: chembio_dirty; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chembio_dirty ENABLE ROW LEVEL SECURITY;

--
-- Name: chembio_taskly_teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chembio_taskly_teachers ENABLE ROW LEVEL SECURITY;

--
-- Name: confidence_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.confidence_log ENABLE ROW LEVEL SECURITY;

--
-- Name: confidence_log confidence_log_anon_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY confidence_log_anon_insert ON public.confidence_log FOR INSERT TO anon WITH CHECK ((anon_name IS NOT NULL));


--
-- Name: confidence_log confidence_log_anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY confidence_log_anon_select ON public.confidence_log FOR SELECT TO anon USING ((anon_name IS NOT NULL));


--
-- Name: confidence_log confidence_log_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY confidence_log_auth ON public.confidence_log TO authenticated USING ((public.is_staff() OR (anon_name IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = confidence_log.student_id) AND (s.auth_user_id = auth.uid())))))) WITH CHECK ((public.is_staff() OR (anon_name IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = confidence_log.student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: course_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: course_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: course_modules course_modules_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_modules_owner_all ON public.course_modules TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_modules.course_id) AND (c.created_by = auth.uid())))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_modules.course_id) AND (c.created_by = auth.uid()))))));


--
-- Name: course_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: course_reactions course_reactions_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_reactions_read_auth ON public.course_reactions FOR SELECT TO authenticated USING (true);


--
-- Name: course_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: curriculum; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY;

--
-- Name: curriculum curriculum_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY curriculum_write_staff ON public.curriculum TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: custom_diag_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_diag_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_diag_tests custom_diag_tests_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_diag_tests_write_staff ON public.custom_diag_tests TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: deck_stickers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deck_stickers ENABLE ROW LEVEL SECURITY;

--
-- Name: desk_layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.desk_layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: desk_layouts desk_layouts_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY desk_layouts_own ON public.desk_layouts TO authenticated USING ((( SELECT auth.uid() AS uid) = teacher_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = teacher_id));


--
-- Name: diag_question_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diag_question_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: diag_question_defaults diag_question_defaults_read_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_question_defaults_read_staff ON public.diag_question_defaults FOR SELECT TO authenticated USING (public.is_staff());


--
-- Name: diag_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diag_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: diag_questions diag_questions_read_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_questions_read_staff ON public.diag_questions FOR SELECT TO authenticated USING (public.is_staff());


--
-- Name: diag_questions diag_questions_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_questions_write_staff ON public.diag_questions TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: diag_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diag_results ENABLE ROW LEVEL SECURITY;

--
-- Name: diag_results diag_results_delete_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_results_delete_staff ON public.diag_results FOR DELETE TO authenticated USING (public.is_staff());


--
-- Name: diag_results diag_results_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_results_insert ON public.diag_results FOR INSERT TO authenticated, anon WITH CHECK ((subject = 'logic'::text));


--
-- Name: diag_results diag_results_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_results_select_auth ON public.diag_results FOR SELECT TO authenticated USING ((public.is_staff() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.auth_user_id = auth.uid()) AND ((s.id = diag_results.student_id) OR (s.id = diag_results.linked_student_id)))))));


--
-- Name: diag_results diag_results_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diag_results_write_staff ON public.diag_results FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: feed_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_requests feedback admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "feedback admin read" ON public.feedback_requests FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: feedback_requests feedback admin update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "feedback admin update" ON public.feedback_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: feedback_requests feedback insert any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "feedback insert any" ON public.feedback_requests FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: feedback_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_read_auth ON public.groups FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR public.is_admin() OR public.student_owns_group(id)));


--
-- Name: homework; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

--
-- Name: hw_ai_grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hw_ai_grades ENABLE ROW LEVEL SECURITY;

--
-- Name: hw_ai_grades hw_ai_grades_teacher_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hw_ai_grades_teacher_read ON public.hw_ai_grades FOR SELECT TO authenticated USING ((teacher_id = ( SELECT auth.uid() AS uid)));


--
-- Name: lesson_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons lessons_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_owner_all ON public.lessons TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = lessons.course_id) AND (c.created_by = auth.uid())))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = lessons.course_id) AND (c.created_by = auth.uid()))))));


--
-- Name: notifications notif_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_select_auth ON public.notifications FOR SELECT TO authenticated USING ((public.is_admin() OR (recipient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = notifications.recipient_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: notifications notif_update_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_update_auth ON public.notifications FOR UPDATE TO authenticated USING ((public.is_admin() OR (recipient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = notifications.recipient_id) AND (s.auth_user_id = auth.uid())))))) WITH CHECK ((public.is_admin() OR (recipient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = notifications.recipient_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = teacher_id));


--
-- Name: payments payments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (teacher_id = auth.uid())));


--
-- Name: payments payments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated USING ((public.is_admin() OR (teacher_id = auth.uid())));


--
-- Name: payments payments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = teacher_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = teacher_id));


--
-- Name: phrase_gaps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phrase_gaps ENABLE ROW LEVEL SECURITY;

--
-- Name: phrase_gaps phrase_gaps_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY phrase_gaps_own ON public.phrase_gaps TO authenticated USING ((public.is_staff() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = phrase_gaps.student_id) AND (s.auth_user_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK ((public.is_staff() OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = phrase_gaps.student_id) AND (s.auth_user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_read_all ON public.plans FOR SELECT TO authenticated USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions quiz_questions_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_questions_read_auth ON public.quiz_questions FOR SELECT TO authenticated USING (true);


--
-- Name: homework read homework; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read homework" ON public.homework FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid)) OR (group_id IN ( SELECT unnest(public.my_group_ids()) AS unnest)) OR (group_id IN ( SELECT unnest(public.my_taught_group_ids()) AS unnest))));


--
-- Name: profiles read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: schedule read schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read schedule" ON public.schedule FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (group_id IN ( SELECT unnest(public.my_group_ids()) AS unnest)) OR (group_id IN ( SELECT unnest(public.my_taught_group_ids()) AS unnest))));


--
-- Name: course_enrollments read_all_course_enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_course_enrollments ON public.course_enrollments FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (student_id IN ( SELECT (unnest(public.my_student_ids()))::text AS unnest)) OR (course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest))));


--
-- Name: course_shares read_all_course_shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_course_shares ON public.course_shares FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_shares.course_id) AND (c.created_by = ( SELECT auth.uid() AS uid)))))));


--
-- Name: courses read_all_courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_courses ON public.courses FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (id IN ( SELECT unnest(public.my_course_ids()) AS unnest))));


--
-- Name: curriculum read_all_curriculum; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_curriculum ON public.curriculum FOR SELECT TO authenticated USING (true);


--
-- Name: lessons read_all_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_lessons ON public.lessons FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest))));


--
-- Name: schedule_lessons read_all_schedule_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_schedule_lessons ON public.schedule_lessons FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (group_id IN ( SELECT unnest(public.my_group_ids()) AS unnest)) OR (group_id IN ( SELECT unnest(public.my_taught_group_ids()) AS unnest)) OR (student_id IN ( SELECT unnest(public.my_student_ids()) AS unnest))));


--
-- Name: trainer_questions read_all_trainer_questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_trainer_questions ON public.trainer_questions FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM public.trainers t
  WHERE ((t.id = trainer_questions.trainer_id) AND ((t.created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.lessons l
          WHERE ((l.trainer_id = t.id) AND (l.course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest)))))))))));


--
-- Name: trainers read_all_trainers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_trainers ON public.trainers FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.lessons l
  WHERE ((l.trainer_id = trainers.id) AND (l.course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest)))))));


--
-- Name: widgets read_all_widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_all_widgets ON public.widgets FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.lessons l
  WHERE ((l.widget_id = widgets.id) AND (l.course_id IN ( SELECT unnest(public.my_course_ids()) AS unnest)))))));


--
-- Name: review_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: review_cards review_cards_anon_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_cards_anon_delete ON public.review_cards FOR DELETE TO anon USING ((anon_name IS NOT NULL));


--
-- Name: review_cards review_cards_anon_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_cards_anon_insert ON public.review_cards FOR INSERT TO anon WITH CHECK ((anon_name IS NOT NULL));


--
-- Name: review_cards review_cards_anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_cards_anon_select ON public.review_cards FOR SELECT TO anon USING ((anon_name IS NOT NULL));


--
-- Name: review_cards review_cards_anon_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_cards_anon_update ON public.review_cards FOR UPDATE TO anon USING ((anon_name IS NOT NULL)) WITH CHECK ((anon_name IS NOT NULL));


--
-- Name: review_cards review_cards_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_cards_auth ON public.review_cards TO authenticated USING ((public.is_staff() OR (anon_name IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = review_cards.student_id) AND (s.auth_user_id = auth.uid())))))) WITH CHECK ((public.is_staff() OR (anon_name IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE (((s.id)::text = review_cards.student_id) AND (s.auth_user_id = auth.uid()))))));


--
-- Name: schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedule_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_lessons schedule_lessons_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedule_lessons_owner_all ON public.schedule_lessons TO authenticated USING ((public.is_admin() OR ((group_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = schedule_lessons.group_id) AND (g.created_by = auth.uid()))))) OR ((student_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.groups g ON ((g.id = s.group_id)))
  WHERE ((s.id = schedule_lessons.student_id) AND (g.created_by = auth.uid()))))))) WITH CHECK ((public.is_admin() OR ((group_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = schedule_lessons.group_id) AND (g.created_by = auth.uid()))))) OR ((student_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.groups g ON ((g.id = s.group_id)))
  WHERE ((s.id = schedule_lessons.student_id) AND (g.created_by = auth.uid())))))));


--
-- Name: schedule schedule_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedule_owner_all ON public.schedule TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = schedule.group_id) AND (g.created_by = auth.uid())))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = schedule.group_id) AND (g.created_by = auth.uid()))))));


--
-- Name: science_facts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.science_facts ENABLE ROW LEVEL SECURITY;

--
-- Name: science_facts science_facts_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY science_facts_read_auth ON public.science_facts FOR SELECT TO authenticated USING (true);


--
-- Name: science_memes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.science_memes ENABLE ROW LEVEL SECURITY;

--
-- Name: science_memes science_memes_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY science_memes_read_auth ON public.science_memes FOR SELECT TO authenticated USING (true);


--
-- Name: screening_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.screening_config ENABLE ROW LEVEL SECURITY;

--
-- Name: screening_config screening_config_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY screening_config_write_staff ON public.screening_config TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: set_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.set_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: set_cards set_cards_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY set_cards_read ON public.set_cards FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.card_sets s
  WHERE (s.id = set_cards.set_id))));


--
-- Name: set_cards set_cards_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY set_cards_write ON public.set_cards TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.card_sets cs
     JOIN public.card_groups g ON ((g.id = cs.group_id)))
  WHERE ((cs.id = set_cards.set_id) AND ((g.created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.students s
          WHERE ((s.id = g.author_student_id) AND (s.auth_user_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.card_sets cs
     JOIN public.card_groups g ON ((g.id = cs.group_id)))
  WHERE ((cs.id = set_cards.set_id) AND ((g.created_by = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.students s
          WHERE ((s.id = g.author_student_id) AND (s.auth_user_id = auth.uid())))))))));


--
-- Name: students student_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_read_own ON public.students FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_subscriptions subs_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subs_read_own ON public.teacher_subscriptions FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR public.is_admin()));


--
-- Name: task_bank; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: task_bank task_bank_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_bank_delete ON public.task_bank FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: task_bank task_bank_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_bank_insert ON public.task_bank FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: task_bank task_bank_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_bank_read ON public.task_bank FOR SELECT USING ((public.is_admin() OR (created_by = auth.uid()) OR public.is_admin_user(created_by)));


--
-- Name: task_bank task_bank_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_bank_update ON public.task_bank FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin())) WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: teacher_modules teacher reads own modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "teacher reads own modules" ON public.teacher_modules FOR SELECT TO authenticated USING ((teacher_id = ( SELECT auth.uid() AS uid)));


--
-- Name: teacher_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_module_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_module_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_progress teacher_owned_student_progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_owned_student_progress ON public.lesson_progress TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND (s.created_by = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = lesson_progress.student_id) AND (s.created_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: schedule_lessons teacher_owned_student_schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_owned_student_schedule ON public.schedule_lessons FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = schedule_lessons.student_id) AND (s.created_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: students teacher_read_students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_read_students ON public.students FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: teacher_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_tasks teacher_tasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_tasks_delete ON public.teacher_tasks FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: teacher_tasks teacher_tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_tasks_insert ON public.teacher_tasks FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: teacher_tasks teacher_tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_tasks_select ON public.teacher_tasks FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: teacher_tasks teacher_tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_tasks_update ON public.teacher_tasks FOR UPDATE USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: students teacher_write_students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_write_students ON public.students TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid)))) WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: test_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: tg_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tg_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: tg_messages tg_messages_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tg_messages_admin_read ON public.tg_messages FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: tg_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tg_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: tg_threads tg_threads_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tg_threads_admin_read ON public.tg_threads FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: tg_threads tg_threads_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tg_threads_admin_update ON public.tg_threads FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: trainer_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trainer_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: trainer_questions trainer_questions_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trainer_questions_owner_all ON public.trainer_questions TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.trainers t
  WHERE ((t.id = trainer_questions.trainer_id) AND (t.created_by = auth.uid())))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.trainers t
  WHERE ((t.id = trainer_questions.trainer_id) AND (t.created_by = auth.uid()))))));


--
-- Name: trainers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

--
-- Name: trainers trainers_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trainers_delete ON public.trainers FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: trainers trainers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trainers_insert ON public.trainers FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: trainers trainers_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trainers_update ON public.trainers FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin())) WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: tts_spend; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tts_spend ENABLE ROW LEVEL SECURITY;

--
-- Name: widgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

--
-- Name: widgets widgets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY widgets_delete ON public.widgets FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: widgets widgets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY widgets_insert ON public.widgets FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: widgets widgets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY widgets_update ON public.widgets FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR public.is_admin())) WITH CHECK (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: profiles write own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "write own profile" ON public.profiles TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: course_enrollments write_own_course_enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY write_own_course_enrollments ON public.course_enrollments TO authenticated USING ((course_id IN ( SELECT courses.id
   FROM public.courses
  WHERE (courses.created_by = auth.uid())))) WITH CHECK ((course_id IN ( SELECT courses.id
   FROM public.courses
  WHERE (courses.created_by = auth.uid()))));


--
-- Name: course_shares write_own_course_shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY write_own_course_shares ON public.course_shares TO authenticated USING ((course_id IN ( SELECT courses.id
   FROM public.courses
  WHERE (courses.created_by = auth.uid())))) WITH CHECK ((course_id IN ( SELECT courses.id
   FROM public.courses
  WHERE (courses.created_by = auth.uid()))));


--
-- Name: courses write_own_courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY write_own_courses ON public.courses TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: groups write_own_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY write_own_groups ON public.groups TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: homework write_own_homework; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY write_own_homework ON public.homework TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION _hhmm_diff(p_from text, p_to text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._hhmm_diff(p_from text, p_to text) TO anon;
GRANT ALL ON FUNCTION public._hhmm_diff(p_from text, p_to text) TO authenticated;
GRANT ALL ON FUNCTION public._hhmm_diff(p_from text, p_to text) TO service_role;


--
-- Name: FUNCTION _hhmm_plus(p_time text, p_min integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._hhmm_plus(p_time text, p_min integer) TO anon;
GRANT ALL ON FUNCTION public._hhmm_plus(p_time text, p_min integer) TO authenticated;
GRANT ALL ON FUNCTION public._hhmm_plus(p_time text, p_min integer) TO service_role;


--
-- Name: FUNCTION _schedule_label(p_date date, p_time text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._schedule_label(p_date date, p_time text) TO anon;
GRANT ALL ON FUNCTION public._schedule_label(p_date date, p_time text) TO authenticated;
GRANT ALL ON FUNCTION public._schedule_label(p_date date, p_time text) TO service_role;


--
-- Name: FUNCTION _schedule_notify(p_row uuid, p_type text, p_title text, p_body text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_notify(p_row uuid, p_type text, p_title text, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_notify(p_row uuid, p_type text, p_title text, p_body text) TO service_role;


--
-- Name: TABLE schedule_lessons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.schedule_lessons TO anon;
GRANT ALL ON TABLE public.schedule_lessons TO authenticated;
GRANT ALL ON TABLE public.schedule_lessons TO service_role;


--
-- Name: FUNCTION _schedule_occasion(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_occasion(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_occasion(p_id uuid) TO service_role;


--
-- Name: FUNCTION _schedule_owner(p_group uuid, p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_owner(p_group uuid, p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_owner(p_group uuid, p_student uuid) TO service_role;


--
-- Name: FUNCTION _schedule_snapshot(p_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_snapshot(p_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_snapshot(p_ids uuid[]) TO service_role;


--
-- Name: FUNCTION _schedule_students(p_group uuid, p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_students(p_group uuid, p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_students(p_group uuid, p_student uuid) TO service_role;


--
-- Name: FUNCTION _schedule_sync_lesson(p_row uuid, p_old_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._schedule_sync_lesson(p_row uuid, p_old_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public._schedule_sync_lesson(p_row uuid, p_old_date date) TO service_role;


--
-- Name: FUNCTION admin_activity_heatmap(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_activity_heatmap(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_activity_heatmap(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_activity_heatmap(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_activity_heatmap_by_role(p_role text, p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_activity_heatmap_by_role(p_role text, p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_activity_heatmap_by_role(p_role text, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_activity_heatmap_by_role(p_role text, p_days integer) TO service_role;


--
-- Name: FUNCTION admin_analytics_digest_input(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_analytics_digest_input(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_analytics_digest_input(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_analytics_digest_input(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_analytics_overview(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_analytics_overview(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_analytics_overview(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_analytics_overview(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_analytics_overview_by_role(p_role text, p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_analytics_overview_by_role(p_role text, p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_analytics_overview_by_role(p_role text, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_analytics_overview_by_role(p_role text, p_days integer) TO service_role;


--
-- Name: FUNCTION admin_analytics_reports(p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_analytics_reports(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_analytics_reports(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_analytics_reports(p_limit integer) TO service_role;


--
-- Name: FUNCTION admin_click_heatmap(p_path text, p_role text, p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_click_heatmap(p_path text, p_role text, p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_click_heatmap(p_path text, p_role text, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_click_heatmap(p_path text, p_role text, p_days integer) TO service_role;


--
-- Name: FUNCTION admin_click_paths(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_click_paths(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_click_paths(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_click_paths(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_content_list(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_content_list() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_content_list() TO authenticated;
GRANT ALL ON FUNCTION public.admin_content_list() TO service_role;


--
-- Name: FUNCTION admin_create_teacher_invite(p_email text, p_hidden_tabs text[], p_hidden_widgets text[], p_course_assignments jsonb, p_group_ids uuid[], p_subjects text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_create_teacher_invite(p_email text, p_hidden_tabs text[], p_hidden_widgets text[], p_course_assignments jsonb, p_group_ids uuid[], p_subjects text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_create_teacher_invite(p_email text, p_hidden_tabs text[], p_hidden_widgets text[], p_course_assignments jsonb, p_group_ids uuid[], p_subjects text[]) TO authenticated;
GRANT ALL ON FUNCTION public.admin_create_teacher_invite(p_email text, p_hidden_tabs text[], p_hidden_widgets text[], p_course_assignments jsonb, p_group_ids uuid[], p_subjects text[]) TO service_role;


--
-- Name: FUNCTION admin_daily_activity(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_daily_activity(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_daily_activity(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_daily_activity(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_delete_content(p_kind text, p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_delete_content(p_kind text, p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_content(p_kind text, p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_content(p_kind text, p_id uuid) TO service_role;


--
-- Name: FUNCTION admin_delete_task(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_delete_task(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_task(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_task(p_id uuid) TO service_role;


--
-- Name: FUNCTION admin_delete_teacher(p_teacher uuid, p_keep_account boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_delete_teacher(p_teacher uuid, p_keep_account boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_teacher(p_teacher uuid, p_keep_account boolean) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_teacher(p_teacher uuid, p_keep_account boolean) TO service_role;


--
-- Name: FUNCTION admin_duplicate_course(p_course_id uuid, p_new_owner uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_duplicate_course(p_course_id uuid, p_new_owner uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_duplicate_course(p_course_id uuid, p_new_owner uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_duplicate_course(p_course_id uuid, p_new_owner uuid) TO service_role;


--
-- Name: FUNCTION admin_event_breakdown(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_event_breakdown(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_event_breakdown(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_event_breakdown(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_group_options(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_group_options() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_group_options() TO authenticated;
GRANT ALL ON FUNCTION public.admin_group_options() TO service_role;


--
-- Name: FUNCTION admin_page_stats(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_page_stats(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_page_stats(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_page_stats(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_pending_teacher_invites(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_pending_teacher_invites() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_pending_teacher_invites() TO authenticated;
GRANT ALL ON FUNCTION public.admin_pending_teacher_invites() TO service_role;


--
-- Name: FUNCTION admin_progress_funnel(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_progress_funnel() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_progress_funnel() TO authenticated;
GRANT ALL ON FUNCTION public.admin_progress_funnel() TO service_role;


--
-- Name: FUNCTION admin_rage_hotspots(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_rage_hotspots(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_rage_hotspots(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_rage_hotspots(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_reassign_content(p_kind text, p_id uuid, p_new_owner uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_reassign_content(p_kind text, p_id uuid, p_new_owner uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_reassign_content(p_kind text, p_id uuid, p_new_owner uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reassign_content(p_kind text, p_id uuid, p_new_owner uuid) TO service_role;


--
-- Name: FUNCTION admin_reassign_task(p_id uuid, p_new_owner uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_reassign_task(p_id uuid, p_new_owner uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_reassign_task(p_id uuid, p_new_owner uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reassign_task(p_id uuid, p_new_owner uuid) TO service_role;


--
-- Name: FUNCTION admin_recent_errors(p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_recent_errors(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_recent_errors(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_recent_errors(p_limit integer) TO service_role;


--
-- Name: FUNCTION admin_revoke_teacher_invite(p_token uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_revoke_teacher_invite(p_token uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_revoke_teacher_invite(p_token uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_revoke_teacher_invite(p_token uuid) TO service_role;


--
-- Name: FUNCTION admin_set_teacher_access(p_teacher uuid, p_hidden_tabs text[], p_hidden_widgets text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_set_teacher_access(p_teacher uuid, p_hidden_tabs text[], p_hidden_widgets text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_teacher_access(p_teacher uuid, p_hidden_tabs text[], p_hidden_widgets text[]) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_teacher_access(p_teacher uuid, p_hidden_tabs text[], p_hidden_widgets text[]) TO service_role;


--
-- Name: FUNCTION admin_set_teacher_plan(p_teacher uuid, p_plan text, p_expires timestamp with time zone, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_set_teacher_plan(p_teacher uuid, p_plan text, p_expires timestamp with time zone, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_teacher_plan(p_teacher uuid, p_plan text, p_expires timestamp with time zone, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_teacher_plan(p_teacher uuid, p_plan text, p_expires timestamp with time zone, p_note text) TO service_role;


--
-- Name: FUNCTION admin_set_teacher_subjects(p_teacher uuid, p_subjects text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_set_teacher_subjects(p_teacher uuid, p_subjects text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_teacher_subjects(p_teacher uuid, p_subjects text[]) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_teacher_subjects(p_teacher uuid, p_subjects text[]) TO service_role;


--
-- Name: FUNCTION admin_student_delete(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_student_delete(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_student_delete(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_student_delete(p_id uuid) TO service_role;


--
-- Name: FUNCTION admin_student_move(p_student uuid, p_group uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_student_move(p_student uuid, p_group uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_student_move(p_student uuid, p_group uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_student_move(p_student uuid, p_group uuid) TO service_role;


--
-- Name: FUNCTION admin_student_reassign(p_student uuid, p_owner uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_student_reassign(p_student uuid, p_owner uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_student_reassign(p_student uuid, p_owner uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_student_reassign(p_student uuid, p_owner uuid) TO service_role;


--
-- Name: FUNCTION admin_student_update(p_id uuid, p_patch jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_student_update(p_id uuid, p_patch jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_student_update(p_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_student_update(p_id uuid, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION admin_students_list(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_students_list() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_students_list() TO authenticated;
GRANT ALL ON FUNCTION public.admin_students_list() TO service_role;


--
-- Name: FUNCTION admin_tasks_list(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_tasks_list() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_tasks_list() TO authenticated;
GRANT ALL ON FUNCTION public.admin_tasks_list() TO service_role;


--
-- Name: FUNCTION admin_teacher_content(p_teacher uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_teacher_content(p_teacher uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_teacher_content(p_teacher uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_teacher_content(p_teacher uuid) TO service_role;


--
-- Name: FUNCTION admin_teacher_list(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_teacher_list() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_teacher_list() TO authenticated;
GRANT ALL ON FUNCTION public.admin_teacher_list() TO service_role;


--
-- Name: FUNCTION admin_teacher_plans(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_teacher_plans() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_teacher_plans() TO authenticated;
GRANT ALL ON FUNCTION public.admin_teacher_plans() TO service_role;


--
-- Name: FUNCTION admin_teacher_usage(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_teacher_usage(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_teacher_usage(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_teacher_usage(p_days integer) TO service_role;


--
-- Name: FUNCTION admin_user_activity(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_user_activity(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_user_activity(p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_user_activity(p_days integer) TO service_role;


--
-- Name: FUNCTION apply_teacher_invite(p_token uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.apply_teacher_invite(p_token uuid) TO anon;
GRANT ALL ON FUNCTION public.apply_teacher_invite(p_token uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_teacher_invite(p_token uuid) TO service_role;


--
-- Name: FUNCTION can_read_avatar(p_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.can_read_avatar(p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_read_avatar(p_name text) TO authenticated;
GRANT ALL ON FUNCTION public.can_read_avatar(p_name text) TO service_role;


--
-- Name: FUNCTION can_read_course(p_course uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.can_read_course(p_course uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_read_course(p_course uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_read_course(p_course uuid) TO service_role;


--
-- Name: FUNCTION can_read_trainer(p_trainer uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.can_read_trainer(p_trainer uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_read_trainer(p_trainer uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_read_trainer(p_trainer uuid) TO service_role;


--
-- Name: FUNCTION card_sets_depth_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.card_sets_depth_guard() TO anon;
GRANT ALL ON FUNCTION public.card_sets_depth_guard() TO authenticated;
GRANT ALL ON FUNCTION public.card_sets_depth_guard() TO service_role;


--
-- Name: FUNCTION card_sets_no_reparent(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.card_sets_no_reparent() TO anon;
GRANT ALL ON FUNCTION public.card_sets_no_reparent() TO authenticated;
GRANT ALL ON FUNCTION public.card_sets_no_reparent() TO service_role;


--
-- Name: FUNCTION chembio_day_summary(p_teacher uuid, p_date date, p_link text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.chembio_day_summary(p_teacher uuid, p_date date, p_link text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.chembio_day_summary(p_teacher uuid, p_date date, p_link text) TO service_role;


--
-- Name: FUNCTION chembio_mark_dirty(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.chembio_mark_dirty() TO anon;
GRANT ALL ON FUNCTION public.chembio_mark_dirty() TO authenticated;
GRANT ALL ON FUNCTION public.chembio_mark_dirty() TO service_role;


--
-- Name: FUNCTION claim_sibling_cards(p_token uuid, p_email text, p_password text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_sibling_cards(p_token uuid, p_email text, p_password text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_sibling_cards(p_token uuid, p_email text, p_password text) TO authenticated;
GRANT ALL ON FUNCTION public.claim_sibling_cards(p_token uuid, p_email text, p_password text) TO service_role;


--
-- Name: FUNCTION claim_student_account(p_token uuid, p_email text, p_password text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_student_account(p_token uuid, p_email text, p_password text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_student_account(p_token uuid, p_email text, p_password text) TO authenticated;
GRANT ALL ON FUNCTION public.claim_student_account(p_token uuid, p_email text, p_password text) TO service_role;


--
-- Name: FUNCTION course_add_group(p_course uuid, p_group uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.course_add_group(p_course uuid, p_group uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.course_add_group(p_course uuid, p_group uuid) TO authenticated;
GRANT ALL ON FUNCTION public.course_add_group(p_course uuid, p_group uuid) TO service_role;


--
-- Name: FUNCTION course_add_student(p_course uuid, p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.course_add_student(p_course uuid, p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.course_add_student(p_course uuid, p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.course_add_student(p_course uuid, p_student uuid) TO service_role;


--
-- Name: FUNCTION courses_stamp_published_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.courses_stamp_published_at() TO anon;
GRANT ALL ON FUNCTION public.courses_stamp_published_at() TO authenticated;
GRANT ALL ON FUNCTION public.courses_stamp_published_at() TO service_role;


--
-- Name: TABLE diag_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.diag_questions TO authenticated;
GRANT ALL ON TABLE public.diag_questions TO service_role;


--
-- Name: FUNCTION diag_correct_label(q public.diag_questions); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.diag_correct_label(q public.diag_questions) FROM PUBLIC;
GRANT ALL ON FUNCTION public.diag_correct_label(q public.diag_questions) TO anon;
GRANT ALL ON FUNCTION public.diag_correct_label(q public.diag_questions) TO authenticated;
GRANT ALL ON FUNCTION public.diag_correct_label(q public.diag_questions) TO service_role;


--
-- Name: FUNCTION diag_is_correct(q public.diag_questions, a jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.diag_is_correct(q public.diag_questions, a jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.diag_is_correct(q public.diag_questions, a jsonb) TO anon;
GRANT ALL ON FUNCTION public.diag_is_correct(q public.diag_questions, a jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.diag_is_correct(q public.diag_questions, a jsonb) TO service_role;


--
-- Name: FUNCTION diag_norm_term(s text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.diag_norm_term(s text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.diag_norm_term(s text) TO anon;
GRANT ALL ON FUNCTION public.diag_norm_term(s text) TO authenticated;
GRANT ALL ON FUNCTION public.diag_norm_term(s text) TO service_role;


--
-- Name: FUNCTION discard_diag_progress(p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.discard_diag_progress(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.discard_diag_progress(p_token text) TO anon;
GRANT ALL ON FUNCTION public.discard_diag_progress(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.discard_diag_progress(p_token text) TO service_role;


--
-- Name: FUNCTION duplicate_course(p_course_id uuid, p_new_owner uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.duplicate_course(p_course_id uuid, p_new_owner uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.duplicate_course(p_course_id uuid, p_new_owner uuid) TO service_role;


--
-- Name: FUNCTION duplicate_my_course(p_short_id text, p_title text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.duplicate_my_course(p_short_id text, p_title text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.duplicate_my_course(p_short_id text, p_title text) TO authenticated;
GRANT ALL ON FUNCTION public.duplicate_my_course(p_short_id text, p_title text) TO service_role;


--
-- Name: FUNCTION enforce_student_limit(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_student_limit() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_student_limit() TO service_role;


--
-- Name: FUNCTION gen_username(base text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.gen_username(base text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.gen_username(base text) TO service_role;


--
-- Name: FUNCTION get_diag_questions(p_subject text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_diag_questions(p_subject text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_diag_questions(p_subject text) TO anon;
GRANT ALL ON FUNCTION public.get_diag_questions(p_subject text) TO authenticated;
GRANT ALL ON FUNCTION public.get_diag_questions(p_subject text) TO service_role;


--
-- Name: FUNCTION get_invited_student(p_token uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_invited_student(p_token uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_invited_student(p_token uuid) TO anon;
GRANT ALL ON FUNCTION public.get_invited_student(p_token uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_invited_student(p_token uuid) TO service_role;


--
-- Name: FUNCTION get_teacher_invite(p_token uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_teacher_invite(p_token uuid) TO anon;
GRANT ALL ON FUNCTION public.get_teacher_invite(p_token uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_teacher_invite(p_token uuid) TO service_role;


--
-- Name: FUNCTION guard_profile_access_cols(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_profile_access_cols() TO anon;
GRANT ALL ON FUNCTION public.guard_profile_access_cols() TO authenticated;
GRANT ALL ON FUNCTION public.guard_profile_access_cols() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION homework_photos_expired(p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.homework_photos_expired(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.homework_photos_expired(p_limit integer) TO service_role;


--
-- Name: FUNCTION hw_ai_grade_confirm(p_id uuid, p_score integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hw_ai_grade_confirm(p_id uuid, p_score integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hw_ai_grade_confirm(p_id uuid, p_score integer) TO authenticated;
GRANT ALL ON FUNCTION public.hw_ai_grade_confirm(p_id uuid, p_score integer) TO service_role;


--
-- Name: FUNCTION hw_ai_grade_dirty(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.hw_ai_grade_dirty() TO anon;
GRANT ALL ON FUNCTION public.hw_ai_grade_dirty() TO authenticated;
GRANT ALL ON FUNCTION public.hw_ai_grade_dirty() TO service_role;


--
-- Name: FUNCTION hw_ai_grade_track(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.hw_ai_grade_track() TO anon;
GRANT ALL ON FUNCTION public.hw_ai_grade_track() TO authenticated;
GRANT ALL ON FUNCTION public.hw_ai_grade_track() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_admin_user(uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin_user(uid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_admin_user(uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_admin_user(uid uuid) TO service_role;


--
-- Name: FUNCTION is_staff(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_staff() TO anon;
GRANT ALL ON FUNCTION public.is_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_staff() TO service_role;


--
-- Name: FUNCTION is_teacher(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_teacher() TO service_role;


--
-- Name: FUNCTION lesson_hw_has_hard(hw jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lesson_hw_has_hard(hw jsonb) TO anon;
GRANT ALL ON FUNCTION public.lesson_hw_has_hard(hw jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.lesson_hw_has_hard(hw jsonb) TO service_role;


--
-- Name: FUNCTION load_diag_progress(p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.load_diag_progress(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.load_diag_progress(p_token text) TO anon;
GRANT ALL ON FUNCTION public.load_diag_progress(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.load_diag_progress(p_token text) TO service_role;


--
-- Name: FUNCTION lock_admin_function_execute(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.lock_admin_function_execute() FROM PUBLIC;
GRANT ALL ON FUNCTION public.lock_admin_function_execute() TO service_role;


--
-- Name: FUNCTION log_diag_confidence(p_token text, p_question_id text, p_confident boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.log_diag_confidence(p_token text, p_question_id text, p_confident boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_diag_confidence(p_token text, p_question_id text, p_confident boolean) TO anon;
GRANT ALL ON FUNCTION public.log_diag_confidence(p_token text, p_question_id text, p_confident boolean) TO authenticated;
GRANT ALL ON FUNCTION public.log_diag_confidence(p_token text, p_question_id text, p_confident boolean) TO service_role;


--
-- Name: FUNCTION my_course_ids(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_course_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_course_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_course_ids() TO service_role;


--
-- Name: FUNCTION my_group_ids(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_group_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_group_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_group_ids() TO service_role;


--
-- Name: FUNCTION my_plan(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_plan() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_plan() TO authenticated;
GRANT ALL ON FUNCTION public.my_plan() TO service_role;


--
-- Name: FUNCTION my_student_id(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_student_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_student_id() TO service_role;


--
-- Name: FUNCTION my_student_ids(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_student_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_student_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_student_ids() TO service_role;


--
-- Name: FUNCTION my_taught_group_ids(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_taught_group_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_taught_group_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_taught_group_ids() TO service_role;


--
-- Name: FUNCTION notify_on_lesson_progress(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_on_lesson_progress() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_lesson_progress() TO service_role;


--
-- Name: FUNCTION notify_on_payment_due(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_on_payment_due() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_payment_due() TO service_role;


--
-- Name: FUNCTION notify_on_student_insert(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_on_student_insert() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_student_insert() TO service_role;


--
-- Name: FUNCTION notify_on_test_assignment(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_on_test_assignment() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_test_assignment() TO service_role;


--
-- Name: FUNCTION notify_on_test_completed(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_on_test_completed() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_on_test_completed() TO service_role;


--
-- Name: FUNCTION on_lesson_attendance_updated(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.on_lesson_attendance_updated() TO anon;
GRANT ALL ON FUNCTION public.on_lesson_attendance_updated() TO authenticated;
GRANT ALL ON FUNCTION public.on_lesson_attendance_updated() TO service_role;


--
-- Name: FUNCTION on_lesson_attended(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.on_lesson_attended() TO anon;
GRANT ALL ON FUNCTION public.on_lesson_attended() TO authenticated;
GRANT ALL ON FUNCTION public.on_lesson_attended() TO service_role;


--
-- Name: FUNCTION on_payment_received(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.on_payment_received() TO anon;
GRANT ALL ON FUNCTION public.on_payment_received() TO authenticated;
GRANT ALL ON FUNCTION public.on_payment_received() TO service_role;


--
-- Name: FUNCTION person_student_rows(p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.person_student_rows(p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.person_student_rows(p_student uuid) TO anon;
GRANT ALL ON FUNCTION public.person_student_rows(p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.person_student_rows(p_student uuid) TO service_role;


--
-- Name: FUNCTION primary_teacher_id(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.primary_teacher_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.primary_teacher_id() TO service_role;


--
-- Name: FUNCTION prune_analytics(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prune_analytics() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prune_analytics() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION run_analytics_digest(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.run_analytics_digest() FROM PUBLIC;
GRANT ALL ON FUNCTION public.run_analytics_digest() TO anon;
GRANT ALL ON FUNCTION public.run_analytics_digest() TO authenticated;
GRANT ALL ON FUNCTION public.run_analytics_digest() TO service_role;


--
-- Name: FUNCTION run_chembio_day(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.run_chembio_day() FROM PUBLIC;
GRANT ALL ON FUNCTION public.run_chembio_day() TO service_role;


--
-- Name: FUNCTION run_chembio_dirty(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.run_chembio_dirty() FROM PUBLIC;
GRANT ALL ON FUNCTION public.run_chembio_dirty() TO service_role;


--
-- Name: FUNCTION run_homework_photos_cleanup(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.run_homework_photos_cleanup() FROM PUBLIC;
GRANT ALL ON FUNCTION public.run_homework_photos_cleanup() TO service_role;


--
-- Name: FUNCTION save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean) TO anon;
GRANT ALL ON FUNCTION public.save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean) TO authenticated;
GRANT ALL ON FUNCTION public.save_diag_progress(p_token text, p_name text, p_subject text, p_results jsonb, p_answers jsonb, p_student_id uuid, p_assignment_id uuid, p_score_pct integer, p_answered integer, p_total integer, p_completed boolean) TO service_role;


--
-- Name: FUNCTION schedule_add(p_group uuid, p_student uuid, p_title text, p_date date, p_time text, p_end text, p_notify boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.schedule_add(p_group uuid, p_student uuid, p_title text, p_date date, p_time text, p_end text, p_notify boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_add(p_group uuid, p_student uuid, p_title text, p_date date, p_time text, p_end text, p_notify boolean) TO authenticated;
GRANT ALL ON FUNCTION public.schedule_add(p_group uuid, p_student uuid, p_title text, p_date date, p_time text, p_end text, p_notify boolean) TO service_role;


--
-- Name: FUNCTION schedule_cancel(p_id uuid, p_notify boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.schedule_cancel(p_id uuid, p_notify boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_cancel(p_id uuid, p_notify boolean) TO authenticated;
GRANT ALL ON FUNCTION public.schedule_cancel(p_id uuid, p_notify boolean) TO service_role;


--
-- Name: FUNCTION schedule_move(p_id uuid, p_date date, p_time text, p_notify boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.schedule_move(p_id uuid, p_date date, p_time text, p_notify boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_move(p_id uuid, p_date date, p_time text, p_notify boolean) TO authenticated;
GRANT ALL ON FUNCTION public.schedule_move(p_id uuid, p_date date, p_time text, p_notify boolean) TO service_role;


--
-- Name: FUNCTION schedule_shift(p_id uuid, p_notify boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.schedule_shift(p_id uuid, p_notify boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_shift(p_id uuid, p_notify boolean) TO authenticated;
GRANT ALL ON FUNCTION public.schedule_shift(p_id uuid, p_notify boolean) TO service_role;


--
-- Name: FUNCTION schedule_undo(p_undo jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.schedule_undo(p_undo jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_undo(p_undo jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.schedule_undo(p_undo jsonb) TO service_role;


--
-- Name: FUNCTION seed_student_progress(p_student_id uuid, p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.seed_student_progress(p_student_id uuid, p_group_id uuid) TO anon;
GRANT ALL ON FUNCTION public.seed_student_progress(p_student_id uuid, p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.seed_student_progress(p_student_id uuid, p_group_id uuid) TO service_role;


--
-- Name: FUNCTION set_course_order(p_student uuid, p_courses uuid[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_course_order(p_student uuid, p_courses uuid[]) TO anon;
GRANT ALL ON FUNCTION public.set_course_order(p_student uuid, p_courses uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.set_course_order(p_student uuid, p_courses uuid[]) TO service_role;


--
-- Name: FUNCTION set_my_avatar(p_path text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_my_avatar(p_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_my_avatar(p_path text) TO authenticated;
GRANT ALL ON FUNCTION public.set_my_avatar(p_path text) TO service_role;


--
-- Name: FUNCTION set_student_owner(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_student_owner() FROM PUBLIC;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION storage_stats(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.storage_stats() FROM PUBLIC;
GRANT ALL ON FUNCTION public.storage_stats() TO authenticated;
GRANT ALL ON FUNCTION public.storage_stats() TO service_role;


--
-- Name: FUNCTION student_owns_group(p_group uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_owns_group(p_group uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_owns_group(p_group uuid) TO anon;
GRANT ALL ON FUNCTION public.student_owns_group(p_group uuid) TO authenticated;
GRANT ALL ON FUNCTION public.student_owns_group(p_group uuid) TO service_role;


--
-- Name: FUNCTION student_track(p_student uuid, p_group uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.student_track(p_student uuid, p_group uuid) TO anon;
GRANT ALL ON FUNCTION public.student_track(p_student uuid, p_group uuid) TO authenticated;
GRANT ALL ON FUNCTION public.student_track(p_student uuid, p_group uuid) TO service_role;


--
-- Name: FUNCTION subject_colors_for_student(p_student uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.subject_colors_for_student(p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.subject_colors_for_student(p_student uuid) TO service_role;


--
-- Name: FUNCTION sync_group_student_owner(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_group_student_owner() FROM PUBLIC;


--
-- Name: FUNCTION sync_student_last_visit(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_student_last_visit() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_student_last_visit() TO service_role;


--
-- Name: FUNCTION teacher_finance_summary(p_teacher_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.teacher_finance_summary(p_teacher_id uuid) TO anon;
GRANT ALL ON FUNCTION public.teacher_finance_summary(p_teacher_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.teacher_finance_summary(p_teacher_id uuid) TO service_role;


--
-- Name: FUNCTION tts_spend_add(n integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.tts_spend_add(n integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.tts_spend_add(n integer) TO service_role;


--
-- Name: TABLE analytics_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;


--
-- Name: SEQUENCE analytics_events_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;


--
-- Name: TABLE analytics_issue_resolutions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analytics_issue_resolutions TO anon;
GRANT ALL ON TABLE public.analytics_issue_resolutions TO authenticated;
GRANT ALL ON TABLE public.analytics_issue_resolutions TO service_role;


--
-- Name: TABLE analytics_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analytics_reports TO anon;
GRANT ALL ON TABLE public.analytics_reports TO authenticated;
GRANT ALL ON TABLE public.analytics_reports TO service_role;


--
-- Name: TABLE app_flags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_flags TO anon;
GRANT ALL ON TABLE public.app_flags TO authenticated;
GRANT ALL ON TABLE public.app_flags TO service_role;


--
-- Name: TABLE app_seasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_seasons TO anon;
GRANT ALL ON TABLE public.app_seasons TO authenticated;
GRANT ALL ON TABLE public.app_seasons TO service_role;


--
-- Name: TABLE card_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.card_groups TO anon;
GRANT ALL ON TABLE public.card_groups TO authenticated;
GRANT ALL ON TABLE public.card_groups TO service_role;


--
-- Name: TABLE card_sets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.card_sets TO anon;
GRANT ALL ON TABLE public.card_sets TO authenticated;
GRANT ALL ON TABLE public.card_sets TO service_role;


--
-- Name: TABLE chembio_dirty; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chembio_dirty TO service_role;


--
-- Name: TABLE chembio_taskly_teachers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.chembio_taskly_teachers TO service_role;


--
-- Name: TABLE confidence_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.confidence_log TO anon;
GRANT ALL ON TABLE public.confidence_log TO authenticated;
GRANT ALL ON TABLE public.confidence_log TO service_role;


--
-- Name: TABLE course_enrollments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_enrollments TO anon;
GRANT ALL ON TABLE public.course_enrollments TO authenticated;
GRANT ALL ON TABLE public.course_enrollments TO service_role;


--
-- Name: TABLE course_modules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_modules TO anon;
GRANT ALL ON TABLE public.course_modules TO authenticated;
GRANT ALL ON TABLE public.course_modules TO service_role;


--
-- Name: TABLE course_reactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_reactions TO anon;
GRANT ALL ON TABLE public.course_reactions TO authenticated;
GRANT ALL ON TABLE public.course_reactions TO service_role;


--
-- Name: TABLE course_shares; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_shares TO anon;
GRANT ALL ON TABLE public.course_shares TO authenticated;
GRANT ALL ON TABLE public.course_shares TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: TABLE curriculum; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.curriculum TO anon;
GRANT ALL ON TABLE public.curriculum TO authenticated;
GRANT ALL ON TABLE public.curriculum TO service_role;


--
-- Name: TABLE custom_diag_tests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_diag_tests TO anon;
GRANT ALL ON TABLE public.custom_diag_tests TO authenticated;
GRANT ALL ON TABLE public.custom_diag_tests TO service_role;


--
-- Name: TABLE deck_stickers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deck_stickers TO anon;
GRANT ALL ON TABLE public.deck_stickers TO authenticated;
GRANT ALL ON TABLE public.deck_stickers TO service_role;


--
-- Name: TABLE desk_layouts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.desk_layouts TO anon;
GRANT ALL ON TABLE public.desk_layouts TO authenticated;
GRANT ALL ON TABLE public.desk_layouts TO service_role;


--
-- Name: TABLE diag_question_defaults; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.diag_question_defaults TO authenticated;
GRANT ALL ON TABLE public.diag_question_defaults TO service_role;


--
-- Name: TABLE diag_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.diag_results TO anon;
GRANT ALL ON TABLE public.diag_results TO authenticated;
GRANT ALL ON TABLE public.diag_results TO service_role;


--
-- Name: TABLE feed_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feed_comments TO authenticated;
GRANT ALL ON TABLE public.feed_comments TO service_role;


--
-- Name: TABLE feed_likes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feed_likes TO authenticated;
GRANT ALL ON TABLE public.feed_likes TO service_role;


--
-- Name: TABLE feedback_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback_requests TO anon;
GRANT ALL ON TABLE public.feedback_requests TO authenticated;
GRANT ALL ON TABLE public.feedback_requests TO service_role;


--
-- Name: TABLE groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.groups TO anon;
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.groups TO service_role;


--
-- Name: TABLE homework; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.homework TO anon;
GRANT ALL ON TABLE public.homework TO authenticated;
GRANT ALL ON TABLE public.homework TO service_role;


--
-- Name: TABLE hw_ai_grades; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hw_ai_grades TO service_role;
GRANT SELECT ON TABLE public.hw_ai_grades TO authenticated;


--
-- Name: TABLE lesson_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_attendance TO anon;
GRANT ALL ON TABLE public.lesson_attendance TO authenticated;
GRANT ALL ON TABLE public.lesson_attendance TO service_role;


--
-- Name: TABLE lesson_progress; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_progress TO anon;
GRANT ALL ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;


--
-- Name: TABLE lessons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE phrase_gaps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.phrase_gaps TO anon;
GRANT ALL ON TABLE public.phrase_gaps TO authenticated;
GRANT ALL ON TABLE public.phrase_gaps TO service_role;


--
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.plans TO anon;
GRANT ALL ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE quiz_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_questions TO anon;
GRANT ALL ON TABLE public.quiz_questions TO authenticated;
GRANT ALL ON TABLE public.quiz_questions TO service_role;


--
-- Name: TABLE review_cards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.review_cards TO anon;
GRANT ALL ON TABLE public.review_cards TO authenticated;
GRANT ALL ON TABLE public.review_cards TO service_role;


--
-- Name: TABLE schedule; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.schedule TO anon;
GRANT ALL ON TABLE public.schedule TO authenticated;
GRANT ALL ON TABLE public.schedule TO service_role;


--
-- Name: TABLE science_facts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.science_facts TO anon;
GRANT ALL ON TABLE public.science_facts TO authenticated;
GRANT ALL ON TABLE public.science_facts TO service_role;


--
-- Name: TABLE science_memes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.science_memes TO anon;
GRANT ALL ON TABLE public.science_memes TO authenticated;
GRANT ALL ON TABLE public.science_memes TO service_role;


--
-- Name: TABLE screening_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.screening_config TO anon;
GRANT ALL ON TABLE public.screening_config TO authenticated;
GRANT ALL ON TABLE public.screening_config TO service_role;


--
-- Name: TABLE set_cards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.set_cards TO anon;
GRANT ALL ON TABLE public.set_cards TO authenticated;
GRANT ALL ON TABLE public.set_cards TO service_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.students TO anon;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;


--
-- Name: TABLE task_bank; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_bank TO anon;
GRANT ALL ON TABLE public.task_bank TO authenticated;
GRANT ALL ON TABLE public.task_bank TO service_role;


--
-- Name: SEQUENCE task_bank_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.task_bank_id_seq TO anon;
GRANT ALL ON SEQUENCE public.task_bank_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.task_bank_id_seq TO service_role;


--
-- Name: TABLE teacher_invites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teacher_invites TO service_role;


--
-- Name: TABLE teacher_module_secrets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teacher_module_secrets TO service_role;


--
-- Name: TABLE teacher_modules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teacher_modules TO anon;
GRANT ALL ON TABLE public.teacher_modules TO authenticated;
GRANT ALL ON TABLE public.teacher_modules TO service_role;


--
-- Name: TABLE teacher_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teacher_subscriptions TO anon;
GRANT ALL ON TABLE public.teacher_subscriptions TO authenticated;
GRANT ALL ON TABLE public.teacher_subscriptions TO service_role;


--
-- Name: TABLE teacher_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teacher_tasks TO authenticated;
GRANT ALL ON TABLE public.teacher_tasks TO service_role;


--
-- Name: TABLE test_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.test_assignments TO anon;
GRANT ALL ON TABLE public.test_assignments TO authenticated;
GRANT ALL ON TABLE public.test_assignments TO service_role;


--
-- Name: TABLE tg_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tg_messages TO anon;
GRANT ALL ON TABLE public.tg_messages TO authenticated;
GRANT ALL ON TABLE public.tg_messages TO service_role;


--
-- Name: TABLE tg_threads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tg_threads TO anon;
GRANT ALL ON TABLE public.tg_threads TO authenticated;
GRANT ALL ON TABLE public.tg_threads TO service_role;


--
-- Name: TABLE trainer_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trainer_questions TO anon;
GRANT ALL ON TABLE public.trainer_questions TO authenticated;
GRANT ALL ON TABLE public.trainer_questions TO service_role;


--
-- Name: TABLE trainers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trainers TO anon;
GRANT ALL ON TABLE public.trainers TO authenticated;
GRANT ALL ON TABLE public.trainers TO service_role;


--
-- Name: TABLE tts_spend; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tts_spend TO anon;
GRANT ALL ON TABLE public.tts_spend TO authenticated;
GRANT ALL ON TABLE public.tts_spend TO service_role;


--
-- Name: TABLE widgets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.widgets TO anon;
GRANT ALL ON TABLE public.widgets TO authenticated;
GRANT ALL ON TABLE public.widgets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict K6iu0je7o2YEVzK0CeeoZVKyd5sYL8BbxKs3B9nONHGB5kudKOrSZwqiJYZub1P

