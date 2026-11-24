-- admin_page_stats: читать только события, которые функция считает.
--
-- «Проблемы» в Аналитике грузились 5–9 с. Функция перебирала ВСЕ события окна
-- (75 тыс. за 30 дней) и для каждого распаковывала meta ради
-- analytics_is_real_traffic — в том числе 18 тыс. api_request с цепочками
-- breadcrumbs (20 МБ jsonb), хотя ни одно из них в счёт не идёт. Отбор по
-- event до проверки meta: 2,8 с → 65 мс на том же окне (замер 24.11.2026).
--
-- Результат прежний для всех строк, где есть визиты, ошибки, rage или время на
-- экране. Пропадают только пары «путь + роль», у которых были лишь посторонние
-- события (пульс, клики) — у них все счётчики нулевые, и клиент их не показывал.
-- Только чтение, данные не меняются.

do $$
begin
  if md5(pg_get_functiondef('public.admin_page_stats(integer)'::regprocedure)) <> 'fa14221c0a6afc9025fedbf6980efe8b' then
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
        and ae.event in ('page_view', 'page_leave', 'js_error', 'promise_rejection', 'rage_click')
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
