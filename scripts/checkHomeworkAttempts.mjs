import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const name = `iskra-attempt-check-${randomUUID().slice(0,8)}`
const run = (args, input) => execFileSync('docker', args, {input,encoding:'utf8',stdio:['pipe','pipe','pipe']})
try {
  run(['run','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
  let ready=false
  for(let n=0;n<50;n++) { try {run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break} catch {await new Promise(r=>setTimeout(r,100))} }
  if(!ready) throw new Error('Postgres did not start')
  const sql = input => run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],input)
  sql(`create role authenticated; create role anon; create schema auth;
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create function public.is_admin() returns boolean language sql as 'select false';
  create table students(id uuid primary key,auth_user_id uuid,created_by uuid,group_id uuid);
  create table groups(id uuid primary key,created_by uuid);
  create table lesson_progress(id uuid primary key default gen_random_uuid(),student_id uuid,lesson_ref text,status text,score int,attachments jsonb,comment text,review_comment text,review_attachments jsonb,updated_at timestamptz default now());`)
  for(const path of ['supabase/migrations/20261101025458_homework_attempt_history.sql','supabase/migrations/20261101030743_homework_attempt_summary.sql','supabase/migrations/20261101035910_legacy_homework_retake.sql','supabase/migrations/20261101101728_preserve_returned_homework_attempt_answers.sql','scripts/checkHomeworkAttempts.sql']) sql(readFileSync(path,'utf8'))
  sql(readFileSync('supabase/migrations/20261101035125_lesson_self_assessment.sql','utf8'))
  sql(readFileSync('scripts/checkLessonSelfAssessment.sql','utf8'))
  sql(readFileSync('scripts/checkLegacyHomeworkRetake.sql','utf8'))
  sql(readFileSync('scripts/checkReturnedHomeworkHistory.sql','utf8'))
  console.log('PASS: PostgreSQL migration, mixed grading, retries, history, idempotency, frozen answers, RLS isolation, self-assessment')
} catch(error) { console.error(error.stderr?.toString() || error); process.exitCode=1 }
finally { try {run(['rm','-f',name])} catch {} }
