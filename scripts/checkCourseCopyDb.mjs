import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const { PGlite } = await import(process.env.ISKRA_PGLITE_MODULE ?? '@electric-sql/pglite')
const db = new PGlite()
const actor = randomUUID(), recipient = randomUUID(), source = randomUUID(), moduleId = randomUUID()
const scalar = async (sql, args = []) => Object.values((await db.query(sql,args)).rows[0])[0]
const file = name => readFileSync('supabase/migrations/'+name,'utf8')
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('qa.actor',true),'')::uuid $$;
    create function public.is_admin() returns boolean language sql as $$ select coalesce(current_setting('qa.admin',true)='yes',false) $$;
    create function public.is_staff() returns boolean language sql as $$ select current_setting('qa.staff',true)='yes' $$;
    create function public.mfa_ok() returns boolean language sql as $$ select current_setting('qa.mfa',true)='yes' $$;
    create function public.my_course_ids() returns uuid[] language sql as $$ select '{}'::uuid[] $$;
    create table courses(id uuid primary key default gen_random_uuid(),short_id text unique,created_by uuid,kind text,title text,
      created_at timestamptz default now(),subject text,level text,description text,status text,color text,bg text,
      number_start int default 1,group_ids uuid[],student_ids uuid[],seed_stamp text,published_at timestamptz);
    create table course_modules(id uuid primary key default gen_random_uuid(),course_id uuid references courses,label text,position int);
    create table lessons(id uuid primary key default gen_random_uuid(),course_id uuid references courses,
      module_id uuid references course_modules,short_id text unique,title text,position int,lesson_number int,kind text,shape jsonb,
      trainer_id uuid,widget_id uuid,test_tasks jsonb,content jsonb,youtube_url text,description text,timecodes jsonb,
      chapter_variants jsonb,homework jsonb,materials jsonb,scheduled_date text,scheduled_time text,scheduled_duration int,
      rec_date text,rec_time text,rec_duration int,lesson_sched_manual boolean,delivery_mode text default 'live');
    create table course_item_visibility(course_id uuid references courses, item_kind text,item_key text,hidden boolean,
      primary key(course_id,item_kind,item_key));
    set qa.staff='yes'; set qa.mfa='yes';
  `)
  await db.query("select set_config('qa.actor',$1,false)",[actor])
  await db.query("insert into courses(id,short_id,created_by,title,status,number_start,group_ids,student_ids,seed_stamp,published_at) values($1,'src',$2,'Biology','published',63,array[gen_random_uuid()],array[gen_random_uuid()],'seed',now())",[source,actor])
  await db.query("insert into course_modules values($1,$2,'Unit',1)",[moduleId,source])
  await db.query(`insert into lessons(course_id,module_id,short_id,title,position,description,timecodes,chapter_variants,content,
    homework,materials,delivery_mode,rec_date,rec_time,scheduled_date,scheduled_time,scheduled_duration,rec_duration)
    values($1,$2,'old-x','Protected',0,'description','[{"label":"chapter"}]','{"active":"a"}',
      '{"paragraphs":[{"id":"old-x-p1","text":"one","unknown":8},{"id":"custom","origin":"recap"}],"future":true}',
      '{"hwTasks":[{"future":true}]}','{"notebook":[{"path":"fixture/file"}]}','recorded','2026-11-25','14:00','2026-11-24','10:00',90,60),
      ($1,null,'old-y','Loose',1,null,null,null,'{"paragraphs":[]}',null,null,'live',null,null,null,null,null,null)`,[source,moduleId])
  await db.query("insert into course_item_visibility values($1,'module',$2,true),($1,'lesson','old-x',true)",[source,moduleId])
  const sourceRows=()=>db.query('select * from lessons where course_id=$1 order by position',[source]).then(r=>r.rows)
  const initial=await sourceRows()
  await db.exec(file('0022_course_duplicate.sql'))
  await db.exec(file('0109_teacher_duplicate_course_widget_owner.sql').split('-- 2.')[0])
  await db.exec(file('20261123090000_course_copy_snapshot.sql'))
  const request=(src,owner,title,req)=>scalar('select request_course_copy($1,$2,$3,$4)',[src,owner,title,req])
  await db.exec('set role anon')
  await assert.rejects(db.query("select request_course_copy('src',null,'Anon',$1)",[randomUUID()]),{code:'42501'})
  await db.exec('reset role; set role authenticated')
  const op=randomUUID()
  const copy=await request('src',null,'First',op)
  assert.equal(await request('src',null,'First',op),copy)
  await assert.rejects(request(source,recipient,null,randomUUID()), {code:'42501'})
  await assert.rejects(db.query('select * from course_copy_receipts'),{code:'42501'})
  await assert.rejects(db.query('select duplicate_course($1,$2)',[source,recipient]),{code:'42501'})
  await db.exec("set qa.mfa='no'")
  await assert.rejects(request('src',null,'First',op),{code:'42501'})
  await db.exec("set qa.mfa='yes'")
  await db.query("select set_config('qa.actor',$1,false)",[recipient])
  await assert.rejects(request('src',null,'First',op),{code:'42501'})
  await db.query("select set_config('qa.actor',$1,false)",[actor])
  await db.exec("set qa.admin='yes'")
  await assert.rejects(request(source,recipient,null,op),/mismatch/)
  const adminOp=randomUUID()
  const adminCopy=await request(source,recipient,null,adminOp)
  assert.equal(await request(source,recipient,null,adminOp),adminCopy)
  const explicit=await request('src',null,'Another copy',randomUUID())
  assert.notEqual(explicit,copy)
  const legacy=await scalar("select id from duplicate_my_course('src','Legacy')")
  const legacyAdmin=await scalar('select admin_duplicate_course($1,$2)',[source,recipient])
  await db.exec('reset role')
  const copies=[copy,adminCopy,explicit,legacy,legacyAdmin]
  const refs = new Set()
  for (const id of copies) {
    const row=(await db.query('select * from courses where id=$1',[id])).rows[0]
    assert.equal(row.created_by,[adminCopy,legacyAdmin].includes(id)?recipient:actor)
    assert.equal(row.status,'draft'); assert.equal(row.number_start,63)
    assert.deepEqual(row.group_ids,[]);assert.deepEqual(row.student_ids,[]);assert.equal(row.published_at,null);assert.equal(row.seed_stamp,null)
    const rows=(await db.query('select * from lessons where course_id=$1 order by position',[id])).rows
    assert.equal(rows.length,2)
    assert.ok(rows[0].module_id && rows[0].module_id!==moduleId)
    assert.equal(rows[1].module_id,null)
    rows.forEach((lesson,i)=>{
      assert.ok(!refs.has(lesson.short_id)); refs.add(lesson.short_id)
      assert.equal(lesson.short_id,row.short_id+'-'+i)
      assert.notEqual(lesson.id,initial[i].id)
      const expected={...initial[i],id:lesson.id,short_id:lesson.short_id,course_id:id,module_id:lesson.module_id}
      if(i===0) expected.content={...expected.content, paragraphs:[{...expected.content.paragraphs[0],id:lesson.short_id+'-p1'},expected.content.paragraphs[1]]}
      assert.deepEqual(lesson,expected)
    })
    const flags=(await db.query('select item_key from course_item_visibility where course_id=$1 and hidden order by item_kind',[id])).rows
    assert.deepEqual(flags.map(x=>x.item_key),[rows[0].short_id,rows[0].module_id])
  }
  assert.equal(await scalar('select count(*)::int from courses'),1+copies.length)
  assert.deepEqual(await sourceRows(),initial)
  console.log('PASS course copy: all content fields, generated refs, raw JSON, visibility, separate audience, old/new teacher and admin, retry/explicit repeat, ACL and unchanged source')
} finally { await db.close() }
