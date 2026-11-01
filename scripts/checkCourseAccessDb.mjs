import { execFileSync, execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const name = `iskra-access-check-${randomUUID().slice(0,8)}`
const run = (args,input) => execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']})
try {
 run(['run','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
 let ready=false
 for(let n=0;n<50;n++){try{run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,100))}}
 if(!ready)throw new Error('Postgres did not start')
 const sql = text => run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1'],text)
 sql(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 create table courses(id uuid primary key,created_by uuid,title text,student_ids uuid[] default '{}',group_ids uuid[] default '{}',updated_at timestamptz default now());
 create table groups(id uuid primary key,created_by uuid);
 create table students(id uuid primary key,created_by uuid,group_id uuid);
 create table course_enrollments(course_id uuid references courses(id) on delete cascade,student_id text,access_mode text,created_by uuid,position int,unique(course_id,student_id));
 alter table courses enable row level security;
 create policy owner on courses to authenticated using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()));
 alter table course_enrollments enable row level security;
 create policy owner on course_enrollments to authenticated using(course_id in(select id from courses where created_by=(select auth.uid()))) with check(course_id in(select id from courses where created_by=(select auth.uid())));
 grant usage on schema public,auth to authenticated;
 grant all on courses,groups,students,course_enrollments to authenticated;
 insert into groups values('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001');
 insert into students select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001',case when n=12 then '00000000-0000-0000-0000-000000000020'::uuid else null end from generate_series(11,15)n;
 insert into students values('00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000002',null);
 insert into courses(id,created_by,title,student_ids) select '00000000-0000-0000-0000-000000000100','00000000-0000-0000-0000-000000000001','original',array_agg(id) from students where created_by='00000000-0000-0000-0000-000000000001';
 insert into course_enrollments select '00000000-0000-0000-0000-000000000100',id::text,case when id::text like '%12' then 'full' else 'by_date' end,created_by,7 from students where created_by='00000000-0000-0000-0000-000000000001';`)
 sql(readFileSync('supabase/migrations/20261101091040_course_access_changes.sql','utf8'))
 sql(readFileSync('supabase/migrations/20261101092057_course_access_guard_validation_error.sql','utf8'))
 sql(readFileSync('scripts/checkCourseAccess.sql','utf8'))
 const concurrent = member => exec('docker',['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-c',
  `begin; set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true); select save_course_access_changes('00000000-0000-0000-0000-000000000100','{"students":{"${member}":true}}'); select pg_sleep(0.3); commit;`])
 await Promise.all([concurrent('00000000-0000-0000-0000-000000000011'),concurrent('00000000-0000-0000-0000-000000000012')])
 sql(`do $$ begin if (select count(*) from course_enrollments) <> 5 then raise exception 'Concurrent assignment lost'; end if; end $$;`)
 console.log('PASS: PostgreSQL concurrency, stale-client guards, explicit revocation, group overlap, mode/order preservation, transaction rollback, teacher isolation')
} catch(e){console.error(e.stderr?.toString()||e);process.exitCode=1}
finally{try{run(['rm','-f',name])}catch{}}
