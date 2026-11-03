-- Candidate only. Apply to Iskra only after owner approves DB/cron/public summary.
create schema if not exists iskra_monitor;
revoke all on schema iskra_monitor from public, anon, authenticated;
create table iskra_monitor.signals (
  delivery_id text primary key, first_event_id bigint not null, last_seen timestamptz not null default now(),
  fingerprint text, failure_id text, source text not null, host_kind text not null, event text not null,
  version text, screen text, user_id uuid, student_id uuid, session_id text,
  recovery_stage text, recovery_evidence text, resolution_sha text, resolved_at timestamptz, triage_state text not null default 'needs_review'
);
create index on iskra_monitor.signals(failure_id);
create index on iskra_monitor.signals(fingerprint);
create index on iskra_monitor.signals(last_seen);
create index on iskra_monitor.signals(source,host_kind) where triage_state<>'resolved';
create table iskra_monitor.recoveries(failure_id text,session_id text,actor text,stage text,evidence text,received_at timestamptz default now(),primary key(failure_id,session_id,actor));
alter table iskra_monitor.recoveries enable row level security;
create table iskra_monitor.health(singleton boolean primary key default true check(singleton), checked_at timestamptz, last_error_at timestamptz);
insert into iskra_monitor.health(singleton) values(true);
alter table iskra_monitor.signals enable row level security;
alter table iskra_monitor.health enable row level security;
revoke all on all tables in schema iskra_monitor from public, anon, authenticated;

-- Runs in the insert transaction: recovered failures are not lost between polls.
create function iskra_monitor.capture() returns trigger language plpgsql security definer set search_path='' as $$
declare src text; host text; signal boolean; delivery text;
begin
  src := case when new.meta->>'event_source' in ('qa','automation_suspected','browser_unclassified') then new.meta->>'event_source'
    when new.ua ~* '(HeadlessChrome|Playwright)' then 'automation_suspected' else 'legacy_unclassified' end;
  host := case when new.meta->>'app_host_kind' in ('canonical_production','native','local','other_host') then new.meta->>'app_host_kind' else 'unknown' end;
  signal := new.event in ('native_crash','bootstrap_error','js_error','promise_rejection','react_crash','widget_crash','api_slow','api_stalled','ui_freeze','ui_loading_stalled','ui_blank','resource_error','operation_failed','auth_failed','auth_stalled');
  if new.event='api_request' then
    signal := coalesce(new.meta->>'status'='0' or new.meta->>'status' ~ '^[45][0-9][0-9]$',false)
      or case when new.meta->>'duration_ms' ~ '^[0-9]{1,10}([.][0-9]{1,5})?$' then (new.meta->>'duration_ms')::numeric >= 3000 else false end;
  end if;
  if new.event='diagnostic_recovery' then
    -- Never trust this as resolution of a defect; keep the original for investigation.
    if new.meta->>'failure_id' is null or new.session_id is null then return new;end if;
    insert into iskra_monitor.recoveries(failure_id,session_id,actor,stage,evidence)
      values(left(new.meta->>'failure_id',80),left(new.session_id,80),coalesce(new.user_id::text,'anon'),left(new.meta->>'stage',40),left(new.meta->>'evidence',40))
      on conflict(failure_id,session_id,actor) do update set stage=excluded.stage,evidence=excluded.evidence,received_at=now()
      where iskra_monitor.recoveries.stage is distinct from 'observed';
    update iskra_monitor.signals s set recovery_stage=r.stage,recovery_evidence=r.evidence from iskra_monitor.recoveries r
      where s.failure_id=r.failure_id and s.session_id=r.session_id and coalesce(s.user_id::text,'anon')=r.actor and r.failure_id=left(new.meta->>'failure_id',80) and r.session_id=new.session_id and r.actor=coalesce(new.user_id::text,'anon');
    return new;
  end if;
  if not coalesce(signal,false) then return new; end if;
  delivery := coalesce(nullif(left(new.meta->>'incident_id',80),''),'row:'||new.id);
  insert into iskra_monitor.signals(delivery_id,first_event_id,fingerprint,failure_id,source,host_kind,event,version,screen,user_id,student_id,session_id)
    values(delivery,new.id,md5(concat_ws('|',src,host,new.event,left(new.meta->>'app_version',80),regexp_replace(left(new.path,200),'[0-9a-fA-F-]{32,36}',':id','g'),left(new.meta->>'endpoint',100),left(new.meta->>'operation',80),left(new.meta->>'reason',80))),left(new.meta->>'failure_id',80),src,host,left(new.event,60),left(new.meta->>'app_version',80),left(new.path,200),new.user_id,new.student_id,left(new.session_id,80))
    on conflict(delivery_id) do nothing;
  update iskra_monitor.signals s set recovery_stage=r.stage,recovery_evidence=r.evidence
    from iskra_monitor.recoveries r where s.delivery_id=delivery and s.failure_id=r.failure_id and s.session_id=r.session_id and coalesce(s.user_id::text,'anon')=r.actor;
  return new;
