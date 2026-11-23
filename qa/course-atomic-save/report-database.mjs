import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const folder = 'supabase/migrations/'
const sql = name => readFileSync(folder + name, 'utf8')
const actor = '10000000-0000-4000-8000-000000000001'
const ticket = '30000000-0000-4000-8000-000000000003'
await db.exec(`create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql as $$select '${actor}'::uuid$$;
create function public.is_staff() returns boolean language sql as $$select true$$;
create function public.mfa_ok() returns boolean language sql as $$select true$$;
create function public._notif_admins() returns setof uuid language sql as $$select '20000000-0000-4000-8000-000000000002'::uuid$$;`)
await db.exec(sql('0032_feedback_requests.sql').split('alter table public.feedback_requests enable')[0])
await db.exec(sql('0005_notifications.sql').split('alter table public.notifications enable')[0])
const analytics = sql('0011_analytics.sql')
await db.exec(analytics.slice(analytics.indexOf('create table if not exists public.analytics_events'),analytics.indexOf('alter table public.analytics_events enable')))
await db.exec(sql('20261103064530_incident_monitor.sql').split('create function iskra_monitor.tick()')[0])
await db.exec(sql(readdirSync(folder).find(name=>name.endsWith('_report_course_save_failure.sql'))))
const fields = {manual_retries:2, kind:'conflict', app_version:'1.0.3586·6371204', browser:'Edge', country:'TH', stage:'lessons', code:'PT409', description:'private lesson marker'}
const send = (payload=fields, id=ticket) => db.query('select public.report_course_save_failure($1::uuid,$2::jsonb) as id',[id,JSON.stringify(payload)])
await db.exec('set role anon')
await assert.rejects(send,{code:'42501'})
await db.exec('set role authenticated')
await assert.rejects(()=>send({...fields,manual_retries:1}),{code:'22023'})
assert.equal((await send()).rows[0].id,ticket)
assert.equal((await send()).rows[0].id,ticket)
await db.exec('reset role')
for (const table of ['feedback_requests','analytics_events','iskra_monitor.signals','notifications']) {
  const {rows} = await db.query('select * from '+table)
  assert.equal(rows.length,1,table)
  assert.ok(!JSON.stringify(rows).includes('private lesson marker'))
}
const event = (await db.query('select * from analytics_events')).rows[0]
assert.equal(event.meta.country_source,'timezone_estimate')
assert.equal(event.meta.app_version,fields.app_version)
assert.equal(event.user_id,actor)
assert.equal(event.meta.report_id,ticket)
await db.exec('alter table analytics_events disable trigger iskra_monitor_capture')
await assert.rejects(()=>send(fields,'30000000-0000-4000-8000-000000000004'),/did not acknowledge/)
assert.equal((await db.query('select count(*)::int as n from feedback_requests')).rows[0].n,1)
await db.close()
console.log('PASS authenticated incident receipt, retry dedup, private-field exclusion, admin bell, monitoring and atomic rollback')
