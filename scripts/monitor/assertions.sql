insert into analytics_events(event,meta,session_id) values
('operation_failed','{"incident_id":"same","failure_id":"journey","event_source":"browser_unclassified","app_host_kind":"canonical_production"}','a'),
('operation_failed','{"incident_id":"same","event_source":"browser_unclassified","app_host_kind":"canonical_production"}','a'),
('diagnostic_recovery','{"failure_id":"journey","stage":"observed","evidence":"module_loaded"}','a'),
('api_cancelled','{"status":0}','a'),
('api_request','{"status":200,"duration_ms":"malicious-not-numeric"}','a'),
('operation_failed','{"incident_id":"test","event_source":"qa","app_host_kind":"canonical_production"}','qa'),
('api_request','{"incident_id":"timeout","status":0,"outcome":"timeout","event_source":"browser_unclassified","app_host_kind":"canonical_production"}','b');
do $$begin
  if (select count(*) from iskra_monitor.signals)<>3 then raise exception 'dedup/cancel/test classification failed'; end if;
  if (select recovery_evidence from iskra_monitor.signals where delivery_id='same')<>'module_loaded' then raise exception 'recovery evidence lost';end if;
  if (select triage_state from iskra_monitor.signals where delivery_id='same')<>'needs_review' then raise exception 'recovery hid original';end if;
end$$;
set role anon;
select iskra_monitor_summary();
do $$begin
  begin perform * from iskra_monitor.signals;raise exception 'anon read allowed';exception when insufficient_privilege then null;end;
  begin perform * from public.iskra_monitor_incidents();raise exception 'anon queue allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role authenticated;
do $$begin
  begin perform * from public.iskra_monitor_incidents();raise exception 'non-admin queue allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('fixture.uid','11111111-1111-1111-1111-111111111111',false);
select set_config('fixture.admin','true',false);
set role authenticated;
select count(*) as admin_rows from public.iskra_monitor_incidents();
reset role;
do $$begin
  if (public.iskra_monitor_summary()->>'open_signals')::int <> 2 then raise exception 'summary wrong';end if;
  if public.iskra_monitor_summary()::text ~ '(same|journey|11111111)' then raise exception 'private details leaked';end if;
end$$;
insert into analytics_events(event,session_id,meta) values('diagnostic_recovery','late','{"failure_id":"outoforder","stage":"observed","evidence":"module_loaded"}'),('operation_failed','late','{"incident_id":"late-failure","failure_id":"outoforder"}');
do $$begin
 if (select recovery_evidence from iskra_monitor.signals where delivery_id='late-failure')<>'module_loaded' then raise exception 'out-of-order recovery lost';end if;
end$$;
