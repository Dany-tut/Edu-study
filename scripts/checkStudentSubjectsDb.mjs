import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`create role authenticated; create table students(id int primary key,subject text,name text,created_by text,invite_token text); insert into students values(1,'Химия','Legacy','teacher-a','original-invite');`)
const migration = readFileSync(new URL('../supabase/migrations/20261122094256_student_subjects.sql',import.meta.url),'utf8')
await db.exec(migration)
const get = async id => (await db.query('select * from students where id=$1',[id])).rows[0]
assert.deepEqual((await get(1)).subjects,['Химия'])
assert.equal((await get(1)).invite_token,'original-invite')
await db.exec(`insert into students(id,subject,name) values(2,'Биология','Old client');`)
assert.deepEqual((await get(2)).subjects,['Биология'])
await db.exec(`insert into students(id,name,subject,subjects,created_by) values(3,'Four','Химия',array['Химия','Биология','Русский','Литература'],'teacher-a');`)
assert.equal((await db.query('select count(*)::int n from students where id=3')).rows[0].n,1)
assert.deepEqual((await get(3)).subjects,['Химия','Биология','Русский','Литература'])
await db.exec(`update students set subject='Физика' where id=3;`)
assert.deepEqual((await get(3)).subjects,['Физика','Биология','Русский','Литература'])
await db.exec(`update students set subjects=array[' Русский ','русский','Литература',null,'','  '] where id=3;`)
assert.deepEqual((await get(3)).subjects,['Русский','Литература']);assert.equal((await get(3)).subject,'Русский')
await db.exec(`update students set name='Renamed' where id=3;`)
assert.deepEqual((await get(3)).subjects,['Русский','Литература'])
await db.exec(`update students set subjects='{}' where id=3;`)
assert.equal((await get(3)).subject,null)
await db.exec(`update students set subjects=array['Шахматы','Физика'] where id=3;`)
assert.equal((await get(3)).subject,'Шахматы')
// Existing access policies still govern reads and writes; the trigger is invoker.
await db.exec(`alter table students enable row level security;
create policy teacher_scope on students to authenticated using(created_by=current_setting('test.teacher',true)) with check(created_by=current_setting('test.teacher',true));
grant select,update on students to authenticated;
set role authenticated; set test.teacher='teacher-b';`)
assert.equal((await db.query('select * from students')).rows.length,0)
assert.equal((await db.query(`update students set subjects=array['История'] where id=3 returning id`)).rows.length,0)
await db.exec(`set test.teacher='teacher-a'; update students set subjects=array['Химия','Биология','Русский','Литература'] where id=3; reset role;`)
assert.deepEqual((await get(3)).subjects,['Химия','Биология','Русский','Литература'])
await db.exec(migration) // Reapplying does not erase a previously chosen array.
assert.deepEqual((await get(3)).subjects,['Химия','Биология','Русский','Литература'])
console.log('PASS: plural backfill, one-row creation, legacy insert/update, trimming/deduplication, clearing, custom subjects, identity/invitation preservation, RLS isolation and idempotent migration.')
await db.close()
