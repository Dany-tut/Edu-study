-- Built online with CREATE INDEX CONCURRENTLY before this transactional migration.
-- IF NOT EXISTS also supports fresh databases; no row retention or authorization changes.
create index if not exists analytics_events_activity_cover_idx
  on public.analytics_events(created_at desc) include(event, role, user_id, student_id, session_id);
create index if not exists analytics_events_real_page_cover_idx
  on public.analytics_events(created_at desc) include(path, role, event)
  where path is not null and public.analytics_is_real_traffic(meta);

do $$ begin
  if md5(pg_get_functiondef('public.admin_page_stats(integer)'::regprocedure)) <> '53797c4041e5b4fe4400c30b23655d2e' then
    raise exception 'admin_page_stats changed: review migration before applying';
  end if;
end $$;

create or replace function public.admin_page_stats(p_days integer default 30)
returns table(path text, role text, visits bigint, avg_dwell_sec numeric, errors bigint, rage_clicks bigint)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    with counts as (
      select ae.path, ae.role,
        count(*) filter (where ae.event = 'page_view') as visits,
        count(*) filter (where ae.event in ('js_error','promise_rejection')) as errors,
        count(*) filter (where ae.event = 'rage_click') as rage_clicks
      from public.analytics_events ae
      where ae.created_at > now() - make_interval(days => p_days)
        and ae.path is not null and public.analytics_is_real_traffic(ae.meta)
      group by ae.path, ae.role
    ), dwell as (
      select ae.path, ae.role,
        round(avg((ae.meta->>'dwell_ms')::numeric) / 1000, 1) as avg_dwell_sec
      from public.analytics_events ae
      where ae.created_at > now() - make_interval(days => p_days)
        and ae.path is not null and ae.event = 'page_leave'
        and public.analytics_is_real_traffic(ae.meta)
      group by ae.path, ae.role
    )
    select c.path, c.role, c.visits, d.avg_dwell_sec, c.errors, c.rage_clicks
    from counts c left join dwell d
      on c.path = d.path and c.role is not distinct from d.role
    order by c.errors desc, c.rage_clicks desc, c.visits desc;
end;
$$;
