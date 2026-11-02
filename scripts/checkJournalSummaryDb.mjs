import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const name = `iskra-journal-summary-${randomUUID().slice(0,8)}`
const run = (args,input) => execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']})
let db
try {
  let sql
  if (process.env.ISKRA_PGLITE_TEST_MODULE) {
    const {PGlite} = await import(process.env.ISKRA_PGLITE_TEST_MODULE)
    db = new PGlite()
    sql = text => db.exec(text)
  } else {
    run(['run','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    let ready = false
    for (let i=0;i<50;i++) {
      try {run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break} catch {await new Promise(r=>setTimeout(r,100))}
    }
    if (!ready) throw new Error('Test PostgreSQL did not start')
    sql = text => run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1'],text)
  }
  await sql(`create role authenticated;create role anon;create role service_role;
    create schema auth;create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    create table public.lessons(id uuid primary key,created_by uuid,short_id text,course_id uuid,module_id uuid,title text,kind text,position int,lesson_number int,scheduled_date text,scheduled_time text,rec_date text,rec_time text,lesson_sched_manual bool,delivery_mode text,youtube_url text,homework jsonb);
    alter table lessons enable row level security;
    create policy owner_read on lessons to authenticated using(created_by=(select auth.uid()));
    grant usage on schema public,auth to authenticated;grant select on lessons to authenticated;
    insert into lessons(id,created_by,short_id,homework) values
    ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','own',jsonb_build_object('hwDate','2026-11-01','hwTasks',jsonb_build_array(jsonb_build_object('type','write','condition',repeat('x',500000),'isHard',false),jsonb_build_object('type','testly','isHard',true)),'extraHw',jsonb_build_array(jsonb_build_object('id','practice','date','2026-11-02','tasks',jsonb_build_array(jsonb_build_object('type','text','answer','secret')))))),
    ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000022','other','{}');`)
  await sql(readFileSync('supabase/migrations/20261101164928_teacher_journal_lesson_summary.sql','utf8'))
  await sql(`create temp table before_summary as select * from public.teacher_journal_lessons_v1;`)
  await sql(readFileSync('supabase/migrations/20261102013000_journal_stored_summary.sql','utf8'))
  await sql(`do $$ begin
    if exists((select * from before_summary except select * from teacher_journal_lessons_v1)
      union all (select * from teacher_journal_lessons_v1 except select * from before_summary)) then
      raise exception 'Stored projection changed data'; end if;
    if not (select attgenerated='s' from pg_attribute where attrelid='lessons'::regclass and attname='journal_homework_summary') then
      raise exception 'Projection must be stored and database maintained'; end if;
    end $$;
    update lessons set homework=jsonb_set(homework,'{hwDate}','"2026-12-01"') where short_id='own';
    do $$ begin
      if (select hw_date from teacher_journal_lessons_v1 where short_id='own') <> '2026-12-01' then
        raise exception 'Projection stale after homework save'; end if;
    end $$;`)
  await sql(`set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
    do $$ begin
      if (select count(*) from teacher_journal_lessons_v1) <> 1 then raise exception 'Teacher isolation failed';end if;
      if (select short_id from teacher_journal_lessons_v1) <> 'own' then raise exception 'Wrong teacher data';end if;
      if (select hw_tasks from teacher_journal_lessons_v1) <> '[{"type":"write","isHard":false},{"type":"testly","isHard":true}]'::jsonb then raise exception 'Task flags/order changed';end if;
      if (select extra_hw from teacher_journal_lessons_v1) <> '[{"id":"practice","date":"2026-11-02","tasks":[{"type":"text"}]}]'::jsonb then raise exception 'Extra homework changed';end if;
      if (select length(row_to_json(v)::text) from teacher_journal_lessons_v1 v) > 1500 then raise exception 'Rich body leaked into summary';end if;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000022',false);
    do $$ begin if (select short_id from teacher_journal_lessons_v1) <> 'other' then raise exception 'Second teacher isolation failed';end if;end $$;
    reset role;set role anon;
    do $$ begin
      begin perform 1 from teacher_journal_lessons_v1;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
    end $$;
    reset role;
    do $$ begin
      if not (select reloptions @> array['security_invoker=true'] from pg_class where relname='teacher_journal_lessons_v1') then raise exception 'Invoker security missing';end if;
    end $$;`)
  console.log('PASS: journal summary PostgreSQL RLS for two owners, anonymous denial, task flags/order, extra-HW IDs/dates and 500KB body excluded')
} catch(e) {console.error(e.stderr?.toString()||e);process.exitCode=1}
finally {if(db)await db.close();else try{run(['rm','-f',name])}catch{}}
