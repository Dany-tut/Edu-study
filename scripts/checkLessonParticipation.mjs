import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const name = `iskra-attendance-check-${randomUUID().slice(0, 8)}`
const run = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
try {
  run(['run', '-d', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine'])
  let ready = false
  for (let n = 0; n < 50; n++) {
    try { run(['exec', name, 'pg_isready', '-U', 'postgres']); ready = true; break }
    catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  if (!ready) throw new Error('Postgres did not start')
  const sql = input => run(['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], input)
  sql(`create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.is_admin() returns boolean language sql as 'select false';
    grant usage on schema public,auth to authenticated;
    create table students(id uuid primary key,auth_user_id uuid,created_by uuid,group_id uuid);
    create table groups(id uuid primary key,created_by uuid);
    create table courses(id uuid primary key,subject text,student_ids uuid[],group_ids uuid[]);
    create table lessons(id uuid primary key,course_id uuid,short_id text,title text,kind text,lesson_number int,
      scheduled_date text,scheduled_time text,rec_date text,rec_time text,lesson_sched_manual boolean);
    create table schedule_lessons(id uuid primary key,lesson_id uuid,group_id uuid,student_id uuid,date date,
      time_start text,time_end text,subject text,lesson_title text,lesson_number int,node_type text,status text);
    create table teacher_lesson_sessions(schedule_id uuid primary key,attendance jsonb,updated_at timestamptz default now());
    create table lesson_attendance(student_id uuid,lesson_date date,lesson_title text,present boolean,grade integer);
    grant select on students,groups,courses,lessons,schedule_lessons to authenticated;`)
  // Exercise the actual journal projection as well as the new aggregation.
  sql(readFileSync('supabase/migrations/20261031160000_student_schedule_attendance.sql', 'utf8').split('-- Journal saves')[0] + 'commit;')
  sql(readFileSync('supabase/migrations/20261101031831_lesson_attendance_credit.sql', 'utf8'))
  sql(readFileSync('supabase/migrations/20261101032244_lesson_participation_invoker.sql', 'utf8'))
  sql(readFileSync('scripts/checkLessonParticipation.sql', 'utf8'))
  console.log('PASS: journal attendance, old lessons, recorded-only mode, corrections, split nodes, legacy ambiguity, access isolation')
} catch (error) {
  console.error(error.stderr?.toString() || error)
  process.exitCode = 1
} finally {
  try { run(['rm', '-f', name]) } catch {}
}
