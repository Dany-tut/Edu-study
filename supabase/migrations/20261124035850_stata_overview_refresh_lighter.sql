-- Перегрузка БД 23–24.11.2026 (statement timeout, PGRST003, 500 у сохранения
-- журнала). Главный вклад — cron «stata-overview-refresh» (job 24): каждые
-- 5 минут stata_overview_compute() читал ВСЕ api_request за 60 дней
-- (~148 тыс. строк) и разбирал у каждого meta->>'status', чтобы оставить
-- ~12,7 тыс. ошибочных. Среднее 16,6 с, в нагрузку до 120 с с таймаутом.
--
-- 1. Частичный индекс только по ошибочным api_request (статус 0 или 400–999).
--    На проде создан CONCURRENTLY 24.11 до этой миграции; здесь — для истории
--    и чистых окружений. Предикат — чистый regex без приведения к int, чтобы
--    вставка события с нечисловым статусом никогда не падала.
-- 2. В compute поток «bad» берёт api_request только через этот индекс.
--    Результат проверен на проде: overview бит-в-бит тот же (days 1/7/30,
--    incidents как множество), 14,7 с → 4,4 с.
-- 3. Обновление кэша раз в 15 минут со сдвигом (:03, :18, :33, :48), вне
--    минут, где стартуют остальные cron-задачи (:00/:05/:10).
--
-- Источник функции также в проекте Stata (~/Cursor/_Архив/Stata/cloud/
-- iskra-aggregate.sql): при ручной выкладке Stata брать это тело.

create index if not exists analytics_events_api_error_created_idx
  on public.analytics_events (created_at desc)
  where event = 'api_request' and (meta->>'status') ~ '^(0{1,3}|[4-9][0-9]{2})$';

