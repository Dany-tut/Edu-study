-- admin_recent_errors: два индексных прохода вместо перебора всех api_request.
-- Было ~1 с (до 7 с под нагрузкой), стало ~20 мс; выдача та же.
do $$ begin
  if md5(pg_get_functiondef('public.admin_recent_errors(integer)'::regprocedure)) <> '95f4ddd159109a64712f50819825a0ea' then
    raise exception 'admin_recent_errors changed since review';
  end if;
end $$;

create or replace function public.admin_recent_errors(p_limit integer default 50)
returns table(created_at timestamp with time zone, role text, path text, event text, msg text, src text, line integer, session_id text)
language plpgsql security definer set search_path to 'public'
as $function$
declare n int := greatest(1, least(p_limit, 500));
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with picked as (
    (select ae.created_at, ae.role, ae.path, ae.event, ae.meta, ae.session_id
       from public.analytics_events ae
      where ae.event in ('js_error','promise_rejection','rage_click','db_error','operation_failed','react_crash','widget_crash','native_crash','bootstrap_error','api_stalled','auth_failed','auth_stalled','resource_error','ui_blank','ui_loading_stalled')
        and public.analytics_is_real_traffic(ae.meta)
      order by ae.created_at desc limit n)
    union all
    -- первое условие повторяет предикат analytics_events_api_error_created_idx,
    -- второе — прежний точный отбор
    (select ae.created_at, ae.role, ae.path, ae.event, ae.meta, ae.session_id
       from public.analytics_events ae
      where ae.event = 'api_request'
        and (ae.meta->>'status') ~ '^(0{1,3}|[4-9][0-9]{2})$'
        and (ae.meta->>'status' = '0' or ae.meta->>'status' ~ '^[45][0-9][0-9]$')
        and public.analytics_is_real_traffic(ae.meta)
      order by ae.created_at desc limit n)
  )
  select p.created_at, p.role, p.path, p.event,
    coalesce(p.meta->>'msg', p.meta->>'message', p.meta->>'outcome', p.event),
    coalesce(p.meta->>'src', p.meta->>'ctx', p.meta->>'endpoint'),
    case when p.meta->>'line' ~ '^[0-9]{1,8}$' then (p.meta->>'line')::int end,
    p.session_id
  from picked p order by p.created_at desc limit n;
end;
$function$;
