-- Ежемесячный разбор телеметрии моделью.
--
-- ЗАЧЕМ. Вкладка «Аналитика» показывает цифры, но не выводы: чтобы понять, что
-- «84% тапов на списке ДЗ приходятся на нижний бар» значит «экран не выполняет
-- свою работу», кто-то должен эти цифры прочитать. Раз в месяц это делает
-- модель: забирает сводку одним запросом, пишет разбор, кладёт его сюда.
--
-- ПОЧЕМУ СВОДКА, А НЕ СЫРЫЕ СОБЫТИЯ. В таблице десятки тысяч строк; в модель
-- поедет один jsonb на пару килобайт. Агрегация здесь же, в SQL, — она дешевле
-- и, в отличие от пересказа, ничего не выдумывает.
--
-- ЧЕГО ЗДЕСЬ НЕТ. Ключа стороннего API: он живёт в секретах функции
-- (`supabase secrets set KIE_API_KEY=…`) и в базу не попадает никогда.

-- ── 1. Хранилище отчётов ─────────────────────────────────────────────────────
create table if not exists public.analytics_reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- За какой период считалась сводка. Для кликов период всё равно упирается в
  -- ретенцию (14 дней, миграция 0070) — это записано в самом stats.
  period_days int  not null,
  model       text not null,
  -- Разбор в markdown — то, что видит админ.
  body        text not null,
  -- Сводка, по которой он написан: без неё отчёт нечем проверить.
  stats       jsonb not null,
  tokens_in   int,
  tokens_out  int
);

create index if not exists analytics_reports_created_idx
  on public.analytics_reports (created_at desc);

alter table public.analytics_reports enable row level security;

-- Читает только админ. Пишет только функция под service_role (она RLS минует),
-- поэтому политики на запись здесь нет намеренно.
drop policy if exists analytics_reports_admin_read on public.analytics_reports;
create policy analytics_reports_admin_read on public.analytics_reports
  for select using (public.is_admin());

-- ── 2. Сводка для модели ─────────────────────────────────────────────────────
--
-- Один вызов — один jsonb. Состав повторяет то, на что реально смотрят глазами:
-- объём и охват, экраны с кликами (и доля синтетических кликов в них), вертикаль
-- по зонам отдельно для телефона и десктопа, ошибки, ярость, воронка.
create or replace function public.admin_analytics_digest_input(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Клики живут 14 дней (0070): просить больше бессмысленно, а показывать
  -- «за 30 дней» поверх десяти — врать самому себе.
  click_days int := least(p_days, 14);
  result jsonb;
begin
  -- Функцию зовут двое: админ из кабинета и cron под service_role. У второго
  -- auth.uid() пуст, is_admin() ложен — поэтому проверка допускает обоих.
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
           count(*)                                                        clicks,
           count(*) filter (where c.synthetic)                             synthetic,
           count(*) filter (where c.role in ('teacher','admin'))           teacher_clicks,
           count(*) filter (where c.role = 'student')                      student_clicks,
           coalesce(v.n, 0)                                                page_views,
           -- Вертикаль считается ТОЛЬКО по живым кликам: синтетические сидят
           -- в (0,0) и иначе перетянули бы всю картину в верхнюю зону.
           count(*) filter (where not c.synthetic and c.yr < 0.10)              y_top,
           count(*) filter (where not c.synthetic and c.yr >= 0.10 and c.yr < 0.55) y_mid,
           count(*) filter (where not c.synthetic and c.yr >= 0.55 and c.yr < 0.85) y_low,
           count(*) filter (where not c.synthetic and c.yr >= 0.85)              y_bottom,
           count(*) filter (where not c.synthetic and c.w < 768)                 phone,
           count(*) filter (where not c.synthetic and c.w >= 768)                desktop
    from clicks c
    left join views v on v.path = c.path
    group by c.path, v.n
    order by 2 desc
    limit 30
  ),
  errors as (
    select coalesce(meta->>'msg', '') msg,
           path,
           count(*) n,
           max(created_at)::date last_seen
    from analytics_events
    where event in ('js_error', 'promise_rejection', 'react_crash', 'db_error')
      and created_at > now() - make_interval(days => p_days)
    group by 1, 2
    order by 3 desc
    limit 20
  ),
  rage as (
    select path,
           left(coalesce(meta->>'text', meta->>'tag', ''), 60) target,
           count(*) n
    from analytics_events
    where event = 'rage_click' and created_at > now() - make_interval(days => p_days)
    group by 1, 2 order by 3 desc limit 10
  ),
  totals as (
    select count(*)                                      events,
           count(distinct user_id)                       users,
           count(distinct session_id)                    sessions,
           count(*) filter (where event = 'click')       clicks,
           count(*) filter (where event = 'click'
             and (meta->>'xr')::numeric = 0
             and (meta->>'yr')::numeric = 0)             synthetic_clicks
    from analytics_events
    where created_at > now() - make_interval(days => p_days)
  )
  select jsonb_build_object(
    'period_days',       p_days,
    'click_days',        click_days,
    'generated_at',      now(),
    'totals',            (select to_jsonb(t) from totals t),
    'screens',           coalesce((select jsonb_agg(to_jsonb(s)) from screens s), '[]'::jsonb),
    'errors',            coalesce((select jsonb_agg(to_jsonb(e)) from errors e), '[]'::jsonb),
    'rage_clicks',       coalesce((select jsonb_agg(to_jsonb(r)) from rage r), '[]'::jsonb),
    -- Воронка считается здесь, а не вызовом admin_progress_funnel(): та
    -- падает с 'forbidden' под service_role (is_admin() читает роль из JWT,
    -- а у cron её нет).
    'funnel',            jsonb_build_object(
      'assigned',  (select count(*) from lesson_progress),
      'started',   (select count(*) from lesson_progress where status in ('current','submitted','completed')),
      'submitted', (select count(*) from lesson_progress where status in ('submitted','completed')),
      'completed', (select count(*) from lesson_progress where status = 'completed'))
  ) into result;

  return result;
end; $$;

-- ── 3. Чтение отчётов кабинетом ──────────────────────────────────────────────
create or replace function public.admin_analytics_reports(p_limit int default 12)
returns table(
  id uuid, created_at timestamptz, period_days int, model text,
  body text, stats jsonb, tokens_in int, tokens_out int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select r.id, r.created_at, r.period_days, r.model, r.body, r.stats, r.tokens_in, r.tokens_out
    from analytics_reports r
    order by r.created_at desc
    limit greatest(1, least(p_limit, 50));
end; $$;

revoke all on function public.admin_analytics_digest_input(int) from public;
revoke all on function public.admin_analytics_reports(int)      from public;
grant execute on function public.admin_analytics_digest_input(int) to authenticated, service_role;
grant execute on function public.admin_analytics_reports(int)      to authenticated;
