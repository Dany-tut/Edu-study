import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE || '/tmp/iskra-visibility-test-deps/node_modules/@electric-sql/pglite/dist/index.js').href)
const db = new PGlite()
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222'
const course='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const modA='aaaaaaaa-0000-4000-8000-000000000001',modB='aaaaaaaa-0000-4000-8000-000000000002',modF='bbbbbbbb-0000-4000-8000-000000000001'
const schema=`create role authenticated; create role anon; create role service_role; create schema auth; create schema iskra_history;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function public.mfa_ok() returns boolean language sql stable as $$select coalesce(current_setting('request.mfa',true),'on') <> 'off'$$;
create table courses(id uuid primary key default gen_random_uuid(), short_id text unique, created_by uuid, title text,subject text,level text,description text,status text,color text,bg text,seed_stamp text,number_start int default 1,student_ids uuid[] default '{}',group_ids uuid[] default '{}',updated_at timestamptz default now());
create table course_modules(id uuid primary key default gen_random_uuid(),course_id uuid references courses(id),label text,position int);
create table lessons(id uuid primary key default gen_random_uuid(),course_id uuid references courses(id),module_id uuid references course_modules(id) on delete set null,short_id text unique,title text,position int,lesson_number int,youtube_url text,timecodes jsonb,chapter_variants jsonb,description text,content jsonb,kind text,test_tasks jsonb,materials jsonb,scheduled_date text,scheduled_time text,scheduled_duration int,rec_date text,rec_time text,rec_duration int,lesson_sched_manual boolean,delivery_mode text,homework jsonb,updated_at timestamptz default now());
create table groups(id uuid primary key,created_by uuid); create table students(id uuid primary key,created_by uuid,group_id uuid references groups(id));
create table course_enrollments(course_id uuid references courses(id),student_id text,access_mode text,created_by uuid,primary key(course_id,student_id));
create table lesson_progress(student_id uuid,lesson_ref text,status text);
create table schedule_lessons(id uuid,lesson_id uuid references lessons(id) on delete set null,status text);
create table course_item_visibility(course_id uuid,item_kind text,item_key text,hidden boolean);
create table changes(table_name text,row_id uuid);
create function public.touch() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
create trigger courses_touch before update on courses for each row execute function public.touch();
create trigger lessons_touch before update on lessons for each row execute function public.touch();
create function public.record_change() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.changes values(tg_table_name,old.id); if tg_op='DELETE' then return old; end if; return new; end$$;
create trigger lessons_history before update or delete on lessons for each row execute function public.record_change();
grant usage on schema auth to authenticated,anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
alter table courses enable row level security;
create policy own_courses on courses for all to authenticated using(created_by=auth.uid() and mfa_ok()) with check(created_by=auth.uid() and mfa_ok());
alter table course_modules enable row level security; alter table lessons enable row level security;
create policy own_modules on course_modules for all to authenticated using(exists(select 1 from courses where id=course_id)) with check(exists(select 1 from courses where id=course_id));
create policy own_lessons on lessons for all to authenticated using(exists(select 1 from courses where id=course_id)) with check(exists(select 1 from courses where id=course_id));
insert into courses(id,short_id,created_by,title,status,seed_stamp,number_start,updated_at) values('${course}','qa-course','${owner}','Original','draft','seed-original',63,'2026-01-01Z'),('${foreign}','foreign-course','${other}','Foreign','draft',null,1,'2026-01-01Z');
insert into course_modules values('${modA}','${course}','Module A',0),('${modB}','${course}','Module B',1),('${modF}','${foreign}','Foreign',0);
insert into lesson_progress values('${other}','qa-0','completed');
insert into course_item_visibility values('${course}','module','${modA}',true);`
await db.exec(schema)
// Actual existing access merge, guards and actual preservation trigger, not mocks.
await db.exec(readFileSync(new URL('../../supabase/migrations/20261101091040_course_access_changes.sql',import.meta.url),'utf8'))
const preservation=readFileSync(new URL('../../supabase/migrations/20261122031218_data_preservation_history.sql',import.meta.url),'utf8')
await db.exec(preservation.slice(preservation.indexOf('create function iskra_history.reject_empty_lesson_overwrite()'),preservation.indexOf('-- Product tables only:')))
await db.exec(readFileSync(new URL('../../supabase/migrations/20261122091224_course_content_atomic_save.sql',import.meta.url),'utf8'))
await db.exec(readFileSync(new URL('../../supabase/migrations/20261122092745_course_content_set_based_save.sql',import.meta.url),'utf8'))
async function as(user,mfa='on'){ await db.exec(`reset role;set role authenticated;set request.uid='${user}';set request.mfa='${mfa}';`)}
const rows=async(sql,args=[])=>(await db.query(sql,args)).rows
const lesson=(ref,mod=modA)=>({short_id:ref,module_id:mod,title:ref,position:0,lesson_number:0,youtube_url:'https://example.invalid/lesson',timecodes:[{time:'00:01',label:'Start',seconds:1}],chapter_variants:{source:'video',items:['chapter']},description:'Description',content:{paragraphs:[{text:'Preserved content'}]},kind:'lesson',test_tasks:[],materials:{files:[]},scheduled_date:null,scheduled_time:null,scheduled_duration:null,rec_date:null,rec_time:null,rec_duration:null,lesson_sched_manual:false,delivery_mode:'live',homework:{hwTasks:[{id:'task',text:'Question',answer:'Answer'}]}})
let modules=[{id:modA,label:'Module A',position:0},{id:modB,label:'Module B',position:1}]
let lessons=[lesson('qa-0'),{...lesson('qa-1',modB),position:1,lesson_number:1}]
const fields={title:'Changed',subject:'QA',level:'Test',description:'Save marker',status:'draft',color:'#aabbcc',bg:'#eeeeee'}
let stamp='2026-01-01T00:00:00Z'
const save=async({baseline=stamp,mods=modules,data=lessons,courseFields=fields,changes={}}={})=>(await rows('select save_course_content($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb) result',['qa-course',baseline,JSON.stringify(courseFields),JSON.stringify(mods),JSON.stringify(data),JSON.stringify(changes)]))[0].result
await as(owner)
let result=await save(); stamp=result.stamp
assert.equal(result.lessons.length,2)
const ids=Object.fromEntries(result.lessons.map(l=>[l.title,l.id]))
assert.equal((await rows(`select number_start,seed_stamp from courses where short_id='qa-course'`))[0].number_start,63)
assert.equal((await rows('select hidden from course_item_visibility'))[0].hidden,true)
result=await save(); stamp=result.stamp
assert.equal((await rows('select count(*)::int n from changes'))[0].n,0,'exact unchanged lessons do not fire history or updated_at')
assert.deepEqual(Object.fromEntries(result.lessons.map(l=>[l.title,l.id])),ids)
// Every failure must leave the complete persisted snapshot unchanged.
const snapshot=async()=>JSON.stringify(await rows(`select jsonb_build_object('course',(select to_jsonb(c) from courses c where short_id='qa-course'),'lessons',(select jsonb_agg(to_jsonb(l) order by short_id) from lessons l),'modules',(select jsonb_agg(to_jsonb(m) order by id) from course_modules m),'enrollments',(select jsonb_agg(to_jsonb(e)) from course_enrollments e)) data`))
const fails=async(opts,pattern)=>{const before=await snapshot();await assert.rejects(save(opts),pattern);assert.equal(await snapshot(),before,'transaction rolled back fully')}
await fails({baseline:null},/ISKRA_DATA_PRESERVATION/)
await fails({baseline:'2026-01-01Z'},/ISKRA_COURSE_CONFLICT/)
await fails({mods:[...modules,modules[0]]},/Invalid course module identities/)
await fails({data:[...lessons,lessons[0]]},/Invalid course lesson identities/)
await fails({mods:[{id:modF,label:'Stolen',position:0}]},/Invalid course module identities|Invalid course lesson identities|row-level security/)
await fails({data:[{...lessons[0],module_id:modF}]},/Invalid course lesson identities/)
await fails({courseFields:{...fields,created_by:other}},/Invalid course fields/)
// Access validation happens after content writes, so rejection proves rollback of earlier writes.
await fails({courseFields:{...fields,title:'Must roll back'},changes:{students:{[other]:true}}},/Audience is not owned/)
await fails({data:[{...lessons[0],content:{}},lessons[1]]},/ISKRA_DATA_PRESERVATION/)
// Nonempty -> empty content must still be rejected by the real safety trigger.
// Optional chapter field does not erase it; module reorder retains UUIDs/progress/visibility.
const omitChapter=lessons.map(({chapter_variants,...row})=>row)
result=await save({data:omitChapter,mods:[{...modules[1],position:0},{...modules[0],position:1}]});stamp=result.stamp
assert.deepEqual(Object.fromEntries(result.lessons.map(l=>[l.title,l.id])),ids)
assert.ok((await rows(`select chapter_variants from lessons where short_id='qa-0'`))[0].chapter_variants)
assert.equal((await rows('select status from lesson_progress'))[0].status,'completed')
assert.equal((await rows('select hidden from course_item_visibility'))[0].hidden,true)
// A populated snapshot changes content, adds/removes lessons and moves modules
// without rebuilding surviving lesson IDs or touching progress/visibility.
const modC='aaaaaaaa-0000-4000-8000-000000000003'
modules=[...modules,{id:modC,label:'Module C',position:2}]
lessons=Array.from({length:80},(_,i)=>({...lesson(`qa-${i}`,i%2?modB:modC),position:i,lesson_number:i,description:'Rich lesson '+i,content:{paragraphs:[{text:'Independent QA text '.repeat(600)}]},homework:{hwTasks:Array.from({length:5},(_,j)=>({id:`q-${i}-${j}`,text:'Question '+j,answer:'Answer '+j}))}}))
result=await save();stamp=result.stamp
assert.equal(result.lessons.length,80)
assert.equal(result.lessons[0].id,ids['qa-0'],'content edit retains lesson UUID')
assert.equal(result.lessons[1].id,ids['qa-1'])
assert.equal((await rows(`select count(*)::int n from changes`))[0].n,2,'only changed existing lessons fire history')
const unchanged=await rows(`select id,updated_at from lessons order by short_id`)
result=await save();stamp=result.stamp
assert.deepEqual(await rows(`select id,updated_at from lessons order by short_id`),unchanged,'80 unchanged populated lessons retain stamps')
const beforeDenseIds=Object.fromEntries(result.lessons.map(l=>[l.lesson_number,l.id]))
lessons=lessons.map(l=>({...l,description:l.description+' edited',content:{paragraphs:[{text:'Revised nonempty QA content '+l.short_id}]}}))
result=await save();stamp=result.stamp
assert.deepEqual(Object.fromEntries(result.lessons.map(l=>[l.lesson_number,l.id])),beforeDenseIds,'bulk edit retains all80lesson UUIDs')
assert.equal((await rows(`select count(*)::int n from changes`))[0].n,82,'all80 changed rows are archived,2previous changes retained')
await fails({data:lessons.map((l,i)=>({...l,description:'Must roll back '+i,...(i===79?{content:{}}:{})}))},/ISKRA_DATA_PRESERVATION/)
assert.equal((await rows(`select count(*)::int n from changes`))[0].n,82,'failed bulk update rolls back history too')
lessons=lessons.filter(l=>l.short_id!=='qa-19')
result=await save();stamp=result.stamp
assert.equal(result.lessons.length,79,'intentional lesson removal is version-bound')
assert.equal((await rows('select status from lesson_progress'))[0].status,'completed')
assert.equal((await rows('select hidden from course_item_visibility'))[0].hidden,true)
// Legacy direct writes continue to work; their updated_at must invalidate CAS.
await rows(`update lessons set title='Direct old client' where short_id='qa-0'`)
await fails({},/ISKRA_COURSE_CONFLICT/)
await as(other)
await assert.rejects(save(),/Course not found or not owned/)
await as(owner,'off')
await assert.rejects(save(),/Course not found or not owned/)
await db.exec('reset role;set role anon')
await assert.rejects(save(),/permission denied/)
await db.exec('reset role')
// Existing foreign lesson reference cannot be stolen even if caller owns both courses.
await rows(`insert into lessons(course_id,module_id,short_id,title) values('${foreign}','${modF}','foreign-ref','Foreign lesson')`)
await rows(`update courses set created_by='${owner}' where id='${foreign}'`)
await as(owner)
stamp=(await rows(`select greatest(c.updated_at,(select max(updated_at) from lessons where course_id=c.id)) stamp from courses c where short_id='qa-course'`))[0].stamp
await fails({data:[{...lessons[0],short_id:'foreign-ref'}]},/Invalid course lesson identities/)
console.log('PASS actual atomic SQL + actual access/preservation guards: CAS, missing provenance, owner/foreign/anon/MFA, rollback, field whitelist, stable UUIDs, unchanged rows, chapter omission, progress, visibility, legacy writes, foreign identities')
await db.close()
