// «Напоминания ученикам» на сервере: миграция 20261108100000_tg_reminders.sql
// в настоящем PostgreSQL (docker, postgres:16-alpine).
// Проверяет привязку по одноразовому коду, планирование трёх типов, дубли,
// тихие часы, гашение (сдано, отменено, перенесено, функция выключена),
// заблокированного бота, виджет и закрытость серверных функций.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const name = `iskra-reminders-${randomUUID().slice(0, 8)}`
const run = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const T1 = id(1), T2 = id(2), G = id(20), G2 = id(21)
const ANNA = id(11), BORIS = id(12), SOLO = id(13), STRANGER = id(14), ANNA_BIO = id(15)
const PERSON_ANNA = id(30)
const HW = id(40), HW_LATE = id(41), HW_DONE = id(42)
// 8 ноября 2026, 12:00 по Москве (09:00 UTC).
const NOW = `'2026-11-08 09:00+00'::timestamptz`
const fail = msg => { throw new Error(msg) }

try {
  run(['run', '-d', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine'])
  let ready = false
  for (let n = 0; n < 80; n++) {
    try { run(['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); ready = true; break }
    catch { await new Promise(r => setTimeout(r, 150)) }
  }
  if (!ready) throw new Error('Postgres did not start')
  const sql = text => run(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qtAX'], text).trim()

  sql(`create role authenticated; create role anon; create schema auth; create schema cron; create schema iskra_private;
  create schema vault; create schema net;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
  create table cron.job(jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as 'insert into cron.job values(n,s,c) returning 1';
  create function cron.unschedule(n text) returns boolean language sql as 'delete from cron.job where jobname=n returning true';
  create table vault.decrypted_secrets(name text, decrypted_secret text);
  create table net.calls(url text, headers jsonb);
  create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint
    language sql as 'insert into net.calls values(url, headers) returning 1';
  create function public.is_admin_user(u uuid) returns boolean language sql as 'select false';
  create table feature_on(teacher uuid primary key, enabled boolean);
  create function iskra_private.teacher_feature_on(u uuid, f text) returns boolean language sql
    as 'select f = ''reminders'' and coalesce((select enabled from feature_on where teacher = u), false)';
  create table groups(id uuid primary key, name text, created_by uuid);
  create table students(id uuid primary key, name text, group_id uuid, created_by uuid, person_id uuid,
    auth_user_id uuid, invite_token uuid, created_at timestamptz default now());
  create table schedule_lessons(id uuid primary key default gen_random_uuid(), group_id uuid, student_id uuid, date date, time_start text,
    lesson_title text, status text default 'upcoming', lesson_id uuid, subject text, node_type text default 'lesson');
  create table lessons(id uuid primary key, short_id text);
  create table homework(id uuid primary key, group_id uuid, title text, due_date date, status text, created_by uuid, lesson_id uuid);
  create table lesson_progress(id uuid primary key default gen_random_uuid(), student_id uuid, lesson_ref text, status text);
  grant usage on schema public, auth to authenticated, anon;
  insert into auth.users values ('${T1}'), ('${T2}');
  insert into feature_on values ('${T1}', true), ('${T2}', false);
  insert into groups values ('${G}','Группа А','${T1}'), ('${G2}','Чужая','${T2}');
  insert into students(id, name, group_id, created_by, person_id) values
    ('${ANNA}','Анна Смирнова','${G}','${T1}','${PERSON_ANNA}'), ('${BORIS}','Борис','${G}','${T1}',null),
    ('${SOLO}','Соло',null,'${T1}',null), ('${STRANGER}','Чужой','${G2}','${T2}',null),
    ('${ANNA_BIO}','Анна Смирнова',null,'${T1}','${PERSON_ANNA}');`)
  sql(readFileSync('supabase/migrations/20261108100000_tg_reminders.sql', 'utf8').replace(/create extension if not exists pg_net;/, ''))

  const asUser = (uid, q) => sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true); ${q}; commit;`).split('\n').pop()
  const denied = q => { try { sql(`begin; ${q}; commit;`) } catch { return true } return false }

  // ── Привязка ──
  const code = asUser(T1, `select code from tg_link_create('${ANNA}')`)
  if (!/^[0-9a-f]{32}$/.test(code)) fail('код ссылки: ' + code)
  if (!denied(`set local role authenticated; select set_config('request.jwt.claim.sub','${T2}',true); select tg_link_create('${ANNA}')`)) fail('чужой учитель создал ссылку')
  if (!denied(`set local role authenticated; select set_config('request.jwt.claim.sub','${T2}',true); select tg_link_create('${STRANGER}')`)) fail('без функции ссылка создалась')
  if (!denied(`set local role authenticated; select tg_link_claim('${code}', 1, 'x', 'x')`)) fail('tg_link_claim открыт клиенту')
  if (sql(`select tg_link_claim('${code}', 5001, 'anna_s', 'Анна')`) !== 'Анна') fail('привязка не вернула имя')
  if (sql(`select tg_link_claim('${code}', 6666, 'thief', 'X')`) !== '') fail('код сработал второй раз')
  if (sql(`select count(*) from student_tg_links where chat_id = 5001`) !== '2') fail('вторая карточка того же человека не привязалась')
  const status = asUser(T1, `select linked || '|' || username from tg_link_status('${ANNA}')`)
  if (status !== 'true|anna_s') fail('статус карточки: ' + status)
  if (asUser(T2, `select count(*) from tg_link_status('${ANNA}')`) !== '0') fail('чужой учитель видит статус')
  const expired = asUser(T1, `select code from tg_link_create('${BORIS}')`)
  sql(`update tg_link_codes set expires_at = now() - interval '1 minute' where code = '${expired}'`)
  if (sql(`select tg_link_claim('${expired}', 5002, 'b', 'Б')`) !== '') fail('истёкший код сработал')
  const borisCode = asUser(T1, `select code from tg_link_create('${BORIS}')`)
  sql(`select tg_link_claim('${borisCode}', 5002, 'boris', 'Борис')`)
  const soloCode = asUser(T1, `select code from tg_link_create('${SOLO}')`)
  sql(`select tg_link_claim('${soloCode}', 5003, 'solo', 'Соло')`)

  // ── Планирование ──
  sql(`insert into schedule_lessons(id, group_id, student_id, date, time_start, lesson_title, subject, status) values
    ('${id(101)}','${G}',null,'2026-11-08','16:00','ОВР','Химия','upcoming'),
    ('${id(102)}','${G}',null,'2026-11-08','16:00','ОВР','Химия','upcoming'),
    ('${id(103)}',null,'${SOLO}','2026-11-09','7:30','Рано','Химия','upcoming'),
    ('${id(104)}','${G}',null,'2026-11-08','12:30','Сейчас','Химия','upcoming'),
    ('${id(105)}','${G}',null,'2026-11-08','18:00','Отменён','Химия','cancelled'),
    ('${id(106)}','${G2}',null,'2026-11-08','16:00','Чужой','Химия','upcoming');
  insert into lessons values ('${id(50)}', 'l-50');
  insert into homework values
    ('${HW}','${G}','Тест по ОВР','2026-11-09','active','${T1}',null),
    ('${HW_LATE}','${G}','Старое','2026-11-07','active','${T1}',null),
    ('${HW_DONE}','${G}','Сданное','2026-11-09','active','${T1}','${id(50)}');
  insert into lesson_progress(student_id, lesson_ref, status) values
    ('${BORIS}','hw-${HW}','submitted'), ('${ANNA}','l-50','completed'), ('${BORIS}','${id(50)}','submitted');`)
  const added = sql(`select reminders_plan(${NOW})`)
  const rows = () => sql(`select string_agg(dedupe_key || '@' || to_char(send_at at time zone 'Europe/Moscow', 'DD HH24:MI') || '#' || status, ',' order by dedupe_key) from reminder_outbox`).split(',').filter(Boolean)
  const want = [
    `hw_due:${ANNA}:${HW}@08 18:00#queued`,
    `hw_late:${ANNA}:${HW_LATE}:2@09 10:00#queued`,
    `hw_late:${BORIS}:${HW_LATE}:2@09 10:00#queued`,
    `lesson_soon:${ANNA}:2026-11-08:16:00@08 15:00#queued`,
    `lesson_soon:${BORIS}:2026-11-08:16:00@08 15:00#queued`,
    `lesson_soon:${SOLO}:2026-11-09:07:30@09 07:00#queued`,
  ]
  const got = rows()
  if (got.join(',') !== want.join(',')) fail(`план\n  ожидалось: ${want.join('\n    ')}\n  получено:  ${got.join('\n    ')}`)
  if (added !== String(want.length)) fail('reminders_plan вернул ' + added)
  if (sql(`select reminders_plan(${NOW})`) !== '0') fail('повторный прогон добавил дубли')
  const text = sql(`select title || '|' || body from reminder_outbox where dedupe_key like 'lesson_soon:${ANNA}%'`)
  if (text !== 'Через час урок|Химия · 16:00\nТема: ОВР') fail('текст урока: ' + text)

  // Виджет.
  const w = JSON.parse(asUser(T1, `select reminders_today(${NOW})::text`).replace(/^.*?\{/s, '{'))
  if (w.queued !== 3 || w.linked !== 3 || w.total !== 3 || w.unlinked.length !== 0) fail('виджет: ' + JSON.stringify(w))
  if (w.upcoming[0].count !== 2 || w.upcoming[0].kind !== 'lesson_soon') fail('виджет: группировка ' + JSON.stringify(w.upcoming))
  if (asUser(T2, `select coalesce(reminders_today()::text, 'null')`) !== 'null') fail('виджет без функции')
  if (asUser(T2, `select count(*) from reminder_outbox`) !== '0') fail('чужой журнал виден')

  // Отправка: созрело в 15:00 МСК; ДЗ Анна сдала, урок Бориса перенесли.
  sql(`insert into lesson_progress(student_id, lesson_ref, status) values ('${ANNA}','hw-${HW}','submitted');
    update schedule_lessons set time_start = '17:00' where id in ('${id(101)}', '${id(102)}');`)
  const claimSql = `select string_agg(chat_id::text, ',' order by chat_id) from reminders_claim(50)`
  if (!denied(`set local role authenticated; ${claimSql}`)) fail('reminders_claim открыт клиенту')
  // Двигаем «сейчас» через send_at: строки, созревшие к 15:00 МСК.
  sql(`update reminder_outbox set send_at = now() - interval '1 minute' where kind in ('lesson_soon','hw_due');
       update schedule_lessons set date = ((now() + interval '1 hour') at time zone 'Europe/Moscow')::date, time_start = to_char((now() + interval '1 hour') at time zone 'Europe/Moscow', 'HH24:MI') where id = '${id(103)}';
       update reminder_outbox set starts_at = ((select date from schedule_lessons where id = '${id(103)}') + (select time_start from schedule_lessons where id = '${id(103)}')::time) at time zone 'Europe/Moscow' where dedupe_key like 'lesson_soon:${SOLO}%';
       update reminder_outbox set send_at = now() - interval '1 minute' where dedupe_key like 'lesson_soon:${SOLO}%';`)
  const claimed = sql(claimSql)
  if (claimed !== '5003') fail('забрано: ' + claimed + ' (ждали только Соло)')
  const reasons = sql(`select string_agg(split_part(dedupe_key, ':', 1) || '/' || coalesce(error,''), ',' order by dedupe_key) from reminder_outbox where status = 'cancelled'`)
  if (reasons !== 'hw_due/homework_done,lesson_soon/lesson_moved,lesson_soon/lesson_moved') fail('гашение: ' + reasons)

  // Бот заблокирован: строка failed, ссылка помечена, остальное по ученику гаснет.
  const soloId = sql(`select id from reminder_outbox where status = 'sending'`)
  sql(`insert into reminder_outbox(teacher_id, student_id, kind, dedupe_key, send_at, homework_id, title, body)
       values ('${T1}','${SOLO}','hw_due','x-solo', now() + interval '1 day', '${HW}', 't', 'b')`)
  sql(`select reminders_mark('${soloId}', false, 'blocked', true, false)`)
  if (sql(`select status || '|' || error from reminder_outbox where id = '${soloId}'`) !== 'failed|blocked') fail('заблокированный бот: статус')
  if (sql(`select blocked_at is not null from student_tg_links where student_id = '${SOLO}'`) !== 't') fail('ссылка не помечена')
  if (sql(`select status from reminder_outbox where dedupe_key = 'x-solo'`) !== 'cancelled') fail('очередь заблокированного не погашена')
  const w2 = JSON.parse(asUser(T1, `select reminders_today()::text`).replace(/^.*?\{/s, '{'))
  if (w2.failed.length !== 1 || w2.failed[0].name !== 'Соло' || w2.linked !== 2 || w2.unlinked[0].name !== 'Соло') fail('виджет после блокировки: ' + JSON.stringify(w2))

  // Временная ошибка — обратно в очередь; успех — sent.
  sql(`update reminder_outbox set status = 'sending', attempts = 1 where dedupe_key like 'hw_late:${ANNA}%'`)
  const lateId = sql(`select id from reminder_outbox where dedupe_key like 'hw_late:${ANNA}%'`)
  sql(`select reminders_mark('${lateId}', false, '429', false, true)`)
  if (sql(`select status from reminder_outbox where id = '${lateId}'`) !== 'queued') fail('429 не вернул в очередь')
  sql(`select reminders_mark('${lateId}', true)`)
  if (sql(`select status || '|' || (sent_at is not null) from reminder_outbox where id = '${lateId}'`) !== 'sent|true') fail('успех не записан')

  // Функцию выключили — стоящее гаснет при планировании.
  sql(`update feature_on set enabled = false where teacher = '${T1}'; select reminders_plan(now());`)
  if (sql(`select count(*) from reminder_outbox where status = 'queued'`) !== '0') fail('без функции очередь не погасла')
  if (!denied(`set local role authenticated; select set_config('request.jwt.claim.sub','${T1}',true); select tg_link_create('${BORIS}')`)) fail('ссылка без функции')

  // Отвязка /stop.
  if (sql(`select tg_unlink_chat(5001)`) !== '2') fail('/stop отвязал не обе карточки')

  // Диспетчер: без секрета не зовёт функцию, с секретом — зовёт.
  sql(`update feature_on set enabled = true where teacher = '${T1}'; insert into reminder_outbox(teacher_id, student_id, kind, dedupe_key, send_at, homework_id, title, body)
       values ('${T1}','${BORIS}','hw_due','x-due', now() - interval '1 minute', '${HW}', 't', 'b'); select reminders_dispatch();`)
  if (sql(`select count(*) from net.calls`) !== '0') fail('позвал без секрета')
  sql(`insert into vault.decrypted_secrets values ('reminders_cron_secret','s3'); select reminders_dispatch();`)
  if (sql(`select headers->>'x-reminders-secret' from net.calls`) !== 's3') fail('диспетчер не позвал функцию')
  for (const q of ['select reminders_plan()', 'select reminders_dispatch()', `select reminders_mark('${lateId}', true)`, 'select tg_unlink_chat(1)'])
    if (!denied(`set local role authenticated; ${q}`)) fail('должно быть закрыто: ' + q)
  if (sql(`select string_agg(jobname || '=' || schedule, ',' order by jobname) from cron.job`) !== 'reminders-dispatch=* * * * *,reminders-plan=*/5 * * * *') fail('кроны')

  // Настройки: умолчания, сохранение, проверка значений.
  if (asUser(T1, `select lesson_offset_min || '|' || hw_due_hour || '|' || hw_late_max from my_reminder_settings()`) !== '60|18|3') fail('умолчания')
  asUser(T1, `select set_my_reminder_settings(true, 30, false, 17, true, 5)`)
  if (asUser(T1, `select lesson_offset_min || '|' || hw_due || '|' || hw_late_max from my_reminder_settings()`) !== '30|false|5') fail('сохранение настроек')
  if (!denied(`set local role authenticated; select set_config('request.jwt.claim.sub','${T1}',true); select set_my_reminder_settings(true, 45, true, 18, true, 3)`)) fail('45 минут принято')
  if (!denied(`set local role authenticated; select set_config('request.jwt.claim.sub','${T2}',true); select set_my_reminder_settings(true, 30, true, 18, true, 3)`)) fail('настройки без функции')

  console.log('PASS: reminders SQL — one-time link codes (owner/feature/expiry/reuse, same person linked), lesson/hw-due/hw-late planning with duplicates folded, 07:00 quiet hours, submitted/moved/cancelled/foreign skipped, repeat plan adds nothing, claim revalidates, blocked bot marks link and cancels queue, 429 retries, feature-off cancels, /stop unlinks, dispatcher needs Vault secret, server functions closed to clients, widget scoped, settings validated')
} catch (e) {
  console.error(e.stderr?.toString() || e)
  process.exitCode = 1
} finally {
  try { run(['rm', '-f', name]) } catch {}
}
