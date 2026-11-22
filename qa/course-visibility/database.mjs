import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const db = new PGlite()
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222', student='33333333-3333-4333-8333-333333333333'
const course='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const modA='aaaaaaaa-0000-4000-8000-000000000001',modB='aaaaaaaa-0000-4000-8000-000000000002'
await db.exec(`create role authenticated; create role anon; create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function public.is_admin() returns boolean language sql stable as $$select false$$;
create function public.mfa_ok() returns boolean language sql stable as $$select true$$;
create table courses(id uuid primary key,short_id text unique,created_by uuid);
create table course_modules(id uuid primary key,course_id uuid references courses(id),label text,position int);
create table lessons(id uuid primary key,course_id uuid references courses(id),module_id uuid references course_modules(id),short_id text,title text);
create table lesson_progress(student_id uuid,lesson_ref text,status text);
create function public.my_course_ids() returns uuid[] language sql stable as $$select array_agg(id) from public.courses$$;
grant usage on schema auth to authenticated,anon;
grant select,insert,update,delete on courses,course_modules,lessons,lesson_progress to authenticated;
alter table course_modules enable row level security; alter table lessons enable row level security;
create policy base_modules on course_modules for all to authenticated using(true) with check(true);
create policy base_lessons on lessons for all to authenticated using(true) with check(true);
insert into courses values('${course}','course-a','${owner}'),('${foreign}','course-b','${other}');
insert into course_modules values('${modA}','${course}','A',0),('${modB}','${course}','B',1);
insert into lessons values('${modA}','${course}','${modA}','a-1','Lesson A'),('${modB}','${course}','${modB}','b-1','Lesson B');
insert into lesson_progress values('${student}','a-1','completed');`)
await db.exec(readFileSync(new URL('../../supabase/migrations/20261122054626_course_item_visibility.sql',import.meta.url),'utf8'))
async function as(user){await db.exec(`reset role; set role authenticated; set request.uid='${user}';`)}
const rows=async sql=>(await db.query(sql)).rows
await as(owner)
assert.equal((await rows(`select set_course_item_visibility('course-a','module','${modA}',true) ok`))[0].ok,true)
assert.equal((await rows(`select set_course_item_visibility('course-a','lesson','b-1',true) ok`))[0].ok,true)
assert.equal((await rows('select * from lessons')).length,2,'owner retains hidden content')
await as(student)
assert.equal((await rows('select * from lessons')).length,0,'module and lesson hidden on direct query')
assert.deepEqual((await rows('select label from course_modules')).map(r=>r.label),['B'])
assert.equal((await rows(`select set_course_item_visibility('course-a','module','${modA}',false) ok`))[0].ok,false)
assert.equal((await rows(`update course_item_visibility set hidden=false returning item_key`)).length,0)
await as(other)
assert.equal((await rows(`select set_course_item_visibility('course-a','lesson','b-1',false) ok`))[0].ok,false)
await as(owner)
await rows(`select set_course_item_visibility('course-a','module','${modA}',false)`)
await as(student)
assert.deepEqual((await rows('select short_id from lessons')).map(r=>r.short_id),['a-1'],'show module retains lesson own hidden')
await as(owner)
await rows(`select set_course_item_visibility('course-a','lesson','future-1',true)`)
await db.exec(`insert into lessons values('aaaaaaaa-0000-4000-8000-000000000003','${course}','${modB}','future-1','Draft'); update lessons set title=title||' updated';`)
await as(student)
assert.deepEqual((await rows('select short_id from lessons')).map(r=>r.short_id),['a-1'],'content saves do not undo hidden / prehidden draft')
assert.equal((await rows('select status from lesson_progress'))[0].status,'completed')
await as(owner)
await rows(`select set_course_item_visibility('course-a','lesson','b-1',false)`)
await rows(`select set_course_item_visibility('course-a','module','${modA}',true)`)
await db.exec(`update course_modules set position=1-position;`)
await as(student)
assert.deepEqual((await rows('select short_id from lessons')).map(r=>r.short_id),['b-1'],'reordering does not move visibility')
await db.exec('reset role; set role anon;')
await assert.rejects(rows(`select set_course_item_visibility('course-a','lesson','b-1',true)`))
await assert.rejects(rows('select * from course_item_visibility'))
console.log('PASS actual SQL/RLS: owner, student, foreign owner, anon; module/lesson precedence; direct reads; future draft; content-save isolation; progress; reorder')
await db.close()
