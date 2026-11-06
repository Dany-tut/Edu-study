-- Stata: обратная связь Искры в ежеминутной сводке.
--
-- Та же stata_cloud_overview(), что в 20261106105153, плюс пять целых чисел в
-- блоке iskra: feedbackNew, feedbackBugs, feedbackTopics, feedbackPending,
-- feedbackTriage. Наружу уходят только счётчики — тексты обращений остаются в
-- базе. Копия определения — Stata/cloud/iskra-aggregate.sql: менять в обоих
-- местах, иначе выкладка Stata вернёт старую версию.

create or replace function public.stata_cloud_overview() returns table(days integer, checked_at timestamptz, overview jsonb) language sql stable security invoker set search_path='' set statement_timeout='8s' as $stata$
with periods(days) as (values (1),(7),(30)),
-- Только проблемные события за 60 дней: из них строятся инциденты, тренды и
-- «затронутые» пользователи. Раньше классифицировалась каждая строка таблицы.
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
  from public.analytics_events e
  where e.created_at>now()-interval '60 days' and e.created_at<=now()
   and e.event in ('react_crash','widget_crash','ui_freeze','ui_blank','ui_loading_stalled','api_stalled','js_error','db_error','resource_error','operation_failed','auth_failed','homework_submit_failed','api_slow','auth_stalled','api_request')
 ) x where kind is not null
),
-- Активные люди: по каждому пользователю — последнее «живое» событие по
-- индексу (user_id, created_at desc), а не проверка всех его событий.
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
   -- Обратная связь (форма + Telegram, миграция 20261106120100): сколько
   -- пришло за период, сколько из них ошибок, в скольких темах, сколько ждёт
   -- разбора прямо сейчас и включена ли сортировка моделью.
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
revoke all on function public.stata_cloud_overview() from public, anon, authenticated;
grant execute on function public.stata_cloud_overview() to service_role;
