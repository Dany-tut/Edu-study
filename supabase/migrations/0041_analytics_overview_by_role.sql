-- Per-role analytics overview for the admin «Аналитика» tab.
-- Same shape as admin_analytics_overview(), but the *activity* metrics
-- (events / sessions / DAU / WAU / MAU) are filtered to a single audience.
--
-- Role bucketing: admins count as teachers, anonymous traffic counts as students.
--   p_role = 'teacher' → role in ('teacher','admin')
--   p_role = 'student' → role in ('student','anon')
--
-- The structural counts (students_total, students_active, groups_total) are
-- catalog figures, not activity, so they stay platform-wide under both roles.

create or replace function public.admin_analytics_overview_by_role(
  p_role text,
  p_days int default 30
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
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

grant execute on function public.admin_analytics_overview_by_role(text, int) to authenticated;