exception when others then
  -- Monitoring must not reject product telemetry. Health exposes failed capture.
  update iskra_monitor.health set last_error_at=now() where singleton;
  return new;
end $$;
revoke all on function iskra_monitor.capture() from public,anon,authenticated;
create trigger iskra_monitor_capture after insert on public.analytics_events for each row execute function iskra_monitor.capture();

create function iskra_monitor.tick() returns void language plpgsql security definer set search_path='' as $$
begin
  -- Server heartbeat verifies the source table is readable, independently of traffic.
  perform id from public.analytics_events order by id desc limit 1;
  update iskra_monitor.health set checked_at=now() where singleton;
  -- Closed evidence only: unresolved incidents must survive quiet periods.
  delete from iskra_monitor.recoveries where received_at < now()-interval '7 days';
  delete from iskra_monitor.signals where triage_state='resolved' and last_seen < now()-interval '30 days';
end $$;
revoke all on function iskra_monitor.tick() from public,anon,authenticated;

-- Deliberately public, fixed aggregate contract: no IDs, paths, messages or logs.
create function public.iskra_monitor_summary() returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object('schema_version',1,'project','iskra','checked_at',h.checked_at,
    'capture_error',h.last_error_at is not null,
    'work_revision',(select md5(coalesce(max(first_event_id)::text,'0')||':'||count(*) filter(where triage_state<>'resolved')::text) from iskra_monitor.signals where source in ('browser_unclassified','legacy_unclassified') and host_kind in ('canonical_production','native')),
    'open_signals',(select count(*) from iskra_monitor.signals where triage_state<>'resolved' and source in ('browser_unclassified','legacy_unclassified') and host_kind in ('canonical_production','native')),
    'unclassified_signals',(select count(*) from iskra_monitor.signals where triage_state<>'resolved' and source='legacy_unclassified' and host_kind='unknown'),
    'test_signals',(select count(*) from iskra_monitor.signals where source in ('qa','automation_suspected') or host_kind in ('local','other_host')))
  from iskra_monitor.health h where singleton;
$$;
revoke all on function public.iskra_monitor_summary() from public;
grant execute on function public.iskra_monitor_summary() to anon,authenticated;

-- Private review queue, available only to existing Iskra admins. Client source labels are NOT authorization.
create function public.iskra_monitor_incidents(p_after bigint default 0) returns setof iskra_monitor.signals language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return query select * from iskra_monitor.signals where first_event_id>p_after order by first_event_id limit 100;
end $$;
revoke all on function public.iskra_monitor_incidents(bigint) from public,anon;
grant execute on function public.iskra_monitor_incidents(bigint) to authenticated;

-- Explicit admin triage only. Recovery/client fields can never resolve a defect.
create function public.iskra_monitor_update_state(p_fingerprint text,p_state text,p_verified_sha text default null) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Forbidden' using errcode='42501';end if;
  if p_state not in ('needs_review','investigating','fix_ready','awaiting_approval','resolved') then raise exception 'Invalid state';end if;
  if p_state='resolved' and coalesce(p_verified_sha,'') !~ '^[0-9a-f]{40}$' then raise exception 'Verified release SHA required';end if;
  update iskra_monitor.signals set triage_state=p_state,resolution_sha=p_verified_sha,resolved_at=case when p_state='resolved' then now() else null end where fingerprint=p_fingerprint;
end $$;
revoke all on function public.iskra_monitor_update_state(text,text,text) from public,anon;
grant execute on function public.iskra_monitor_update_state(text,text,text) to authenticated;

-- pg_cron is already used by Iskra; no new secret, network service or grant to cron callers.
select cron.schedule('iskra-monitor-heartbeat','* * * * *',$$select iskra_monitor.tick()$$);
select iskra_monitor.tick();
