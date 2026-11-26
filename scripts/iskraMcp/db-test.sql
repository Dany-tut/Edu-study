-- Проверки миграции MCP v2. Каждая ошибка проверки — raise exception, psql
-- с ON_ERROR_STOP падает. Запуск: scripts/iskraMcp/run-db-test.sh.
\set A  '''aaaaaaaa-0000-4000-8000-000000000001'''
\set B  '''bbbbbbbb-0000-4000-8000-000000000002'''
\set SA '''5a000000-0000-4000-8000-000000000001'''
\set SB '''5b000000-0000-4000-8000-000000000002'''

insert into public.students (id, name, created_by, phone, temp_password) values
  (:SA, 'Натали', :A, '+70000000001', 'secret'),
  (:SB, 'Чужой ученик', :B, '+70000000002', 'secret2');

-- Вспомогательное: войти как учитель (без client_id — сессия Искры) или как ИИ-клиент.
create function pg_temp.claims(uid text, client text default null, role text default 'teacher') returns void
language sql as $$
  select set_config('request.jwt.claims', jsonb_strip_nulls(jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'client_id', client,
    'app_metadata', jsonb_build_object('role', role)))::text, true)
$$;
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- 1. Триггер ленты: ученик (anon) сдаёт, комментирует; черновик и «current» — не события.
begin;
set local role anon;
insert into public.lesson_progress (student_id, lesson_ref, status, score) values (:SA, 'acc-ru-13', 'completed', 8);
insert into public.lesson_progress (student_id, lesson_ref, status) values (:SA, 'acc-ru-14', 'current');
update public.lesson_progress set comment = 'Почему 90.02 закрывается в конце месяца?' where lesson_ref = 'acc-ru-14';
update public.lesson_progress set attachments = '{"draft":"true"}', comment = 'черновик' where lesson_ref = 'acc-ru-14';
insert into public.lesson_progress (student_id, lesson_ref, status) values (:SB, 'chem-1', 'submitted');
commit;
select pg_temp.expect((select count(*) from public.student_activity) = 3, 'trigger: 3 events, draft and current skipped');
select pg_temp.expect((select string_agg(kind, ',' order by id) from public.student_activity) = 'lesson_done,comment,submitted', 'trigger: kinds in order');

-- 2. RLS ленты: учитель видит только своих учеников.
begin;
select pg_temp.claims(:A); set local role authenticated;
select pg_temp.expect((select count(*) from public.student_activity) = 2, 'A sees 2 own events');
select pg_temp.expect(not exists (select 1 from public.student_activity where student_id = :SB), 'A does not see B student events');
commit;
begin;
select pg_temp.claims(:B, 'c-b'); set local role authenticated;
select pg_temp.expect((select count(*) from public.student_activity) = 1, 'B (via assistant) sees only own 1 event');
commit;

-- 3. ИИ-клиент не может выдать себе права.
do $$ begin
  perform pg_temp.claims('aaaaaaaa-0000-4000-8000-000000000001', 'c1');
  set local role authenticated;
  begin
    perform public.mcp_set_scopes('c1', array['events:read','attachments:read']);
    raise exception 'FAIL: assistant token changed scopes';
  exception when insufficient_privilege then raise notice 'ok: assistant cannot set scopes';
  end;
end $$;

-- 4. Учитель в Искре выдаёт права; неизвестные отбрасываются.
begin;
select pg_temp.claims(:A); set local role authenticated;
select pg_temp.expect(public.mcp_set_scopes('c1', array['events:read','bogus','events:read']) = array['events:read'], 'set_scopes keeps only known, dedups');
commit;

-- 5. Пропуск: есть право — пускает и открывает строку журнала; нет — отказ, тоже в журнал.
begin;
select pg_temp.claims(:A, 'c1'); set local role authenticated;
select pg_temp.expect(public.mcp_client_state() ->> 'state' = 'active', 'client state active');
select pg_temp.expect((public.mcp_gate('list_events', 'events:read', '{"course":"acc-ru"}') ->> 'allowed')::boolean, 'gate allows events:read');
select pg_temp.expect(public.mcp_gate('get_attachment', 'attachments:read') ->> 'reason' = 'insufficient_scope', 'gate denies attachments without scope');
select pg_temp.expect((select count(*) from public.mcp_call_log) = 2, 'both calls logged');
select pg_temp.expect((select status from public.mcp_call_log where tool = 'get_attachment') = 'denied', 'denial logged as denied');
select public.mcp_finish((select id from public.mcp_call_log where tool = 'list_events'), 'ok', 3, 12);
select pg_temp.expect((select status || ':' || result_count from public.mcp_call_log where tool = 'list_events') = 'ok:3', 'finish completes log row');
commit;

-- 6. Чужой не может дописать журнал A; учитель B не видит журнал A.
begin;
select pg_temp.claims(:B, 'c1'); set local role authenticated;
select public.mcp_finish(1, 'error', 99, 1);
select pg_temp.expect((select count(*) from public.mcp_call_log) = 0, 'B does not see A log');
commit;
select pg_temp.expect((select result_count from public.mcp_call_log where id = 1) = 3, 'B could not alter A log');

