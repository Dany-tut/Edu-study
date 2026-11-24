-- Расчёт сводки Stata читает узкие iskra_private.stata_events/stata_user_seen
-- (20261124042105) вместо 250 МБ analytics_events. Таблицы заполнены историей
-- за 60/30 дней 24.11 вручную (insert ... on conflict do nothing), дальше их
-- ведёт триггер stata_rollup_capture. Проверено на проде: overview бит-в-бит
-- тот же, что у прежней версии (days 1/7/30, incidents как множество);
-- 8,9 с → 0,23 с на холодном кэше.
-- Восстановление кэша при расхождении: очистить обе таблицы и повторить
-- заполнение запросами из этой задачи (выборка по stata_event_kind и
-- последнему не-автоматическому событию пользователя за 30 дней).

create or replace function public.stata_overview_compute()
returns table(days integer, checked_at timestamptz, overview jsonb)
language sql stable set search_path='' set statement_timeout='30s' as $stata$
with periods(days) as (values (1),(7),(30)),
bad as materialized (
 select created_at,user_id,session_id,event,kind,qa from iskra_private.stata_events
 where kind<>'act' and created_at>now()-interval '60 days' and created_at<=now()
),
people as materialized (
 select user_id,last_seen from iskra_private.stata_user_seen
 where last_seen>now()-interval '30 days' and last_seen<=now()
),
acts as materialized (
 select event,created_at from iskra_private.stata_events
 where kind='act' and not qa and created_at>now()-interval '30 days' and created_at<=now()
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
select public.stata_overview_refresh();
