-- A manual escalation is durable even if the browser loses the response.
-- Feedback, the incident signal and the administrator's realtime bell share a transaction.
create function public.report_course_save_failure(p_report_id uuid, p_diagnostics jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  d jsonb := p_diagnostics;
  clean jsonb;
  feedback_key uuid;
  retries int;
  country text;
  known_country text;
  body text;
begin
  if actor is null or not coalesce(public.is_staff(),false) or not coalesce(public.mfa_ok(),false) then
    raise insufficient_privilege using message='Teacher session required';
  end if;
  if p_report_id is null or jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>8192
    or coalesce(d->>'manual_retries','') !~ '^[0-9]{1,4}$' then
    raise invalid_parameter_value using message='Invalid save report';
  end if;
  retries := (d->>'manual_retries')::int;
  if retries < 2 then raise invalid_parameter_value using message='Two failed retries required'; end if;
  feedback_key := md5('course-save/'||actor::text||'/'||p_report_id::text)::uuid;
  perform pg_advisory_xact_lock(hashtextextended('course-save-report/'||actor::text,0));
  if exists(select 1 from iskra_monitor.signals where delivery_id=feedback_key::text and user_id=actor)
    and exists(select 1 from public.feedback_requests where id=feedback_key and author_id=actor::text) then
    return p_report_id;
  end if;
  if (select count(*) from public.feedback_requests where author_id=actor::text and created_at>now()-interval '10 minutes'
        and starts_with(message,'[course_save_failure]'))>=10 then
    raise exception using errcode='PT429',message='Too many separate save reports; retry later';
  end if;

  -- Country is only a coarse hint. Prefer the edge country header when available;
  -- neither client nor edge labels participate in any access decision.
  known_country := upper(nullif(current_setting('request.headers',true),'')::jsonb->>'cf-ipcountry');
  if known_country !~ '^[A-Z]{2}$' or known_country in ('XX','ZZ') then known_country := null; end if;
  country := coalesce(known_country,case when d->>'country' ~ '^[A-Z]{2}$' then d->>'country' end);
  clean := jsonb_strip_nulls(jsonb_build_object(
    'incident_id', feedback_key, 'failure_id', feedback_key, 'operation','course_save_report','reason','save_failed',
    'report_id',p_report_id,'manual_retries',retries,
    'course_id',case when d->>'course_id' ~ '^[A-Za-z0-9_~-]{1,160}$' then d->>'course_id' end,
    'session_id',case when d->>'session_id' ~ '^[A-Za-z0-9-]{1,80}$' then d->>'session_id' end,
    'app_version',case when d->>'app_version' ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,9}(·[a-f0-9]{7,40})?$' then d->>'app_version' end,
    'stage',case when d->>'stage' ~ '^[A-Za-z_]{1,35}$' then d->>'stage' end,
    'kind',case when d->>'kind' ~ '^[A-Za-z0-9_:-]{1,40}$' then d->>'kind' end,
    'code',case when d->>'code' ~ '^[A-Za-z0-9_-]{1,40}$' then d->>'code' end,
    'browser',case when d->>'browser' ~ '^[A-Za-z .0-9-]{1,32}$' then d->>'browser' end,
    'browser_version',case when d->>'browser_version' ~ '^[0-9.]{1,32}$' then d->>'browser_version' end,
    'os',case when d->>'os' ~ '^[A-Za-z .0-9_-]{1,50}$' then d->>'os' end,
    'client_platform',case when d->>'client_platform' ~ '^[A-Za-z .0-9_-]{1,32}$' then d->>'client_platform' end,
    'screen',case when d->>'screen' ~ '^[0-9]{1,5}[x×][0-9]{1,5}$' then d->>'screen' end,
    'viewport',case when d->>'viewport' ~ '^[0-9]{1,5}[x×][0-9]{1,5}$' then d->>'viewport' end,
    'client_timezone',case when d->>'client_timezone' ~ '^[A-Za-z0-9/+_-]{1,64}$' then d->>'client_timezone' end,
    'country',country,'country_source',case when known_country is not null then 'edge_hint' when country is not null then 'timezone_estimate' end,
    'online',case when jsonb_typeof(d->'online')='boolean' then d->'online' end,
    'conflict',case when jsonb_typeof(d->'conflict')='boolean' then d->'conflict' end,
    'recovered_draft',case when jsonb_typeof(d->'recovered_draft')='boolean' then d->'recovered_draft' end,
    'event_source',case when d->>'event_source' in ('qa','automation_suspected','browser_unclassified') then d->>'event_source' else 'browser_unclassified' end,
    'app_host_kind',case when d->>'app_host_kind' in ('canonical_production','native','local','other_host') then d->>'app_host_kind' else 'unknown' end
  ));
  body := format(E'[course_save_failure] Ошибка сохранения курса\nОтчёт %s · неудачных повторов: %s\nКурс: %s\nЭтап: %s · код: %s · причина: %s\nИскра %s · %s %s · %s\nСтрана: %s (%s) · часовой пояс: %s',
    p_report_id,retries,coalesce(clean->>'course_id','—'),coalesce(clean->>'stage','—'),coalesce(clean->>'code','—'),coalesce(clean->>'kind','—'),
    coalesce(clean->>'app_version','—'),coalesce(clean->>'browser','—'),coalesce(clean->>'browser_version',''),coalesce(clean->>'os',clean->>'client_platform','—'),
    coalesce(country,'неизвестна'),case when known_country is not null then 'по сети' when country is not null then 'по часовому поясу' else 'нет данных' end,coalesce(clean->>'client_timezone','—'));
  insert into public.feedback_requests(id,author_id,author_role,section,message) values(feedback_key,actor::text,'teacher','Конструктор',body);
  insert into public.analytics_events(user_id,role,session_id,event,path,meta,ua)
    values(actor,'teacher',clean->>'session_id','operation_failed','#/teacher/constructor',clean,concat_ws(' ',clean->>'browser',clean->>'browser_version',clean->>'os'));
  if not exists(select 1 from iskra_monitor.signals where delivery_id=feedback_key::text) then
    raise exception 'Save report monitor did not acknowledge receipt';
  end if;
  insert into public.notifications(recipient_id,recipient_role,type,title,body,link)
    select admin_id,'teacher','course_save_failure','Сбой сохранения курса',
      format('Учитель сообщил о сбое после %s повторов. Подробности в заявках.', retries),
      jsonb_build_object('page','teacher/admin','tab','requests','feedbackId',feedback_key)
    from public._notif_admins() admin_id;
  return p_report_id;
end $$;
revoke all on function public.report_course_save_failure(uuid,jsonb) from public,anon;
grant execute on function public.report_course_save_failure(uuid,jsonb) to authenticated;
