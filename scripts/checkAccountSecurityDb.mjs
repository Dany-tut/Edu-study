// Executes the forward migration against real embedded PostgreSQL (PGlite).
// This focused schema fixture is not the full Supabase migration-chain/E2E test.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const modulePath = process.env.ISKRA_PGLITE_MODULE
if (!modulePath) throw Error('Set ISKRA_PGLITE_MODULE to an installed @electric-sql/pglite dist/index.js')
const { PGlite } = await import(modulePath)
const db = new PGlite()
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
let count = 0
try {
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.is_admin() returns boolean language sql as $$select coalesce(current_setting('request.jwt.claim.admin',true),'')='true'$$;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create table profiles(id uuid primary key, role text check(role in ('student','teacher')), name text, first_name text, last_name text, subject text, username text, subjects text[] default '{}', hidden_tabs text[] default '{}', hidden_widgets text[] default '{}', updated_at timestamptz);
create function gen_username(text) returns text language sql as $$select $1$$;
create table teacher_invites(token uuid primary key, email text, consumed_at timestamptz, consumed_by uuid, expires_at timestamptz default now()+interval '1 day', hidden_tabs text[] default '{}',hidden_widgets text[] default '{}',subjects text[] default '{}',course_assignments jsonb default '[]',group_ids uuid[] default '{}');
create table groups(id uuid primary key, created_by uuid);
create table course_shares(course_id uuid,teacher_id uuid,unique(course_id,teacher_id));
create function duplicate_course(uuid,uuid) returns void language sql as $$select$$;
create table students(id uuid primary key, group_id uuid, person_id uuid, created_by uuid, auth_user_id uuid, email text, invite_token uuid unique, temp_password text);
create function seed_student_progress(uuid,uuid) returns void language sql as $$select$$;
grant usage on schema public,auth to anon,authenticated;
grant all on profiles,students to authenticated;
`)
await db.exec(readFileSync(new URL('../supabase/migrations/20261102074927_secure_roles_and_password_storage.sql', import.meta.url),'utf8'))
await db.exec(`create trigger trg_guard_profile_access_cols before update on profiles for each row execute function guard_profile_access_cols();
insert into auth.users(id,email,raw_user_meta_data) values('${id(1)}','student@example.invalid','{"role":"admin"}'),('${id(2)}','other@example.invalid','{}');`)
async function equal(sql, expected) { const { rows } = await db.query(sql); assert.equal(Object.values(rows[0])[0], expected, sql); count++ }
async function asUser(n, sql, denied = false) {
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(n)}',false);`)
 try { if (denied) { await assert.rejects(db.exec(sql)); count++ } else await db.exec(sql) }
 finally { await db.exec('reset role') }
}
await equal(`select role from profiles where id='${id(1)}'`, 'student')
await db.exec(`insert into auth.users(id,email,raw_app_meta_data) values('${id(3)}','admin@example.invalid','{"role":"admin"}')`)
await equal(`select role from profiles where id='${id(3)}'`, 'teacher')
await db.exec('set role anon')
await assert.rejects(db.exec(`select apply_teacher_invite('${id(10)}')`)); count++
await assert.rejects(db.exec(`select claim_student_account('${id(50)}','ignored')`)); count++
await db.exec('reset role')
await asUser(1, `update profiles set role='admin' where id='${id(1)}'`, true)
await asUser(1, `insert into profiles(id,role) values('${id(88)}','teacher')`, true)
await asUser(1, `update profiles set name='Allowed' where id='${id(1)}'`)
await equal(`select name from profiles where id='${id(1)}'`, 'Allowed')
await db.exec(`insert into teacher_invites(token,email,hidden_tabs) values('${id(10)}','student@example.invalid',array['billing']);`)
await asUser(2, `select apply_teacher_invite('${id(10)}')`, true)
await asUser(1, `select apply_teacher_invite('${id(10)}')`)
await equal(`select role from profiles where id='${id(1)}'`, 'teacher')
await asUser(1, `select apply_teacher_invite('${id(10)}')`)
await equal(`select hidden_tabs[1] from profiles where id='${id(1)}'`, 'billing')
await asUser(1, `update profiles set hidden_tabs='{}' where id='${id(1)}'`, true)
await db.exec(`insert into teacher_invites(token,expires_at) values('${id(11)}',now()-interval '1 day');`)
await asUser(2, `select apply_teacher_invite('${id(11)}')`, true)
await db.exec(`insert into students(id,person_id,created_by,invite_token) values
('${id(20)}','${id(30)}','${id(40)}','${id(50)}'),
('${id(21)}','${id(30)}','${id(40)}','${id(51)}'),
('${id(22)}','${id(30)}','${id(41)}','${id(52)}');`)
await asUser(1, `select claim_student_account('${id(50)}','forged@example.invalid')`, true)
await asUser(2, `select claim_student_account('${id(50)}','forged@example.invalid','should-never-be-stored')`)
await equal(`select count(*)::int from students where auth_user_id='${id(2)}'`,2)
await equal(`select email from students where id='${id(20)}'`, 'other@example.invalid')
await equal(`select count(*)::int from students where temp_password is not null`,0)
await asUser(2, `update students set temp_password='forbidden' where id='${id(20)}'`,true)
await asUser(2, `select claim_student_account('${id(50)}','ignored')`)
// Genuine profile RLS: normal users see only themselves, both USING and WITH CHECK.
await db.exec(`alter table profiles enable row level security;
create policy self_profile on profiles to authenticated using(id=auth.uid()) with check(id=auth.uid());`)
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(2)}',false)`)
await equal('select count(*)::int from profiles',1)
await db.exec('reset role')
// Apply the repository's actual current student-owner policies, not a mock policy.
const ownershipSource = readFileSync(new URL('../supabase/migrations/20261030225349_independent_students.sql', import.meta.url),'utf8')
const ownershipPolicies = ownershipSource.slice(ownershipSource.indexOf('drop policy if exists teacher_read_students'), ownershipSource.indexOf('create or replace function public.enforce_student_limit'))
await db.exec('alter table students enable row level security;')
await db.exec(ownershipPolicies)
await db.exec(`insert into auth.users(id,email) values('${id(40)}','teacher-a@example.invalid'),('${id(41)}','teacher-b@example.invalid');
update profiles set role='teacher' where id in ('${id(40)}','${id(41)}');
insert into groups values('${id(60)}','${id(40)}'),('${id(61)}','${id(41)}');`)
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(40)}',false)`)
await equal('select count(*)::int from students',2)
await equal(`with edited as(update students set email='blocked@example.invalid' where id='${id(22)}' returning id) select count(*)::int from edited`,0)
await db.exec('reset role')
await asUser(40, `update students set auth_user_id='${id(1)}' where id='${id(20)}'`,true)
await asUser(40, `update students set group_id='${id(61)}' where id='${id(20)}'`,true)
await asUser(40, `insert into students(id,created_by,auth_user_id) values('${id(70)}','${id(40)}','${id(1)}')`,true)
await asUser(40, `insert into students(id,created_by,person_id,auth_user_id) values('${id(71)}','${id(40)}','${id(30)}','${id(2)}')`)
await equal(`select auth_user_id::text from students where id='${id(71)}'`,id(2))
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(41)}',false)`)
await equal('select count(*)::int from students',1)
await db.exec('reset role')
const staffSource = readFileSync(new URL('../supabase/migrations/0068_close_true_policies.sql', import.meta.url),'utf8')
const staffFunction = staffSource.slice(staffSource.indexOf('create or replace function public.is_staff()'), staffSource.indexOf('-- Отзыв'))
await db.exec(staffFunction)
for (const table of ['courses','lessons','course_modules','homework','course_enrollments','course_shares','schedule','schedule_lessons','widgets']) {
 if (table !== 'course_shares') await db.exec(`create table ${table}(id uuid,created_by uuid)`)
 await db.exec(`alter table ${table} enable row level security; grant all on ${table} to authenticated;`)
}
await db.exec(`alter table groups enable row level security;
grant all on groups to authenticated;
create policy owner on groups to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());`)
await db.exec(readFileSync(new URL('../supabase/migrations/20261102075513_restrict_staff_resource_writes.sql',import.meta.url),'utf8'))
await asUser(2, `insert into students(id,created_by) values('${id(72)}','${id(2)}')`,true)
await asUser(2, `insert into groups(id,created_by) values('${id(73)}','${id(2)}')`,true)
await asUser(40, `insert into groups(id,created_by) values('${id(74)}','${id(40)}')`)
await equal(`select count(*)::int from groups where id='${id(74)}'`,1)
// Stage-2 cleanup removes historical synthetic credentials without touching Auth.
await db.exec('alter table students disable trigger trg_reject_student_password_storage')
await db.exec(`update students set temp_password='historical-synthetic-only' where id='${id(20)}'`)
await db.exec('alter table students enable trigger trg_reject_student_password_storage')
await db.exec(readFileSync(new URL('../scripts/security/clearHistoricalStudentPasswords.sql',import.meta.url),'utf8'))
await equal('select count(*)::int from students where temp_password is not null',0)
console.log(`PASS: ${count} PostgreSQL role, invitation, credential and focused RLS assertions. Full deployment policies remain unverified.`)
} finally { await db.close() }
