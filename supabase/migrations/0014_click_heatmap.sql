-- 0014_click_heatmap.sql
-- Spatial click heatmaps per screen (the Hotjar/Clarity-style click map).
-- Reads normalised click coords (meta.xr / meta.yr in 0..1) emitted by
-- src/lib/analytics.ts installClickTracking(), aggregated into a coarse density
-- grid so the client can render gaussian density blobs. Admin-only.

-- Grid resolution — matches GRID_W/GRID_H in TeacherAnalytics.tsx.
--   48 columns × 30 rows keeps rows small while staying visually smooth.

-- List of screens that have click data, with per-role counts, for the selector.
create or replace function public.admin_click_paths(p_days int default 30)
returns table(path text, teacher_clicks bigint, student_clicks bigint, total bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select ae.path,
           count(*) filter (where ae.role in ('teacher','admin'))::bigint,
           count(*) filter (where ae.role = 'student')::bigint,
           count(*)::bigint
    from analytics_events ae
    where ae.event = 'click'
      and ae.path is not null
      and ae.created_at > now() - make_interval(days => p_days)
      and (ae.meta ? 'xr')
    group by ae.path
    order by 4 desc;
end; $$;

-- Density grid for one screen + role. gx/gy are 0-based grid cells.
create or replace function public.admin_click_heatmap(
  p_path text,
  p_role text default 'teacher',
  p_days int default 30
)
returns table(gx int, gy int, cnt bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select least(47, greatest(0, floor((ae.meta->>'xr')::numeric * 48)))::int as gx,
           least(29, greatest(0, floor((ae.meta->>'yr')::numeric * 30)))::int as gy,
           count(*)::bigint
    from analytics_events ae
    where ae.event = 'click'
      and ae.path = p_path
      and ae.created_at > now() - make_interval(days => p_days)
      and (ae.meta ? 'xr')
      and (
        (p_role = 'student' and ae.role = 'student')
        or (p_role = 'teacher' and ae.role in ('teacher','admin'))
      )
    group by 1, 2;
end; $$;
