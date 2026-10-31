import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assignedCourseTitles } from '../src/lib/studentCourseAssignments.ts'

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated;
create function is_admin() returns boolean language sql as $$ select coalesce(current_setting('test.admin',true),'false')::boolean $$;
create table profiles(id uuid primary key,name text);
create table groups(id uuid primary key default gen_random_uuid(),name text,subject text,icon text,level text,color text,color_soft text,start_date date,total_lessons int,is_individual boolean,created_by uuid);
create table students(id uuid primary key default gen_random_uuid(),name text,email text,phone text,telegram_link text,parent_contact text,comment text,group_id uuid,created_by uuid,person_id uuid,auth_user_id uuid,last_visit date,created_at timestamptz default now(),updated_at timestamptz);
create table lesson_progress(student_id uuid);
create table schedule_lessons(student_id uuid,group_id uuid);
create table lesson_attendance(student_id uuid,group_id uuid);
`)
await db.exec(readFileSync('supabase/migrations/0053_admin_students.sql','utf8'))
await db.exec(readFileSync('supabase/migrations/20261031151848_student_owner_and_course_memberships.sql','utf8'))
const owner='10000000-0000-0000-0000-000000000001'
const next='10000000-0000-0000-0000-000000000002'
await db.exec(`insert into profiles values('${owner}','Teacher'),('${next}','Next'); set test.admin='true';`)
const student=(await db.query(`insert into students(name,created_by) values('Митя','${owner}') returning id`)).rows[0].id
let row=(await db.query('select * from admin_students_list()')).rows[0]
assert.equal(row.owner_id,owner)
assert.equal(row.owner_name,'Teacher')
assert.equal(row.group_id,null)
assert.equal((await db.query(`select admin_student_reassign('${student}','${next}') result`)).rows[0].result,'owner_changed')
row=(await db.query('select * from admin_students_list()')).rows[0]
assert.equal(row.owner_id,next)
assert.equal(row.group_id,null)
const group=(await db.query(`insert into groups(name,created_by,is_individual) values('Group','${owner}',false) returning id`)).rows[0].id
const grouped=(await db.query(`insert into students(name,created_by,group_id) values('Grouped','${next}','${group}') returning id`)).rows[0].id
assert.equal((await db.query(`select owner_id from admin_students_list() where id='${grouped}'`)).rows[0].owner_id,owner)
assert.equal((await db.query('select count(*)::int n from groups')).rows[0].n,1)
await db.exec(`set test.admin='false';`)
await assert.rejects(db.query('select * from admin_students_list()'),/forbidden/)
await assert.rejects(db.query(`select admin_student_reassign('${student}','${owner}')`),/forbidden/)
const courses=[
  {id:'direct',title:'Интенсив',student_ids:[student],group_ids:[]},
  {id:'group',title:'Курс группы',student_ids:[],group_ids:['group']},
  {id:'other',title:'Чужой курс',student_ids:['other'],group_ids:[]},
]
assert.deepEqual(assignedCourseTitles([{id:student,groupId:null}],courses),['Интенсив'])
assert.deepEqual(assignedCourseTitles([{id:student},{id:'sibling',groupId:'group'}],courses),['Интенсив','Курс группы'])
assert.deepEqual(assignedCourseTitles([{id:'unassigned'}],courses),[])
console.log('PASS: independent owner, reassignment without group, admin authorization, direct/group/sibling course labels')
await db.close()
