import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planCourseSchedule } from '../src/lib/courseScheduleSync.ts'
const { PGlite } = await import(process.env.ISKRA_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
const teacher=id(1), other=id(2), course=id(3), foreignCourse=id(4), group=id(5)
const slot=(n,day)=>({id:id(n),lesson_id:id(n+100),group_id:group,student_id:null,node_type:'lesson',date:`2026-12-${day}`,time_start:'18:00',time_end:'19:30',subject:'bio',lesson_title:`Synthetic ${n}`,lesson_number:n})
const a=slot(10,'01'), b=slot(11,'02'), outsider=slot(12,'10')
const call=(updates=[],inserts=[],removes=[])=>db.query('select public.save_course_schedule($1,$2::jsonb,$3::jsonb,$4::uuid[])',[course,JSON.stringify(updates),JSON.stringify(inserts),removes])
const snapshot=async()=> (await db.query('select id,lesson_id,group_id,student_id,node_type,date::text,time_start,time_end,subject,lesson_title,lesson_number,status from schedule_lessons order by id')).rows
try {
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table courses(id uuid primary key,created_by uuid);
 create table lessons(id uuid primary key,course_id uuid references courses);
 create table groups(id uuid primary key,created_by uuid);
 create table students(id uuid primary key,created_by uuid,group_id uuid references groups);
 create table schedule_lessons(id uuid primary key default gen_random_uuid(),lesson_id uuid references lessons,group_id uuid,student_id uuid,node_type text,date date not null,time_start text not null,time_end text not null,subject text,lesson_title text,lesson_number int,status text,
 constraint schedule_lessons_group_id_date_time_start_key unique(group_id,date,time_start));
 create table teacher_lesson_sessions(schedule_id uuid primary key references schedule_lessons on delete cascade,note text);
 create table analytics_events(created_at timestamptz,role text,path text,event text,meta jsonb,session_id text);
 create function is_admin() returns boolean language sql as $$select auth.uid()='${teacher}'::uuid$$;
 create function analytics_is_real_traffic(jsonb) returns boolean language sql as $$select true$$;
 grant usage on schema public,auth to authenticated;
 grant select,insert,update,delete on all tables in schema public to authenticated;
 alter table courses enable row level security;
 create policy owner on courses to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
 insert into courses values('${course}','${teacher}'),('${foreignCourse}','${other}');
 insert into groups values('${group}','${teacher}');
 insert into lessons values('${a.lesson_id}','${course}'),('${b.lesson_id}','${course}'),('${outsider.lesson_id}','${foreignCourse}'),('${id(113)}','${course}');`)
 for(const row of [a,b,outsider]) await db.query(`insert into schedule_lessons select * from jsonb_populate_record(null::schedule_lessons,$1::jsonb)`,[JSON.stringify({...row,status:'completed'})])
 await db.exec(`insert into teacher_lesson_sessions values('${a.id}','DO NOT LOSE'); set role authenticated; select set_config('request.jwt.claim.sub','${teacher}',false);`)
 // Original immediate uniqueness fails even though both final dates are valid.
 await assert.rejects(db.query('update schedule_lessons set date=case id when $1 then $2::date else $3::date end where id in ($1,$4)',[a.id,'2026-12-02','2026-12-03',b.id]),e=>e.code==='23505')
 await db.exec(readFileSync('supabase/migrations/20261122052719_course_schedule_atomic_and_error_collection.sql','utf8').replace(/^alter table public.schedule_lessons/m,'reset role; alter table public.schedule_lessons'))
 await db.exec(`set role authenticated;`)
 // Already-open clients keep their batched ON CONFLICT(id) path: no reload
 // or browser draft migration is required to get the ordering fix.
 await db.query(`insert into schedule_lessons(id,lesson_id,group_id,date,time_start,time_end)
 values($1,$2,$3,'2026-12-02','18:00','19:30'),($4,$5,$3,'2026-12-03','18:00','19:30')
 on conflict(id) do update set date=excluded.date`,[a.id,a.lesson_id,group,b.id,b.lesson_id])
 assert.equal((await snapshot()).find(r=>r.id===a.id).date,'2026-12-02')

 await call([{...a,date:b.date},{...b,date:'2026-12-03'}])
 let rows=await snapshot(); assert.equal(rows.find(r=>r.id===a.id).date,'2026-12-02');assert.equal(rows.find(r=>r.id===b.id).date,'2026-12-03')
 await call([{...a,date:'2026-12-03'},{...b,date:'2026-12-02'}])
 rows=await snapshot();assert.equal(rows.find(r=>r.id===a.id).date,'2026-12-03');assert.equal(rows.find(r=>r.id===a.id).status,'completed')
 assert.equal((await db.query('select note from teacher_lesson_sessions')).rows[0].note,'DO NOT LOSE')
 const before=await snapshot()
 await assert.rejects(call([{...a,date:outsider.date}]),e=>e.code==='23505'&&e.message.startsWith('ISKRA_SCHEDULE_CONFLICT:'))
 assert.deepEqual(await snapshot(),before,'real conflict rolls back all changes')
 const insert={...slot(13,'04')};delete insert.id
 await assert.rejects(call([{...b,date:'2026-12-05'}],[{...insert,date:'2026-12-05'}]),e=>e.code==='23505')
 assert.deepEqual(await snapshot(),before,'duplicate desired dates roll back the whole plan')
 await assert.rejects(call([{...outsider,date:'2026-12-07'}]),e=>e.code==='42501')
 await assert.rejects(call([],[],[outsider.id]),e=>e.code==='42501')
 await call([],[],[a.id]);assert.deepEqual(await snapshot(),before,'journal owner/history survives removal')
 await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`)
 await assert.rejects(call([{...b,date:'2026-12-06'}]),e=>e.code==='42501')
 await db.exec(`select set_config('request.jwt.claim.sub','${teacher}',false)`)
 await call([], [insert]);const afterInsert=await snapshot();const inserted=afterInsert.find(r=>r.lesson_id===insert.lesson_id)
 assert.ok(inserted);assert.equal(inserted.status,'upcoming')
 const ownSlots=afterInsert.filter(r=>r.lesson_id!==outsider.lesson_id)
 const retryPlan=planCourseSchedule(ownSlots,ownSlots.map(({id,status,...row})=>row))
 assert.deepEqual(retryPlan,{insert:[],update:[],removeBeforeWrite:[],remove:[]},'retry after lost response reuses persisted IDs instead of inserting duplicates')
 await call(retryPlan.update,retryPlan.insert,retryPlan.remove)
 const beforeDeleteConflict=await snapshot()
 await assert.rejects(call([{...a,date:outsider.date}],[],[inserted.id]),e=>e.code==='23505')
 assert.deepEqual(await snapshot(),beforeDeleteConflict,'failed transaction restores a deleted upcoming event')
 await call([],[],[inserted.id]);assert.deepEqual(await snapshot(),before)
 await call();assert.deepEqual(await snapshot(),before,'empty/repeated plan is harmless')
 await db.exec(`insert into analytics_events values(now(),'teacher','#/teacher/constructor','db_error','{"ctx":"course_save:schedule","msg":"synthetic conflict","line":"bad"}','synthetic-session')`)
 const errors=await db.query('select * from admin_recent_errors(50)');assert.equal(errors.rows[0].event,'db_error');assert.equal(errors.rows[0].src,'course_save:schedule');assert.equal(errors.rows[0].line,null)
 await db.exec('reset role; set role anon')
 await assert.rejects(call(),e=>e.code==='42501')
 await assert.rejects(db.query('select * from admin_recent_errors(50)'),e=>e.code==='42501')
 console.log('PASS: original failure reproduced; atomic chain/swap; true/foreign conflict rollback; stable IDs/status/journal; scope/RLS/anonymous denial; insert/remove/retry; db_error admin collection')
} finally { await db.close() }
