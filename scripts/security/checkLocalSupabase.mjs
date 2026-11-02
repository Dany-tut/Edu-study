// Real localhost Supabase Auth/PostgREST/Storage tests. Never accepts a remote URL.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
const root = process.env.ISKRA_LOCAL_DIR || '/tmp/iskra-local-security'
const cfg = JSON.parse(readFileSync(`${root}/status.json`,'utf8'))
const url = cfg.API_URL
if (!['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw Error('Localhost only')
const anon = cfg.ANON_KEY, service = cfg.SERVICE_ROLE_KEY
if (!anon || !service) throw Error('Local status needs ANON_KEY and SERVICE_ROLE_KEY')
const client = (key = anon) => createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}})
const serviceClient=client(service), actors={anon:client()}, state={url,accounts:{},rows:{}}
const results=[]
async function test(name,fn) {try{await fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message)}}
async function ok(result) {const r=await result;if(r.error)throw Error(`${r.error.code??r.error.status??''} ${r.error.message}`);return r.data}
function assertDenied(result) { assert.ok(result.error,'Operation unexpectedly allowed'); assert.ok(['42501','P0001'].includes(result.error.code),`Expected authorization denial, got ${result.error.code}: ${result.error.message}`) }
function assertDeniedOrEmpty(result) { if(result.error) assertDenied(result); else assert.equal(result.data.length,0) }
async function row(c,table,data) {return (await ok(c.from(table).insert(data).select().single()))}
const stamp=Date.now()
async function account(label,appRole) {
 const email=`local-${label}-${stamp}@example.invalid`, password=randomUUID().replaceAll('-','')
 if(appRole) await ok(serviceClient.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{role:appRole},user_metadata:{name:`QA ${label}`}}))
 const c=client();const auth=await ok(appRole ? c.auth.signInWithPassword({email,password}) : c.auth.signUp({email,password,options:{data:{role:'admin',name:`QA ${label}`}}}))
 assert.ok(auth.session, `${label} needs a real Auth session`)
 actors[label]=c;state.accounts[label]={email,password,id:auth.user.id}
 return auth.user.id
}
async function visible(c,table,id) {const key=table==='teacher_lesson_sessions'?'schedule_id':'id';const r=await c.from(table).select(key).eq(key,id);if(r.error){assert.ok(['42501','PGRST301'].includes(r.error.code),r.error.message);return false}return r.data.length>0}
try {
 await account('admin','admin')
 for(const label of ['teacherA','teacherB']) {
  const id=await account(label)
  const before=await ok(actors[label].from('profiles').select('role').eq('id',id).single())
  assert.equal(before.role,'student','signup metadata must not grant staff')
  const token=await ok(actors.admin.rpc('admin_create_teacher_invite',{p_email:state.accounts[label].email,p_hidden_tabs:[],p_hidden_widgets:[],p_course_assignments:[],p_group_ids:[],p_subjects:['chemistry']}))
  await ok(actors[label].rpc('apply_teacher_invite',{p_token:token}))
  await ok(actors[label].rpc('apply_teacher_invite',{p_token:token}))
  assert.equal((await ok(actors[label].from('profiles').select('role').eq('id',id).single())).role,'teacher')
 }
 for(const suffix of ['A','B']) {
  const teacher=actors[`teacher${suffix}`]
  const group=await row(teacher,'groups',{name:`QA group ${suffix}`,subject:'Химия',created_by:state.accounts[`teacher${suffix}`].id})
  const student=await row(teacher,'students',{name:`QA student ${suffix}`,group_id:group.id})
  const course=await row(teacher,'courses',{title:`QA Course ${suffix}`,subject:'Химия',status:'published',group_ids:[group.id],created_by:state.accounts[`teacher${suffix}`].id})
  const lesson=await row(teacher,'lessons',{course_id:course.id,title:`QA Homework ${suffix}`,short_id:`qa-${stamp}-${suffix}`,lesson_number:1,scheduled_date:'01.01.2020',scheduled_time:'10:00',homework:{tasks:[{id:'short',type:'input',question:'Сколько будет 2 + 2?',answer:'4'},{id:'long',type:'extended',question:'Объясните ответ одним предложением.',isHard:false}]}})
  const homework=await row(teacher,'homework',{title:`QA Homework ${suffix}`,group_id:group.id,lesson_id:lesson.id,created_by:state.accounts[`teacher${suffix}`].id,basic_tasks:[{id:'short',type:'input',question:'2 + 2',answer:'4'}]})
  await account(`student${suffix}`)
  await ok(actors[`student${suffix}`].rpc('claim_student_account',{p_token:student.invite_token,p_email:state.accounts[`student${suffix}`].email}))
  await ok(teacher.rpc('save_course_access_changes',{p_course:course.id,p_changes:{students:{[student.id]:true},modes:{[student.id]:'full'}}}))
  const schedule=await row(teacher,'schedule_lessons',{group_id:group.id,student_id:student.id,lesson_id:lesson.id,date:'2026-11-02',time_start:'10:00',subject:'Химия',lesson_title:lesson.title,lesson_number:1})
  const journal=await row(teacher,'teacher_lesson_sessions',{schedule_id:schedule.id,owner_id:state.accounts[`teacher${suffix}`].id,attendance:{[student.id]:true}})
  const payment=await row(teacher,'payments',{student_id:student.id,teacher_id:state.accounts[`teacher${suffix}`].id,amount:1000,lessons_paid:1,note:'synthetic'})
  state.rows[suffix]={group,student,course,lesson,homework,schedule,journal,payment}
 }
 for(const [label,c] of Object.entries(actors)) {
  for(const suffix of ['A','B']) {
   const r=state.rows[suffix], owns=label==='admin'||label.endsWith(suffix), staff=label==='admin'||label===`teacher${suffix}`
   for(const table of ['students','courses','homework','schedule_lessons','payments','teacher_lesson_sessions']) {
    const id=table==='students'?r.student.id:table==='courses'?r.course.id:table==='homework'?r.homework.id:table==='schedule_lessons'?r.schedule.id:table==='payments'?r.payment.id:r.journal.schedule_id
    const expected=table==='teacher_lesson_sessions'?label===`teacher${suffix}`:table==='payments'?staff:owns
    await test(`${label} SELECT ${table} ${suffix}`,async()=>assert.equal(await visible(c,table,id),expected))
   }
  }
 }
 for(const label of ['anon','studentA','studentB','teacherB']) {
  const c=actors[label], r=state.rows.A
  await test(`${label} cannot mutate A student`,async()=>{const res=await c.from('students').update({comment:'unauthorized'}).eq('id',r.student.id).select('id');assertDeniedOrEmpty(res)})
  await test(`${label} cannot mutate A homework`,async()=>{const res=await c.from('homework').update({title:'unauthorized'}).eq('id',r.homework.id).select('id');assertDeniedOrEmpty(res)})
  await test(`${label} cannot use A course-access RPC`,async()=>assertDenied(await c.rpc('save_course_access_changes',{p_course:r.course.id,p_changes:{}})))
 }
 await test('student cannot self-promote',async()=>assert.ok((await actors.studentA.from('profiles').update({role:'teacher'}).eq('id',state.accounts.studentA.id)).error))
 await test('owner cannot rebind student to admin Auth',async()=>assert.ok((await actors.teacherA.from('students').update({auth_user_id:state.accounts.admin.id}).eq('id',state.rows.A.student.id)).error))
 for(const label of ['studentA','teacherB']) await test(`${label} cannot create forged payment for A`,async()=>{
  const id=randomUUID();const res=await actors[label].from('payments').insert({id,student_id:state.rows.A.student.id,teacher_id:state.accounts[label].id,amount:1,lessons_paid:0})
  if(!res.error)await serviceClient.from('payments').delete().eq('id',id)
  assertDenied(res)
 })
 const a=state.rows.A, learner=actors.studentA, teacher=actors.teacherA
 const attemptId=randomUUID()
 const draft={v:'basic-1',draft:true,attemptId,recommendationScore:70,reviewRequired:true,rows:[{id:'short',type:'input',question:'2 + 2',answer:'4',correct:'4',verdict:'correct'},{id:'long',type:'extended',question:'Объясните',answer:'Четыре — сумма двух пар.',verdict:'review'}]}
 const patch={student_id:a.student.id,lesson_ref:a.lesson.short_id,subject:'Химия',status:'current',score:null,attachments:draft}
 await test('student saves draft and reads it after fresh login',async()=>{
  await ok(learner.from('lesson_progress').upsert(patch,{onConflict:'student_id,lesson_ref'}))
  const fresh=client();await ok(fresh.auth.signInWithPassword(state.accounts.studentA));
  const stored=await ok(fresh.from('lesson_progress').select('attachments').eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id).single());assert.equal(stored.attachments.rows[1].answer,draft.rows[1].answer)
 })
 await test('student submits once, duplicate submission keeps one attempt',async()=>{
  const submitted={...patch,status:'submitted',attachments:{...draft,draft:false}}
  await ok(learner.from('lesson_progress').upsert(submitted,{onConflict:'student_id,lesson_ref'}));await ok(learner.from('lesson_progress').upsert(submitted,{onConflict:'student_id,lesson_ref'}))
  const rows=await ok(teacher.from('homework_attempts').select('id').eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id));assert.equal(rows.length,1);assert.equal(rows[0].id,attemptId)
 })
 await test('foreign students and teachers cannot read or grade A attempt',async()=>{
  for(const c of [actors.studentB,actors.teacherB]) {
   assert.equal((await ok(c.from('homework_attempts').select('id').eq('id',attemptId))).length,0)
   const res=await c.from('lesson_progress').update({score:100,status:'completed'}).eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id).select('id');assertDeniedOrEmpty(res)
  }
 })
 await test('teacher grades; learner sees final result after new session',async()=>{
  const stored=await ok(teacher.from('lesson_progress').select('attachments').eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id).single())
  await ok(teacher.from('lesson_progress').update({score:90,status:'completed',review_comment:'Синтетическая проверка',attachments:{...stored.attachments,rows:stored.attachments.rows.map(r=>({...r,verdict:'correct'}))}}).eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id))
  const fresh=client();await ok(fresh.auth.signInWithPassword({email:state.accounts.studentA.email,password:state.accounts.studentA.password}));
  const stored2=await ok(fresh.from('lesson_progress').select('status,score,review_comment').eq('student_id',a.student.id).eq('lesson_ref',a.lesson.short_id).single());assert.equal(stored2.score,90);assert.equal(stored2.status,'completed')
 })
 const photoPath=`${state.accounts.studentA.id}/${a.student.id}/synthetic-${stamp}.png`
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')
 await test('student uploads own photo',async()=>ok(learner.storage.from('homework-photos').upload(photoPath,png,{contentType:'image/png',upsert:false})))
 for(const [label,c] of Object.entries(actors)) await test(`${label} photo signed URL`,async()=>{
  const res=await c.storage.from('homework-photos').createSignedUrl(photoPath,60)
  const expected=['studentA','teacherA','admin'].includes(label);assert.equal(!res.error,expected,res.error?.message)
 })
 await test('student cannot upload under another student identity',async()=>assert.ok((await learner.storage.from('homework-photos').upload(`${state.accounts.studentB.id}/${state.rows.B.student.id}/forged.png`,png,{contentType:'image/png'})).error))
 await test('chosen password absent in public table',async()=>assert.equal((await ok(serviceClient.from('students').select('temp_password').eq('id',a.student.id).single())).temp_password,null))
 await test('invalid JWT is rejected',async()=>{
  const res=await fetch(`${url}/rest/v1/students?select=id`,{headers:{apikey:anon,Authorization:'Bearer invalid'}});assert.equal(res.status,401)
 })
 mkdirSync(`${root}/evidence`,{recursive:true});writeFileSync(`${root}/fixture.json`,JSON.stringify(state,null,2));chmodSync(`${root}/fixture.json`,0o600)
} catch(e) {results.push({name:'setup',status:'FAIL',error:e.message});console.error('Setup failed:',e.message)}
mkdirSync(`${root}/evidence`,{recursive:true});writeFileSync(`${root}/evidence/api-matrix.json`,JSON.stringify({scope:'Real local Supabase Auth/PostgREST/Storage; snapshot baseline plus forward migrations',results},null,2))
console.log(`${results.filter(r=>r.status==='PASS').length} PASS; ${results.filter(r=>r.status==='FAIL').length} FAIL`)
if(results.some(r=>r.status==='FAIL')) process.exitCode=1