-- 7. Прямая запись в таблицы прав и журнала запрещена.
do $$ begin
  perform pg_temp.claims('aaaaaaaa-0000-4000-8000-000000000001', 'c1');
  set local role authenticated;
  begin
    insert into public.mcp_call_log (user_id, client_id, tool, status) values (auth.uid(), 'c1', 'x', 'ok');
    raise exception 'FAIL: direct log insert allowed';
  exception when insufficient_privilege then raise notice 'ok: direct log insert denied';
  end;
  begin
    update public.mcp_grant_scopes set scopes = array['attachments:read'];
    raise exception 'FAIL: direct scopes update allowed';
  exception when insufficient_privilege then raise notice 'ok: direct scopes update denied';
  end;
  begin
    delete from public.mcp_call_log;
    raise exception 'FAIL: direct log delete allowed';
  exception when insufficient_privilege then raise notice 'ok: direct log delete denied';
  end;
end $$;

-- 8. Подключение без строки прав (согласие в обход экрана Искры) — доступа нет (этап 2).
begin;
select pg_temp.claims(:A, 'c-legacy'); set local role authenticated;
select pg_temp.expect(public.mcp_client_state() ->> 'state' = 'needs_consent', 'no scopes row → needs_consent');
select pg_temp.expect(public.mcp_gate('list_my_students', 'students:read') ->> 'reason' = 'revoked', 'no scopes row → gate refuses');
commit;

-- 9. Отзыв: тот же токен клиента сразу получает revoked, и это в журнале.
begin;
select pg_temp.claims(:A); set local role authenticated;
select public.mcp_revoke('c1');
commit;
begin;
select pg_temp.claims(:A, 'c1'); set local role authenticated;
select pg_temp.expect(public.mcp_client_state() ->> 'state' = 'revoked', 'revoked state');
select pg_temp.expect(public.mcp_gate('list_events', 'events:read') ->> 'reason' = 'revoked', 'gate refuses revoked client');
select pg_temp.expect((select status from public.mcp_call_log order by id desc limit 1) = 'revoked', 'revoked call logged');
commit;
-- Новое согласие снимает отзыв.
begin;
select pg_temp.claims(:A); set local role authenticated;
select public.mcp_set_scopes('c1', array['events:read']);
commit;
begin;
select pg_temp.claims(:A, 'c1'); set local role authenticated;
select pg_temp.expect(public.mcp_client_state() ->> 'state' = 'active', 'reconsent reactivates');
commit;

-- 10. Лимит: 60 вызовов за минуту — дальше rate_limited.
insert into public.mcp_call_log (user_id, client_id, tool, status)
select :A, 'c1', 'list_events', 'ok' from generate_series(1, 60);
begin;
select pg_temp.claims(:A, 'c1'); set local role authenticated;
select pg_temp.expect(public.mcp_gate('list_events', 'events:read') ->> 'reason' = 'minute', 'minute rate limit');
commit;

-- 11. Не учитель не выдаёт права; аноним не зовёт функции.
do $$ begin
  perform pg_temp.claims('cccccccc-0000-4000-8000-000000000003', null, 'student');
  set local role authenticated;
  begin
    perform public.mcp_set_scopes('c9', array['events:read']);
    raise exception 'FAIL: non-staff set scopes';
  exception when insufficient_privilege then raise notice 'ok: non-staff cannot set scopes';
  end;
end $$;
do $$ begin
  set local role anon;
  begin
    perform public.mcp_gate('list_events', 'events:read');
    raise exception 'FAIL: anon called gate';
  exception when insufficient_privilege then raise notice 'ok: anon cannot call gate';
  end;
end $$;

-- 12. Сбой ленты не мешает ученику сохранить работу.
alter table public.student_activity add constraint t_fail check (false) not valid;
begin;
set local role anon;
insert into public.lesson_progress (student_id, lesson_ref, status) values (:SA, 'acc-ru-15', 'completed');
commit;
alter table public.student_activity drop constraint t_fail;
select pg_temp.expect(exists (select 1 from public.lesson_progress where lesson_ref = 'acc-ru-15'), 'student save survives activity failure');

-- 13. Этап 2: mfa_ok() для токена помощника истинна только с секретом функции.
insert into private.mcp_gate_key (key_hash) values (encode(sha256(convert_to('test-key', 'UTF8')), 'hex'));
begin;
select pg_temp.claims(:A, 'c1'); set local role authenticated;
select pg_temp.expect(not public.mfa_ok(), 'assistant without key: mfa_ok false');
select set_config('request.headers', '{"x-iskra-mcp-key":"wrong"}', true);
select pg_temp.expect(not public.mfa_ok(), 'assistant with wrong key: mfa_ok false');
select set_config('request.headers', '{"x-iskra-mcp-key":"test-key"}', true);
select pg_temp.expect(public.mfa_ok(), 'assistant with function key: mfa_ok true');
commit;
begin;
select pg_temp.claims(:A); set local role authenticated;
select set_config('request.headers', '{}', true);
select pg_temp.expect(public.mfa_ok(), 'plain session without factors: mfa_ok true (unchanged)');
commit;
insert into auth.mfa_factors (user_id, status) values (:A, 'verified');
begin;
select pg_temp.claims(:A); set local role authenticated;
select pg_temp.expect(not public.mfa_ok(), 'plain aal1 session with MFA factor: mfa_ok false (unchanged)');
commit;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated","client_id":"c1"}', true);
  set local role authenticated;
  begin
    perform public.mfa_pre_request();
    raise exception 'FAIL: pre-request let assistant through without key';
  exception when sqlstate 'PT403' then raise notice 'ok: pre-request refuses assistant without key';
  end;
end $$;
