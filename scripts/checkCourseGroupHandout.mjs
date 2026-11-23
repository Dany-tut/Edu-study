import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
const { PGlite } = await import(process.env.ISKRA_PGLITE_MODULE ?? '@electric-sql/pglite')
const db = new PGlite()
const sql = file => readFileSync('supabase/migrations/' + file,'utf8')
const rows = (q,p=[]) => db.query(q,p).then(x=>x.rows)
const one = async (q,p=[]) => Object.values((await rows(q,p))[0])[0]
const [actor, source, mod, oldGroup, group, student, outsider] = Array.from({length:7},()=>randomUUID())
const stamp='2026-11-01T08:00:00.123456Z'
try {
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$ select current_setting('qa.actor')::uuid $$;
    create function is_staff() returns boolean language sql as $$ select true $$;
    create function is_admin() returns boolean language sql as $$ select false $$;
    create function mfa_ok() returns boolean language sql as $$ select current_setting('qa.mfa')='yes' $$;
    create function my_course_ids() returns uuid[] language sql as $$ select '{}'::uuid[] $$;
    create table courses(id uuid primary key default gen_random_uuid(),short_id text unique,created_by uuid,kind text,title text,
      created_at timestamptz default now(),updated_at timestamptz default now(),subject text,level text,description text,status text,color text,bg text,
      number_start int,group_ids uuid[],student_ids uuid[],seed_stamp text,published_at timestamptz);
    create table course_modules(id uuid primary key default gen_random_uuid(),course_id uuid references courses,label text,position int);
    create table lessons(id uuid primary key default gen_random_uuid(),course_id uuid references courses,
      module_id uuid references course_modules,short_id text unique,title text,position int,lesson_number int,kind text,shape jsonb,
      trainer_id uuid,widget_id uuid,test_tasks jsonb,content jsonb,youtube_url text,description text,timecodes jsonb,
      chapter_variants jsonb,homework jsonb,materials jsonb,scheduled_date text,scheduled_time text,scheduled_duration int,
      rec_date text,rec_time text,rec_duration int,lesson_sched_manual boolean,delivery_mode text,updated_at timestamptz default now());
    create table course_item_visibility(course_id uuid references courses,item_kind text,item_key text,hidden boolean,primary key(course_id,item_kind,item_key));
    create table groups(id uuid primary key,created_by uuid);
    create table students(id uuid primary key,group_id uuid references groups,created_by uuid);
    create table course_enrollments(course_id uuid references courses,student_id text,access_mode text,created_by uuid,primary key(course_id,student_id));
    create table schedule_lessons(id uuid primary key default gen_random_uuid(),lesson_id uuid references lessons,group_id uuid references groups,
      student_id uuid references students,node_type text,date date,time_start text,time_end text,subject text,lesson_title text,lesson_number int,status text,
      constraint schedule_lessons_group_id_date_time_start_key unique(group_id,date,time_start));
    create table teacher_lesson_sessions(schedule_id uuid references schedule_lessons);
    grant usage on schema auth to authenticated;
    grant select,insert,update,delete on all tables in schema public to authenticated;
    alter table courses enable row level security;
    create policy owner on courses to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
    set qa.mfa='yes';
  `)
  await db.query("select set_config('qa.actor',$1,false)",[actor])
  await db.query('insert into groups values($1,$2),($3,$2)',[oldGroup,actor,group])
  await db.query('insert into students values($1,$2,$3)',[student,group,actor])
  await db.query(`insert into courses(id,short_id,created_by,title,status,subject,group_ids,student_ids,updated_at)
    values($1,'biology',$2,'Biology','published','bio',array[$3::uuid],'{}',$4)`,[source,actor,oldGroup,stamp])
  await db.query("insert into course_modules values($1,$2,'Unit',0)",[mod,source])
  await db.query(`insert into lessons(course_id,module_id,short_id,title,position,lesson_number,description,timecodes,chapter_variants,
    homework,scheduled_date,scheduled_time,scheduled_duration,rec_date,rec_time,updated_at)
    select $1,$2,'original-'||n,'Lesson '||n,n,n,'Protected description','[{"label":"Keep"}]','{"future":1}',
      '{"hwDate":"04.12.2026","recHwDate":"2026-12-05","extraHw":[{"date":"06.12.2026","unknown":7}],"hidden":true}',
      case when n=0 then '01.12.2026' end,case when n=0 then '10:00' end,90,
      case when n=0 then '02.12.2026' end,case when n=0 then '12:00' end,$3
    from generate_series(0,46) n`,[source,mod,stamp])
  await db.query(`insert into schedule_lessons(lesson_id,group_id,node_type,date,time_start,time_end,status)
    select id,$1,'lesson','2026-12-01','10:00','11:30','upcoming' from lessons where short_id='original-0'`,[oldGroup])
  await db.exec(sql('0022_course_duplicate.sql'))
  await db.exec(sql('0109_teacher_duplicate_course_widget_owner.sql').split('-- 2.')[0])
  await db.exec(process.env.ISKRA_COPY_MIGRATION ? readFileSync(process.env.ISKRA_COPY_MIGRATION,'utf8') : sql('20261123090000_course_copy_snapshot.sql'))
  await db.exec(sql('20261101091040_course_access_changes.sql'))
  await db.exec(sql('20261122052719_course_schedule_atomic_and_error_collection.sql').split('-- Existing admin UI contract')[0])
  await db.exec(sql('20261123091000_course_group_handout.sql'))
  const original = async()=>({
    course:await rows('select * from courses where id=$1',[source]),
    modules:await rows('select * from course_modules where course_id=$1',[source]),
    lessons:await rows('select * from lessons where course_id=$1 order by id',[source]),
    schedule:await rows('select * from schedule_lessons where group_id=$1',[oldGroup]),
  })
  const baseline=await original()
  const modules=JSON.stringify([{id:mod,label:'Unit',position:0}])
  const defaults=[randomUUID(),'biology',group,'Biology B','2027-01-01',stamp,modules,Array.from({length:47},(_,i)=>'original-'+i)]
  const perform=(args=defaults)=>one('select public.hand_out_course_to_group($1,$2,$3,$4,$5,$6,$7,$8)',args)
  await db.exec('set role authenticated')
  async function refused(index, value, code) {
    const args=[...defaults]; args[index]=value
    await assert.rejects(perform(args),{code})
    assert.equal(await one('select count(*)::int from courses'),1)
  }
  await refused(5,'2000-01-01', 'PT409')
  await refused(6,'[]','PT409')
  await refused(7,['original-0'],'PT409')
  await refused(2,outsider,'42501')
  await refused(2,oldGroup,'22023')
  await db.exec("set qa.mfa='no'")
  await assert.rejects(perform(),{code:'42501'});await db.exec("set qa.mfa='yes'")
  // A collision occurs after content and audience have been written. The whole RPC rolls back.
  await db.query(`insert into schedule_lessons(lesson_id,group_id,node_type,date,time_start,time_end,status)
    select id,$1,'lesson','2027-01-01','10:00','11:30','upcoming' from lessons where short_id='original-0'`,[group])
  await assert.rejects(perform(),{code:'23505'})
  assert.equal(await one('select count(*)::int from courses'),1)
  assert.equal(await one('select count(*)::int from lessons'),47)
  assert.equal(await one('select count(*)::int from course_enrollments'),0)
  await db.query('delete from schedule_lessons where group_id=$1',[group])
  // Invoke the same handler as the confirmation button, using the real SQL RPC in this database.
  const editor=readFileSync('src/pages/teacher/TeacherCourseEditorPage.tsx','utf8')
  const handler=editor.slice(editor.indexOf('  async function runHandout()'),editor.indexOf('  function handleSave('))
  const wired=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
    import { handoutAttempt } from './src/lib/courseGroupHandout'
    export function run(options) {
      const { handoutGroupId, handoutInFlight, handoutDone, course, baselineStamp, publicationPending, saving,
        conflict, unsaved, autosaveEditRevision, editRevision, setHandoutError, t, handoutTitle, confirmedContent,
        isUuid, setHandoutBusy, readScope, handoutStart, handoutRequests, supabase, setHandoutDone, setHandoutOpen,
        window, setTimeout, lessonShortIdById, courseVisibilityReadyForCopy } = options
      ${handler}
      return runHandout()
    }`}, bundle:true,platform:'node',format:'esm',write:false})
  const {run}=await import('data:text/javascript;base64,'+Buffer.from(wired.outputFiles[0].contents).toString('base64'))
  const store=new Map()
  globalThis.sessionStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)}
  const options={
    handoutGroupId:group,handoutInFlight:{current:false},handoutDone:false,
    course:{id:'biology',dbCourseId:'biology',title:'Biology',modules:[]},baselineStamp:{current:stamp},
    publicationPending:false,saving:false,conflict:null,unsaved:{current:false},autosaveEditRevision:{current:0},editRevision:0,
    handoutTitle:'Biology B',confirmedContent:{current:{modules:JSON.parse(modules)}},handoutStart:'2027-01-01',handoutRequests:{current:new Map()},
    readScope:{current:{ownerId:actor}},isUuid:()=>true,t:x=>x,
    lessonShortIdById:Object.fromEntries(defaults[7].map((r,i)=>[i,r])),
    setHandoutError:error=>{options.error=error},setHandoutBusy:v=>{options.busy=v},setHandoutDone:v=>{options.done=v},
    setHandoutOpen:()=>{},window:{dispatchEvent:()=>{}},setTimeout:()=>{}, courseVisibilityReadyForCopy:async()=>true,
  }
  let calls=0, receipt
  options.supabase={rpc:async (name,p)=>{
    assert.equal(name,'hand_out_course_to_group');calls++
    receipt=await perform([p.p_request_id,p.p_source,p.p_group,p.p_title,p.p_start,p.p_stamp,JSON.stringify(p.p_modules),p.p_lesson_refs])
    if(calls===1) throw Error('HTTP timeout after database commit')
    return {data:receipt}
  }}
  options.unsaved.current=true
  await run(options); assert.equal(calls,0)
  options.unsaved.current=false
  await Promise.all([run(options),run(options)])
  assert.equal(calls,1);assert.equal(options.busy,false);assert.ok(options.error);assert.ok(!options.done)
  assert.equal(store.size,1)
  options.handoutRequests.current=new Map() // freshly reopened editor; retry key is in session storage
  await run(options);assert.equal(calls,2);assert.equal(options.done,true);assert.equal(options.error,null);assert.equal(store.size,0)
  assert.equal(options.baselineStamp.current,stamp)
  const copy=receipt
  defaults[0]=copy.request_id
  assert.equal(copy.request_id,defaults[0])
  // Server committed but HTTP receipt was lost. Repeat after the displayed stamp became stale.
  assert.deepEqual(await perform([...defaults.slice(0,5),'2000-01-01',modules,defaults[7]]),copy)
  await assert.rejects(perform(defaults.map((x,i)=>i===3?'different':x)),{code:'22023'})
  assert.notEqual(copy.id,source); assert.equal(await one('select count(*)::int from courses'),2)
  assert.deepEqual(await original(),baseline)
  const target=(await rows('select * from courses where id=$1',[copy.id]))[0]
  assert.equal(target.status,'published'); assert.equal(target.title,'Biology B'); assert.deepEqual(target.group_ids,[group]);assert.deepEqual(target.student_ids,[])
  assert.deepEqual(await rows('select student_id,access_mode from course_enrollments where course_id=$1',[copy.id]),[{student_id:student,access_mode:'by_date'}])
  const lessons=await rows('select * from lessons where course_id=$1 order by position',[copy.id])
  assert.equal(lessons.length,47)
  lessons.forEach((l,i)=>{ assert.equal(l.short_id,copy.short_id+'-'+i); assert.notEqual(l.module_id,mod)
    assert.equal(l.description,'Protected description'); assert.deepEqual(l.timecodes,[{label:'Keep'}]);assert.deepEqual(l.chapter_variants,{future:1})
    assert.deepEqual(l.homework,{hwDate:'04.01.2027',recHwDate:'2027-01-05',extraHw:[{date:'06.01.2027',unknown:7}],hidden:true}) })
  assert.deepEqual(await rows('select node_type,date::text as date,time_start,time_end,lesson_id from schedule_lessons where group_id=$1 order by date',[group]),[
    {node_type:'lesson',date:'2027-01-01',time_start:'10:00',time_end:'11:30',lesson_id:lessons[0].id},
    {node_type:'rec',date:'2027-01-02',time_start:'12:00',time_end:'12:00',lesson_id:lessons[0].id}])
  // Issue a second, intentional stream from a draft copy, with no date shift and a mirrored recording.
  await db.query("update courses set status='draft' where id=$1",[copy.id])
  await db.query("update lessons set rec_date=scheduled_date,rec_time=scheduled_time where id=$1",[lessons[0].id])
  const witness=await one("select greatest(c.updated_at,(select max(updated_at) from lessons where course_id=c.id))::text from courses c where id=$1",[copy.id])
  const roster=await rows('select id,label,position from course_modules where course_id=$1',[copy.id])
  const nested=await perform([randomUUID(),copy.short_id,oldGroup,'New stream',null,witness,JSON.stringify(roster),lessons.map(l=>l.short_id)])
  assert.equal(await one('select status from courses where id=$1',[nested.id]),'draft')
  assert.deepEqual(await rows('select d.node_type,d.date::text as day from schedule_lessons d join lessons l on l.id=d.lesson_id where l.course_id=$1',[nested.id]),[{node_type:'lesson',day:'2027-01-01'}])
  await db.query("select set_config('qa.actor',$1,false)",[outsider])
  assert.equal(await one('select count(*)::int from course_handout_receipts'),0)
  await assert.rejects(perform(),{code:'42501'})
  console.log('PASS handout transaction: actual duplicate/access/schedule functions, 47 lessons, source intact, shifted homework, owner/MFA, stale version, rollback/retry and lost response.')
} finally { await db.close() }
