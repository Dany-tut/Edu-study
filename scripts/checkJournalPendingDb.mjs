// «Журнал не заполнен» на сервере: правило _journal_pending и крон
// notify_journal_pending в настоящем PostgreSQL (docker, postgres:16-alpine).
// Проверяет дубли, отмены, переносы, отметки, чужих учеников и гашение.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const name = `iskra-journal-pending-${randomUUID().slice(0, 8)}`
const run = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const T1 = id(1), T2 = id(2), G = id(20), G2 = id(21), EMPTY = id(22)
const ANNA = id(11), BORIS = id(12), SOLO = id(13), STRANGER = id(14)
// 18:00 по Москве; занятия в 10:00 и 12:00 МСК уже «прошли + 2 ч», в 17:00 — нет.
const NOW = `'2026-11-02 15:00+00'::timestamptz`

try {
  run(['run', '-d', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine'])
  let ready = false
  for (let n = 0; n < 80; n++) {
    try { run(['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); ready = true; break }
    catch { await new Promise(r => setTimeout(r, 150)) }
  }
  if (!ready) throw new Error('Postgres did not start')
  const sql = text => run(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qtAX'], text).trim()

  sql(`create role authenticated; create role anon; create schema auth; create schema cron;
  create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
  create table cron.job(jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as 'insert into cron.job values(n,s,c) returning 1';
  create function cron.unschedule(n text) returns boolean language sql as 'delete from cron.job where jobname=n returning true';
  create table groups(id uuid primary key, name text, created_by uuid);
  create table students(id uuid primary key, name text, group_id uuid, created_by uuid);
  create table schedule_lessons(id uuid primary key default gen_random_uuid(), group_id uuid, student_id uuid, date date, time_start text,
    lesson_title text, status text default 'upcoming', lesson_id uuid, subject text, node_type text default 'lesson');
  create table lesson_attendance(id uuid primary key default gen_random_uuid(), student_id uuid, group_id uuid, lesson_date date, lesson_title text, present boolean);
  create table teacher_lesson_sessions(schedule_id uuid primary key references schedule_lessons(id) on delete cascade, owner_id uuid, attendance jsonb not null default '{}');
  create table notifications(id uuid primary key default gen_random_uuid(), recipient_id uuid not null, recipient_role text not null,
    type text not null, title text not null, body text not null default '', link jsonb, read boolean not null default false, created_at timestamptz default now());
  grant usage on schema public, auth to authenticated, anon;
  insert into groups values ('${G}','Группа А','${T1}'), ('${EMPTY}','Пустая','${T1}'), ('${G2}','Чужая','${T2}');
  insert into students values ('${ANNA}','Анна','${G}','${T1}'), ('${BORIS}','Борис','${G}','${T1}'),
    ('${SOLO}','Соло',null,'${T1}'), ('${STRANGER}','Чужой','${G2}','${T2}');`)
  sql(readFileSync('supabase/migrations/20261106120000_journal_pending_notify.sql', 'utf8'))

  const lesson = (n, extra = '') => sql(`insert into schedule_lessons(id, group_id, student_id, date, time_start, lesson_title, status)
    values ('${id(100 + n)}', ${extra}) returning id`)
  lesson(1, `'${G}', null, '2026-11-02', '10:00', 'Тема 1', 'upcoming'`)          // ждёт
  lesson(2, `'${G}', null, '2026-11-02', '12:00', 'Тема 2', 'cancelled'`)         // отменён
  lesson(3, `'${G}', null, '2026-11-02', '17:00', 'Тема 3', 'upcoming'`)          // ещё идёт (+2 ч)
  lesson(4, `null, '${SOLO}', '2026-11-01', '9:00', 'Соло', 'completed'`)         // индивидуальный, ждёт
  lesson(5, `'${G}', null, '2026-11-01', '10:00', 'Отмечен', 'completed'`)        // точные отметки
  lesson(6, `'${G}', null, '2026-11-01', '12:00', 'Частично', 'completed'`)       // одна отметка null
  lesson(7, `'${G}', null, '2026-10-31', '10:00', 'Старый журнал', 'completed'`)  // старые отметки
  lesson(8, `'${G}', null, '2026-10-30', '10:00', 'Дважды', 'completed'`)         // неоднозначно ×2
  lesson(9, `'${G}', null, '2026-10-30', '12:00', 'Дважды', 'completed'`)
  lesson(10, `'${G}', null, '2026-10-29', '10:00', 'Дубль', 'completed'`)         // две одинаковые строки
  lesson(11, `'${G}', null, '2026-10-29', '10:00', 'Дубль', 'completed'`)
  lesson(12, `'${G2}', null, '2026-11-02', '10:00', 'Чужое', 'upcoming'`)         // другой учитель
  lesson(13, `'${EMPTY}', null, '2026-11-02', '11:00', 'Без учеников', 'upcoming'`)
  lesson(14, `'${G}', null, '2026-09-01', '10:00', 'Давно', 'completed'`)        // старше 30 дней
  sql(`insert into teacher_lesson_sessions values
    ('${id(105)}','${T1}','{"${ANNA}":true,"${BORIS}":false}'),
    ('${id(106)}','${T1}','{"${ANNA}":true,"${BORIS}":null}');
  insert into lesson_attendance(student_id, lesson_date, lesson_title, present) values
    ('${ANNA}','2026-10-31','Старый журнал',true), ('${BORIS}','2026-10-31','Старый журнал',false),
    ('${ANNA}','2026-10-30','Дважды',true), ('${BORIS}','2026-10-30','Дважды',true);`)

  const pending = (owner = T1) => sql(`select string_agg(schedule_id::text, ',' order by schedule_id) from _journal_pending('${owner}', ${NOW})`).split(',').filter(Boolean)
  const expect = (actual, want, label) => {
    const a = [...actual].sort().join(','), w = [...want].sort().join(',')
    if (a !== w) throw new Error(`${label}\n  ожидалось: ${w}\n  получено:  ${a}`)
  }
  expect(pending(), [id(101), id(104), id(106), id(108), id(109), id(110), id(113)],
    'правило: ждут прошедшие неотмеченные; отмена, «идёт», отмеченные, старые однозначные, чужие и старше 30 дней — нет; дубль один')
  expect(pending(T2), [id(112)], 'у другого учителя — только его занятие')
  const scope = sql(`select scope_name || '|' || coalesce(group_id::text,'') from _journal_pending('${T1}', ${NOW}) where schedule_id = '${id(104)}'`)
  if (scope !== `Соло|`) throw new Error('индивидуальное занятие подписано именем ученика: ' + scope)

  // Крон: одно уведомление на урок, повторный прогон — без дублей.
  const added = sql(`select notify_journal_pending(${NOW})`)
  if (added !== '8') throw new Error('первый прогон должен добавить 7 + 1 (чужой учитель), добавил ' + added)
  if (sql(`select notify_journal_pending(${NOW})`) !== '0') throw new Error('повторный прогон добавил дубли')
  if (sql(`select count(*) from notifications`) !== '8') throw new Error('дубли в таблице')
  const row = sql(`select title || '|' || body || '|' || (link->>'page') || '|' || recipient_role from notifications where link->>'scheduleId' = '${id(101)}'`)
  if (row !== 'Журнал не заполнен — Группа А|02.11 · 10:00 · Тема 1|teacher/gradebook|teacher') throw new Error('текст уведомления: ' + row)
  if (sql(`select recipient_id from notifications where link->>'scheduleId' = '${id(112)}'`) !== T2) throw new Error('чужое занятие ушло не тому учителю')

  // Отметили, отменили, удалили, перенесли в будущее — уведомление гаснет.
  sql(`insert into teacher_lesson_sessions values ('${id(101)}','${T1}','{"${ANNA}":true,"${BORIS}":true}');
    update schedule_lessons set status = 'cancelled' where id = '${id(104)}';
    delete from schedule_lessons where id = '${id(113)}';
    update schedule_lessons set date = '2026-11-03' where id = '${id(106)}';`)
  sql(`select notify_journal_pending(${NOW})`)
  const unread = sql(`select string_agg(link->>'scheduleId', ',' order by link->>'scheduleId') from notifications where recipient_id = '${T1}' and not read`).split(',')
  expect(unread, [id(108), id(109), id(110)], 'отмеченное, отменённое, удалённое и перенесённое погашены')
  if (sql(`select count(*) from notifications`) !== '8') throw new Error('гашение не должно добавлять строк')

  // Перенос из будущего в прошлое: занятие начинает ждать и получает уведомление.
  sql(`update schedule_lessons set date = '2026-11-01', time_start = '08:00' where id = '${id(103)}'`)
  if (sql(`select notify_journal_pending(${NOW})`) !== '1') throw new Error('перенесённое в прошлое занятие не получило уведомление')

  // Граница +2 часа по Москве: 10:00 МСК ждёт ровно с 12:00 МСК (09:00 UTC).
  sql(`delete from teacher_lesson_sessions where schedule_id = '${id(101)}'`)
  const at = t => sql(`select count(*) from _journal_pending('${T1}', '${t}'::timestamptz) where schedule_id = '${id(101)}'`)
  if (at('2026-11-02 08:59+00') !== '0' || at('2026-11-02 09:00+00') !== '1') throw new Error('граница двух часов по московскому времени')

  // RPC для клиента: только свой учитель, аноним без доступа, крон закрыт.
  const asUser = (uid, q) => sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true); ${q}; commit;`)
  if (asUser(T2, 'select count(*) from journal_pending()').split('\n').pop() !== '1') throw new Error('journal_pending() отдаёт чужие занятия')
  for (const q of [`set local role anon; select * from journal_pending()`, `set local role authenticated; select notify_journal_pending()`,
    `set local role authenticated; select * from _journal_pending('${T1}')`]) {
    let denied = false
    try { sql(`begin; ${q}; commit;`) } catch { denied = true }
    if (!denied) throw new Error('должно быть закрыто: ' + q)
  }
  if (sql(`select schedule from cron.job where jobname = 'journal-pending-notify'`) !== '*/10 * * * *') throw new Error('крон не заведён')

  console.log('PASS: journal pending SQL — cancelled/live/marked/legacy/ambiguous/duplicate/foreign/30-day rules, one notification per lesson, repeat runs add nothing, marked/cancelled/deleted/moved lessons resolve, moved-into-past notifies, Moscow +2h boundary, RPC scoped to the caller, cron registered')
} catch (e) {
  console.error(e.stderr?.toString() || e)
  process.exitCode = 1
} finally {
  try { run(['rm', '-f', name]) } catch {}
}
