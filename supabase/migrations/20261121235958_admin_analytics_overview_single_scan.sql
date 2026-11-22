-- Keep the admin activity overview responsive as analytics_events grows.
-- The previous function ran five separate scans over the same 7–30 day range
-- for each role and the teacher page requests both roles at once.

create index if not exists analytics_events_role_created_idx
  on public.analytics_events (role, created_at desc);

create or replace function public.admin_analytics_overview_by_role(
  p_role text,
  p_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  roles text[] := case when p_role = 'student' then array['student','anon']
                       else array['teacher','admin'] end;
  v_days int := greatest(1, least(coalesce(p_days, 30), 90));
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'events_total', count(*) filter (
      where e.created_at > now() - make_interval(days => v_days)
    ),
    'sessions', count(distinct e.session_id) filter (
      where e.created_at > now() - make_interval(days => v_days)
    ),
    'dau', count(distinct coalesce(e.user_id::text, e.student_id::text, e.session_id)) filter (
      where e.created_at > now() - interval '1 day'
    ),
    'wau', count(distinct coalesce(e.user_id::text, e.student_id::text, e.session_id)) filter (
      where e.created_at > now() - interval '7 days'
    ),
    'mau', count(distinct coalesce(e.user_id::text, e.student_id::text, e.session_id)) filter (
      where e.created_at > now() - interval '30 days'
    )
  ) into result
  from public.analytics_events e
  where e.role = any(roles)
    and e.created_at > now() - make_interval(days => greatest(v_days, 30))
    and e.created_at <= now();

  result := result || jsonb_build_object(
    'students_total', (select count(*) from public.students),
    'students_active', (
      select count(distinct e.student_id)
      from public.analytics_events e
      where e.student_id is not null
        and e.created_at > now() - interval '7 days'
        and e.created_at <= now()
    ),
    'groups_total', (select count(*) from public.groups)
  );

  return result;
end;
$$;

grant execute on function public.admin_analytics_overview_by_role(text, int) to authenticated;
