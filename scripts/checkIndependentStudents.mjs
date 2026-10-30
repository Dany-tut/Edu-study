// Optional test runtime: @electric-sql/pglite@0.5.13, installed outside the app.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema storage; create schema private;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function public.is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')::boolean$$;
create table groups(id uuid primary key default gen_random_uuid(),created_by uuid references auth.users);
create table students(id uuid primary key default gen_random_uuid(),name text not null,auth_user_id uuid,group_id uuid not null references groups,person_id uuid default gen_random_uuid(),invite_token uuid default gen_random_uuid());
alter table students enable row level security;
create table plans(code text primary key,name text,price_rub integer,max_students integer);
create table teacher_subscriptions(teacher_id uuid,plan_code text,expires_at timestamptz,status text);
create table lesson_progress(student_id uuid); alter table lesson_progress enable row level security;
create table schedule_lessons(student_id uuid); alter table schedule_lessons enable row level security;
create function enforce_student_limit() returns trigger language plpgsql as $$begin return new; end$$;
create trigger students_enforce_limit before insert on students for each row execute function enforce_student_limit();
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant select on auth.users to authenticated;
insert into auth.users values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into groups values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
insert into students(name,group_id) values('Existing','20000000-0000-0000-0000-000000000001');
`)
await db.exec(readFileSync(new URL('../supabase/migrations/20261030225349_independent_students.sql', import.meta.url),'utf8'))
await db.exec(`set role authenticated; set test.uid='10000000-0000-0000-0000-000000000001';`)
const original=(await db.query(`insert into students(name) values('New') returning *`)).rows[0]
assert.equal(original.group_id,null)
assert.equal(original.created_by,'10000000-0000-0000-0000-000000000001')
assert.equal((await db.query('select * from students')).rows.length,2)
await db.exec(`insert into lesson_progress values('${original.id}');`)
assert.equal((await db.query('select * from lesson_progress')).rows.length,1)
await db.exec(`set test.uid='10000000-0000-0000-0000-000000000002';`)
assert.equal((await db.query('select * from students')).rows.length,0)
assert.equal((await db.query('select * from lesson_progress')).rows.length,0)
assert.equal((await db.query(`update students set name='Stolen' where id='${original.id}' returning id`)).rows.length,0)
await assert.rejects(db.exec(`insert into students(name,created_by) values('Forged','10000000-0000-0000-0000-000000000001')`))
await db.exec(`set test.uid='10000000-0000-0000-0000-000000000001';`)
await assert.rejects(db.exec(`update students set group_id='20000000-0000-0000-0000-000000000002' where id='${original.id}'`))
const attached=(await db.query(`update students set group_id='20000000-0000-0000-0000-000000000001' where id='${original.id}' returning *`)).rows[0]
assert.equal(attached.id,original.id);assert.equal(attached.invite_token,original.invite_token);assert.equal(attached.person_id,original.person_id)
// Existing admin move RPC updates group_id only: owner must follow the target.
await db.exec(`set test.admin='true'; update students set group_id='20000000-0000-0000-0000-000000000002' where id='${original.id}';`)
assert.equal((await db.query(`select created_by from students where id='${original.id}'`)).rows[0].created_by,'10000000-0000-0000-0000-000000000002')
await db.exec(`update students set group_id='20000000-0000-0000-0000-000000000001' where id='${original.id}'; set test.admin='false'; reset role;`)
// Group transfers also update students without requiring changes to legacy RPCs.
await db.exec(`update groups set created_by='10000000-0000-0000-0000-000000000002' where id='20000000-0000-0000-0000-000000000001';`)
assert.equal((await db.query(`select count(*)::int n from students where created_by='10000000-0000-0000-0000-000000000001'`)).rows[0].n,0)
await db.exec(`update groups set created_by='10000000-0000-0000-0000-000000000001' where id='20000000-0000-0000-0000-000000000001'; set role authenticated;`)
await db.exec(`reset role; insert into plans values('test','Test',0,2); insert into teacher_subscriptions values('10000000-0000-0000-0000-000000000001','test',null,'active'); set role authenticated;`)
await assert.rejects(db.exec(`insert into students(name) values('Over limit')`), /STUDENT_LIMIT/)
await db.exec(`insert into students(name,group_id,person_id) values('Same person','20000000-0000-0000-0000-000000000001','${original.person_id}')`)
assert.equal((await db.query('select students_used from my_plan()')).rows[0].students_used,2)
await db.exec(`delete from groups where id='20000000-0000-0000-0000-000000000001';`)
assert.equal((await db.query(`select group_id from students where id='${original.id}'`)).rows[0].group_id,null)
console.log('PASS: migration, ownership backfill, name-only creation, RLS isolation/forgery denial, direct progress, foreign-group rejection, stable assignment ID/token/person, person-based quota, admin and group ownership transfers, group deletion preservation.')
await db.close()
