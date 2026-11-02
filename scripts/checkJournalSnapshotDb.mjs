import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
const name = `iskra-journal-snapshot-${randomUUID().slice(0,8)}`
const run = (args,input) => execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']})
let db
try {
  let sql
  if (process.env.ISKRA_PGLITE_TEST_MODULE) {
    const { PGlite } = await import(process.env.ISKRA_PGLITE_TEST_MODULE)
    db = new PGlite(); sql = text => db.exec(text)
  } else {
    run(['run','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    // Docker's initialization server uses only a Unix socket; wait for the final TCP server.
    let ready=false
    for(let i=0;i<50;i++) { try {run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break} catch {await new Promise(r=>setTimeout(r,100))} }
    if(!ready) throw new Error('Test PostgreSQL did not start')
    sql=text=>run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1'],text)
  }
  await sql(`create role authenticated;create role anon;create role service_role;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create function public.is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')::boolean$$;
    create table courses(id uuid primary key,created_by uuid,short_id text,title text,subject text,kind text,group_ids uuid[],student_ids uuid[]);
    create table course_shares(course_id uuid,teacher_id uuid);
    create table groups(id uuid primary key,created_by uuid);
    create table students(id uuid primary key,created_by uuid);
    create table lessons(id uuid primary key,created_by uuid,short_id text,course_id uuid,module_id uuid,title text,kind text,position int,lesson_number int,
      scheduled_date text,scheduled_time text,rec_date text,rec_time text,lesson_sched_manual bool,delivery_mode text,youtube_url text,
      hw_tasks jsonb,rec_tasks jsonb,hw_date text,rec_hw_date text,extra_hw jsonb,homework jsonb);
    create view teacher_journal_lessons_v1 with(security_invoker=true) as select id,short_id,course_id,module_id,title,kind,position,lesson_number,
      scheduled_date,scheduled_time,rec_date,rec_time,lesson_sched_manual,delivery_mode,youtube_url,hw_tasks,rec_tasks,hw_date,rec_hw_date,extra_hw from lessons;
    create table course_modules(id uuid primary key,course_id uuid,label text,position int);
    create table lesson_progress(id uuid primary key,student_id uuid,lesson_ref text,status text,score int,attachments jsonb,updated_at text,review_comment text);
    create table schedule_lessons(id uuid primary key,lesson_id uuid,node_type text,group_id uuid,student_id uuid,date text,time_start text,time_end text,lesson_title text,subject text,status text);
    create table homework(id uuid primary key,created_by uuid,lesson_id uuid,group_id uuid,title text,due_date text,status text,basic_tasks jsonb,assigned_at text);
    create table lesson_attendance(id uuid primary key,student_id uuid,lesson_date text,lesson_title text,present bool,grade int);
    create table homework_attempts(id uuid primary key,student_id uuid,lesson_ref text,number int,status text,score int,passing_score int,submitted_at text,review_comment text);
    create table teacher_lesson_sessions(schedule_id uuid primary key,attendance jsonb);
    insert into courses(id,created_by,title) values(md5('course-a')::uuid,md5('owner-a')::uuid,'Owned'),(md5('course-shared')::uuid,md5('owner-b')::uuid,'Shared'),(md5('course-private')::uuid,md5('owner-b')::uuid,'Private');
    insert into course_shares values(md5('course-shared')::uuid,md5('owner-a')::uuid);
    insert into groups values(md5('group-a')::uuid,md5('owner-a')::uuid),(md5('group-b')::uuid,md5('owner-b')::uuid);
    insert into students values(md5('student-a')::uuid,md5('owner-a')::uuid),(md5('student-b')::uuid,md5('owner-b')::uuid);
    insert into lessons(id,created_by,course_id,hw_tasks,extra_hw) select md5('lesson-'||n)::uuid,md5('owner-a')::uuid,md5('course-a')::uuid,'[{"type":"write","isHard":false}]','[{"id":"extra","tasks":[{"type":"text"}]}]' from generate_series(1,1609)n;
    insert into lessons(id,created_by,course_id) values(md5('lesson-shared')::uuid,md5('owner-b')::uuid,md5('course-shared')::uuid),(md5('lesson-private')::uuid,md5('owner-b')::uuid,md5('course-private')::uuid);
    update lessons set homework=jsonb_build_object('body',repeat('x',500000)) where id=md5('lesson-1')::uuid;
    insert into lesson_progress(id,student_id,lesson_ref,score,attachments) select md5('progress-'||n)::uuid,md5('student-a')::uuid,'lesson',42,'{"answer":"draft retained"}' from generate_series(1,2107)n;
    insert into lesson_progress(id,student_id,score) values(md5('progress-private')::uuid,md5('student-b')::uuid,99);
    insert into homework(id,created_by,basic_tasks) values(md5('hw-a')::uuid,md5('owner-a')::uuid,'[{"type":"write"},{"type":"testly"}]');
    insert into schedule_lessons(id,group_id) values(md5('event-group')::uuid,md5('group-a')::uuid);
    insert into schedule_lessons(id,student_id) values(md5('event-direct')::uuid,md5('student-a')::uuid);
    insert into teacher_lesson_sessions values(md5('event-group')::uuid,'{"student":true}'),(md5('event-direct')::uuid,'{"student":false}');
    insert into homework_attempts(id,student_id,number,score) values(md5('attempt')::uuid,md5('student-a')::uuid,2,62);
    insert into lesson_attendance(id,student_id,grade) values(md5('attendance')::uuid,md5('student-a')::uuid,88);
    do $$declare t text;begin
      foreach t in array array['courses','groups','students','homework'] loop
        execute format('alter table %I enable row level security',t);
        execute format('create policy owner on %I to authenticated using(created_by=(select auth.uid()) or (select is_admin()))',t);
      end loop;
    end$$;
    create policy shared on courses to authenticated using(id in(select course_id from course_shares where teacher_id=(select auth.uid())));
    alter table lessons enable row level security;
    create policy lesson_read on lessons to authenticated using(course_id in(select id from courses));
    alter table lesson_progress enable row level security;
    create policy progress_read on lesson_progress to authenticated using(student_id in(select id from students));
    grant usage on schema public,auth to authenticated,anon;
    grant select on all tables in schema public to authenticated;
  `)
  await sql(readFileSync('supabase/migrations/20261102045052_teacher_journal_snapshot.sql','utf8'))
  await sql(readFileSync('supabase/migrations/20261102051629_journal_snapshot_json_transport.sql','utf8'))
  await sql(`set role authenticated;select set_config('test.uid',md5('owner-a')::uuid::text,false);
    do $$declare d jsonb;begin
      d:=teacher_journal_snapshot_v2(md5('owner-a')::uuid,true);
      if d is distinct from teacher_journal_snapshot_v1(md5('owner-a')::uuid,true) then raise exception 'JSON transport changed data';end if;
      if jsonb_array_length(d->'courses')<>2 or jsonb_array_length(d->'lessons')<>1610 or jsonb_array_length(d->'work')<>2107 then raise exception 'Snapshot truncated or ownership/shared scope wrong';end if;
      if jsonb_array_length(d->'events')<>2 or jsonb_array_length(d->'marks')<>2 or jsonb_array_length(d->'attempts')<>1 or jsonb_array_length(d->'legacy')<>1 then raise exception 'Related records missing';end if;
      if (d->'work'->0->>'score')::int<>42 or d->'work'->0->'attachments'->>'answer'<>'draft retained' then raise exception 'Grade/draft changed';end if;
      if d->'assignments'->0->'basicTasks'<>'[{"type":"write"},{"type":"testly"}]'::jsonb then raise exception 'Task types/order changed';end if;
      if d::text like '%xxxxx%' then raise exception 'Rich lesson body leaked';end if;
      begin perform teacher_journal_snapshot_v2(md5('owner-b')::uuid,true);raise exception 'Foreign owner allowed';exception when insufficient_privilege then null;end;
    end$$;
    reset role;update lesson_progress set score=77 where student_id=md5('student-a')::uuid;
    set role authenticated;
    do $$begin if teacher_journal_snapshot_v2(md5('owner-a')::uuid,true)->'work'->0->>'score'<>'77' then raise exception 'Stale results';end if;end$$;
    reset role;select set_config('test.uid',md5('owner-b')::uuid::text,false);set role authenticated;
    do $$declare d jsonb;begin d:=teacher_journal_snapshot_v2(md5('owner-b')::uuid);
      if jsonb_array_length(d->'lessons')<>2 or jsonb_array_length(d->'work')<>1 then raise exception 'Second owner isolation failed';end if;end$$;
    reset role;set test.admin='true';set role authenticated;
    do $$begin if json_array_length(teacher_journal_snapshot_v2(md5('owner-a')::uuid)->'work')<>2107 then raise exception 'Admin view broken';end if;end$$;
    reset role;set role anon;
    do $$begin begin perform teacher_journal_snapshot_v2(md5('owner-a')::uuid);raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;end$$;
    reset role;
    do $$begin if exists(select 1 from pg_proc where proname='teacher_journal_snapshot_v2' and (prosecdef or provolatile<>'s')) then raise exception 'Snapshot must be stable invoker';end if;end$$;
  `)
  await sql(readFileSync('supabase/migrations/20261101164928_teacher_journal_lesson_summary.sql','utf8').split('-- Invoker security')[0])
  await sql(readFileSync('supabase/migrations/20261102082617_journal_compact_task_sources.sql','utf8'))
  await sql("create or replace function pg_temp.unpack_journal_wire(p jsonb) returns jsonb\nlanguage sql immutable as $$\n  select (p - 'encoding' - array['courses','lessons','modules','work','events','assignments','legacy','attempts','marks']) ||\n    (select jsonb_object_agg(k,coalesce((\n      select jsonb_agg((select jsonb_object_agg(c.col #>> '{}',r.row->(c.n-1)::int)\n        from jsonb_array_elements(t->'columns') with ordinality c(col,n)) order by r.n)\n      from jsonb_array_elements(t->'rows') with ordinality r(row,n)\n    ),'[]'::jsonb))\n    from jsonb_each(p) e(k,t) where k in('courses','lessons','modules','work','events','assignments','legacy','attempts','marks'))\n$$;\n\n")
  await sql(`reset role;set test.admin='false';select set_config('test.uid',md5('owner-a')::uuid::text,false);set role authenticated;
    do $$declare old jsonb;fresh jsonb;begin
      old:=teacher_journal_snapshot_v2(md5('owner-a')::uuid,true);fresh:=pg_temp.unpack_journal_wire(teacher_journal_snapshot_v3(md5('owner-a')::uuid,true)::jsonb);
      if (old-'lessons') is distinct from (fresh-'lessons') then raise exception 'Non-task data changed';end if;
      if jsonb_array_length(fresh->'lessons')<>1610 then raise exception 'Compact lessons truncated';end if;
      if fresh->'lessons'->0->'hwTask' not in ('[{"type":"iskra"}]'::jsonb,'null'::jsonb) then raise exception 'Native source missing';end if;
      begin perform teacher_journal_snapshot_v3(md5('owner-b')::uuid);raise exception 'Foreign compact owner allowed';exception when insufficient_privilege then null;end;
    end$$;
    reset role;select set_config('test.uid',md5('owner-b')::uuid::text,false);set role authenticated;
    do $$begin if jsonb_array_length(pg_temp.unpack_journal_wire(teacher_journal_snapshot_v3(md5('owner-b')::uuid)::jsonb)->'work')<>1 then raise exception 'Compact second-owner isolation failed';end if;end$$;
    reset role;set test.admin='true';set role authenticated;
    do $$begin if jsonb_array_length(pg_temp.unpack_journal_wire(teacher_journal_snapshot_v3(md5('owner-a')::uuid)::jsonb)->'work')<>2107 then raise exception 'Compact admin scope failed';end if;end$$;
    reset role;set role anon;
    do $$begin begin perform teacher_journal_snapshot_v3(md5('owner-a')::uuid);raise exception 'Anonymous compact RPC allowed';exception when insufficient_privilege then null;end;end$$;
    reset role;
    do $$begin
      if public.teacher_journal_task_sources_v2('[]')<>'[]' or public.teacher_journal_task_sources_v2('[null,false,0,""]')<>'[null]' then raise exception 'Empty/invalid task semantics changed';end if;
      if public.teacher_journal_task_sources_v2('[{"type":"testly","isHard":true}]')<>'[null]' then raise exception 'Hard tasks became basic';end if;
      if public.teacher_journal_task_sources_v2('[{"isHard":false},true,"legacy"]')<>'[{}]' then raise exception 'Untyped basic task lost';end if;
      if public.teacher_journal_task_sources_v2('[{"type":"write"},{"type":"write"},{"type":"testly"},{"type":"testly","isHard":true}]')<>'[{"type":"iskra"},{"type":"testly"}]' then raise exception 'Mixed sources changed';end if;
      if public.teacher_journal_task_sources_v2('{"type":"write","isHard":true}')<>'{"type":"write","isHard":true}' then raise exception 'Legacy non-array semantics changed';end if;
      if not (select reloptions @> array['security_invoker=true'] from pg_class where relname='teacher_journal_lessons_v2') then raise exception 'Compact view bypasses RLS';end if;
      if exists(select 1 from pg_proc where proname='teacher_journal_snapshot_v3' and (prosecdef or provolatile<>'s')) then raise exception 'Compact RPC must be stable invoker';end if;
    end$$;
  `)
  const query = `set test.admin='true';select set_config('test.uid',md5('owner-a')::uuid::text,false);
    with snapshot as materialized(select teacher_journal_snapshot_v3(md5('owner-a')::uuid,true)::jsonb wire)
    select jsonb_build_object('wire',wire,'decoded',pg_temp.unpack_journal_wire(wire)) as fixture from snapshot;`
  const fixture = db ? (await db.exec(query)).at(-1).rows[0].fixture
    : JSON.parse(run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],query).split('\n').find(line=>line.startsWith('{')))
  const bundle = buildSync({entryPoints:['src/lib/journalSnapshot.ts'],bundle:true,platform:'node',format:'esm',write:false})
  const { journalSnapshotResult } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
  assert.deepEqual(journalSnapshotResult({data:fixture.wire,error:null}),fixture.decoded,'Client decoder must retain every value and row')
  const truncated=structuredClone(fixture.wire);truncated.work.rows[0].pop()
  assert.throws(()=>journalSnapshotResult({data:truncated,error:null}),/неполон/)
  const wrongColumns=structuredClone(fixture.wire);wrongColumns.work.columns.reverse()
  assert.throws(()=>journalSnapshotResult({data:wrongColumns,error:null}),/неполон/)
  assert.throws(()=>journalSnapshotResult({data:{...fixture.wire,encoding:'future'},error:null}),/Формат/)
  console.log('PASS: actual SQL wire decoded losslessly by browser code; truncated rows, reordered fields and incompatible encodings rejected')
  console.log('PASS: compact task categories, complete grades/answers/attempts/attendance, two owners/admin, anon denial and invoker security')
  console.log('PASS: complete 1610 lessons/2107 progress, related records, grades/drafts, task order, fresh rereads, shared-course scope, two owners/admin, anon denial, invoker security')
} catch(e) { console.error(e.stderr?.toString()||e);process.exitCode=1 }
finally { if(db)await db.close();else try {run(['rm','-f',name])}catch{} }