create or replace function public.stata_overview_compute()
returns table(days integer, checked_at timestamptz, overview jsonb)
language sql stable set search_path='' set statement_timeout='30s' as $stata$
with periods(days) as (values (1),(7),(30)),
bad as materialized (
 select created_at,user_id,session_id,event,kind,public.stata_iskra_automated(event,meta,ua) as qa from (
  select e.created_at,e.user_id,e.session_id,e.event,e.meta,e.ua,
  case
  when e.event in ('react_crash','widget_crash') then 'crash'
  when e.event in ('ui_freeze','ui_blank','ui_loading_stalled','api_stalled') then 'hang'
  when e.event in ('js_error','db_error','resource_error','operation_failed','auth_failed','homework_submit_failed') then 'error'
  when e.event in ('api_slow','auth_stalled') then 'slow'
  when e.event='api_request' and case when e.meta->>'status' ~ '^[0-9]{1,3}$' then (e.meta->>'status')::int=0 or (e.meta->>'status')::int>=400 else false end then 'error'
  end as kind
  from (
   select created_at,user_id,session_id,event,meta,ua from public.analytics_events
   where created_at>now()-interval '60 days' and created_at<=now()
    and event in ('react_crash','widget_crash','ui_freeze','ui_blank','ui_loading_stalled','api_stalled','js_error','db_error','resource_error','operation_failed','auth_failed','homework_submit_failed','api_slow','auth_stalled')
   union all
   -- Только ошибочные api_request (статус 0 или 400–999): частичный индекс
   -- analytics_events_api_error_created_idx вместо разбора JSON у ~150 тыс. строк.
   select created_at,user_id,session_id,event,meta,ua from public.analytics_events
   where created_at>now()-interval '60 days' and created_at<=now()
    and event = 'api_request' and (meta->>'status') ~ '^(0{1,3}|[4-9][0-9]{2})$'
  ) e
 ) x where kind is not null
),
people as materialized (
 select u.user_id,l.last_seen from (
  with recursive ids as (
   (select user_id from public.analytics_events where user_id is not null order by user_id limit 1)
   union all
   select (select e.user_id from public.analytics_events e where e.user_id>ids.user_id order by e.user_id limit 1) from ids where ids.user_id is not null
  ) select user_id from ids where user_id is not null
 ) u cross join lateral (
  select e.created_at last_seen from public.analytics_events e
  where e.user_id=u.user_id and e.created_at>now()-interval '30 days' and e.created_at<=now()
   and not public.stata_iskra_automated(e.event,e.meta,e.ua)
  order by e.created_at desc limit 1
 ) l
),
acts as materialized (
 select e.event,e.created_at from public.analytics_events e
 where e.created_at>now()-interval '30 days' and e.created_at<=now()
  and e.event in ('lesson_open','homework_submit','trainer_open','course_create')
  and not public.stata_iskra_automated(e.event,e.meta,e.ua)
),
grouped as (
 select p.days,case when b.qa then 'qa' else b.kind end as kind,b.event,count(*) occurrences,count(distinct b.session_id) installations,max(extract(epoch from b.created_at)) last_seen
 from periods p join bad b on b.created_at>now()-make_interval(days=>p.days)
 group by 1,2,3
)
select p.days,now() as checked_at,jsonb_build_object('days',p.days,'counts',
 coalesce((select jsonb_object_agg(kind,n) from (select kind,sum(occurrences) n from grouped where days=p.days group by kind) x),'{}'::jsonb),
 'trend', jsonb_build_object('end',now(),'note','Люди: события без известных признаков автоматизации.', 'groups',
   (select coalesce(jsonb_agg(jsonb_build_object('name',event,'current',cur,'previous',prev) order by event),'[]'::jsonb)
    from (select event, count(*) filter(where created_at>now()-make_interval(days=>p.days)) cur,
          count(*) filter(where created_at<=now()-make_interval(days=>p.days)) prev
          from bad where qa is not true
          and created_at>now()-make_interval(days=>2*p.days) group by event) paired)),
 'automationTrend', jsonb_build_object('end',now(),'note','Автотесты: метка QA, признаки автоматизации или известный тестовый инцидент.', 'groups',
   (select coalesce(jsonb_agg(jsonb_build_object('name',event,'current',cur,'previous',prev) order by event),'[]'::jsonb)
    from (select event, count(*) filter(where created_at>now()-make_interval(days=>p.days)) cur,
          count(*) filter(where created_at<=now()-make_interval(days=>p.days)) prev
          from bad where qa is true
          and created_at>now()-make_interval(days=>2*p.days) group by event) paired)),
 'iskra', jsonb_build_object(
   'students', (select count(*) from public.profiles where role='student'),
   'teachers', (select count(*) from public.profiles where role='teacher'),
   'active', (select count(*) from people where last_seen>now()-make_interval(days=>p.days)),
   'affected', (select count(distinct user_id) from bad where qa is not true and created_at>now()-make_interval(days=>p.days)),
   'crashed', (select count(distinct user_id) from bad where qa is not true and kind='crash' and created_at>now()-make_interval(days=>p.days)),
   'lessonOpens', (select count(*) from acts where event='lesson_open' and created_at>now()-make_interval(days=>p.days)),
   'homeworkSubmits', (select count(*) from acts where event='homework_submit' and created_at>now()-make_interval(days=>p.days)),
   'trainerOpens', (select count(*) from acts where event='trainer_open' and created_at>now()-make_interval(days=>p.days)),
   'createdCourses', (select count(*) from acts where event='course_create' and created_at>now()-make_interval(days=>p.days))
 ) || (
   select jsonb_build_object(
     'aiEnabled', (select (count(*)=3 and bool_and(enabled))::int from public.app_flags where key in ('ai_enabled','ai_hw_grade','ai_hw_api')),
     'aiJobs', count(*),
     'aiGraded', count(*) filter (where graded_at is not null),
     'aiPending', count(*) filter (where status in ('pending','working')),
     'aiErrors', count(*) filter (where status='error')
   ) from public.hw_ai_grades where submitted_at>now()-make_interval(days=>p.days)
 ) || (
   select jsonb_build_object(
     'feedbackNew', count(*) filter (where created_at>now()-make_interval(days=>p.days)),
     'feedbackBugs', count(*) filter (where kind='bug' and created_at>now()-make_interval(days=>p.days)),
     'feedbackTopics', count(distinct topic_id) filter (where last_at>now()-make_interval(days=>p.days)),
     'feedbackPending', count(*) filter (where triage_state='pending'),
     'feedbackTriage', (select (count(*)=2 and bool_and(enabled))::int from public.app_flags where key in ('ai_enabled','ai_feedback_triage'))
   ) from public.feedback_items
 ),
 'reporting_users',(select count(*) from people where last_seen>now()-make_interval(days=>p.days)),
 'incidents',coalesce((select jsonb_agg(jsonb_build_object('fingerprint',left(md5(case when kind='qa' then 'qa:'||event else event end),24),'kind',kind,'code',event,'component',case when kind='qa' then 'iskra.qa' else 'iskra.web' end,'version','all','occurrences',occurrences,'installations',installations,'last_seen',last_seen)) from grouped where days=p.days),'[]'::jsonb)
) as overview from periods p;
$stata$;
revoke all on function public.stata_overview_compute() from public, anon, authenticated;
grant execute on function public.stata_overview_compute() to service_role;

select cron.schedule('stata-overview-refresh', '3,18,33,48 * * * *', 'select public.stata_overview_refresh()');
