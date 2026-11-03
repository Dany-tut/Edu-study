// Production opt-in: only synthetic bookkeeping/attendance, no real money.
// Real localhost Supabase Auth/PostgREST/Storage tests. Never accepts a remote URL.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
assert.equal(process.env.ISKRA_PRODUCTION_TEST,'approved-isolated-fixture','Explicit production fixture opt-in required')
const root=fileURLToPath(new URL('../../node_modules/.cache/final-platform/balance-',import.meta.url))+(process.env.QA_BALANCE_TAG||'regression')
mkdirSync(root,{recursive:true})
const keys=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref','igsdwvwiqnozgwczzycx','-o','json'],{stdio:['ignore','pipe','ignore']}))
const url='https://igsdwvwiqnozgwczzycx.supabase.co',anon=keys.find(x=>x.name==='anon').api_key,service=keys.find(x=>x.name==='service_role').api_key
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
 await ok(serviceClient.auth.admin.createUser({email,password,email_confirm:true,...(appRole?{app_metadata:{role:appRole}}:{}),user_metadata:{name:`QA ${label}`,role:'admin'}}))
 const c=client();const auth=await ok(c.auth.signInWithPassword({email,password}))
 assert.ok(auth.session, `${label} needs a real Auth session`)
 actors[label]=c;state.accounts[label]={email,password,id:auth.user.id};writeFileSync(root+'/fixture-private.json',JSON.stringify(state),{mode:0o600})
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

 const a=state.rows.A, teacher=actors.teacherA
 const second=await row(teacher,'students',{name:'QA Balance Second',group_id:a.group.id});state.rows.C={student:second}
 await ok(teacher.from('payments').delete().eq('student_id',a.student.id));await ok(teacher.from('lesson_attendance').delete().in('student_id',[a.student.id,second.id]));await ok(teacher.from('students').update({lesson_balance:10}).in('id',[a.student.id,second.id]))
 const balances=async()=>{const r=await ok(teacher.from('students').select('id,lesson_balance').in('id',[a.student.id,second.id]));return [r.find(x=>x.id===a.student.id).lesson_balance,r.find(x=>x.id===second.id).lesson_balance]}
 let payment=await row(teacher,'payments',{student_id:a.student.id,teacher_id:state.accounts.teacherA.id,amount:1234,lessons_paid:2,note:'QA balance delta'})
 await test('payment insert adds only its credit to manual baseline',async()=>assert.deepEqual(await balances(),[12,10]))
 await test('payment count correction applies delta',async()=>{await ok(teacher.from('payments').update({lessons_paid:5}).eq('id',payment.id));assert.deepEqual(await balances(),[15,10])})
 await test('payment reassignment moves credit between own pupils',async()=>{await ok(teacher.from('payments').update({student_id:second.id}).eq('id',payment.id));assert.deepEqual(await balances(),[10,15])})
 await test('payment deletion reverses its credit without erasing manual baseline',async()=>{await ok(teacher.from('payments').delete().eq('id',payment.id));assert.deepEqual(await balances(),[10,10])})
 await test('negative purchased lesson count is rejected on server',async()=>{const id=randomUUID();const r=await teacher.from('payments').insert({id,student_id:a.student.id,teacher_id:state.accounts.teacherA.id,amount:1,lessons_paid:-1});if(!r.error)await ok(serviceClient.from('payments').delete().eq('id',id));assert.ok(r.error,'Negative lessons accepted');assert.equal(r.error.code,'23514')})
 await ok(teacher.from('students').update({lesson_balance:10}).in('id',[a.student.id,second.id]))
 const attendance=await row(teacher,'lesson_attendance',{student_id:a.student.id,group_id:a.group.id,lesson_date:'2026-11-07',present:true,lesson_title:'QA balance attendance'})
 await test('attendance consumes one prepaid lesson',async()=>assert.deepEqual(await balances(),[9,10]))
 await test('attendance correction restores then consumes exactly once',async()=>{await ok(teacher.from('lesson_attendance').update({present:false}).eq('id',attendance.id));assert.deepEqual(await balances(),[10,10]);await ok(teacher.from('lesson_attendance').update({present:true}).eq('id',attendance.id));await ok(teacher.from('lesson_attendance').update({present:true}).eq('id',attendance.id));assert.deepEqual(await balances(),[9,10])})
 await test('attendance reassignment transfers consumption between own pupils',async()=>{await ok(teacher.from('lesson_attendance').update({student_id:second.id}).eq('id',attendance.id));assert.deepEqual(await balances(),[10,9])})
 await test('attendance deletion reverses consumption',async()=>{await ok(teacher.from('lesson_attendance').delete().eq('id',attendance.id));assert.deepEqual(await balances(),[10,10])})
 await test('foreign teacher cannot forge attendance using own group and foreign pupil',async()=>{const id=randomUUID();const r=await actors.teacherB.from('lesson_attendance').insert({id,student_id:a.student.id,group_id:state.rows.B.group.id,lesson_date:'2026-11-08',present:true});if(!r.error)await ok(serviceClient.from('lesson_attendance').delete().eq('id',id));assertDenied(r)})
 await test('learner cannot forge attendance',async()=>{const id=randomUUID();const r=await actors.studentA.from('lesson_attendance').insert({id,student_id:a.student.id,group_id:a.group.id,lesson_date:'2026-11-09',present:true});if(!r.error)await ok(serviceClient.from('lesson_attendance').delete().eq('id',id));assertDenied(r)})
 await ok(teacher.from('students').update({lesson_balance:10}).in('id',[a.student.id,second.id]))
 await test('concurrent payments and deletes preserve exact credit total',async()=>{const ids=[randomUUID(),randomUUID()];await Promise.all(ids.map(id=>ok(teacher.from('payments').insert({id,student_id:a.student.id,teacher_id:state.accounts.teacherA.id,amount:1,lessons_paid:2}))));assert.deepEqual(await balances(),[14,10]);await Promise.all(ids.map(id=>ok(teacher.from('payments').delete().eq('id',id))));assert.deepEqual(await balances(),[10,10])})

 await test('group ownership alone cannot read another teacher pupil attendance',async()=>{const id=randomUUID();await row(serviceClient,'lesson_attendance',{id,student_id:a.student.id,group_id:state.rows.B.group.id,lesson_date:'2026-11-10',present:false});try{const r=await actors.teacherB.from('lesson_attendance').select('id').eq('id',id);assertDeniedOrEmpty(r)}finally{await ok(serviceClient.from('lesson_attendance').delete().eq('id',id))}})
 await test('deleting own pupil cascades payment and attendance without changing another balance',async()=>{const payment=await row(teacher,'payments',{student_id:second.id,teacher_id:state.accounts.teacherA.id,amount:1,lessons_paid:2});const event=await row(teacher,'lesson_attendance',{student_id:second.id,group_id:a.group.id,lesson_date:'2026-11-11',present:true});await ok(teacher.from('students').delete().eq('id',second.id));assert.equal((await ok(teacher.from('payments').select('id').eq('id',payment.id))).length,0);assert.equal((await ok(teacher.from('lesson_attendance').select('id').eq('id',event.id))).length,0);assert.equal((await ok(teacher.from('students').select('lesson_balance').eq('id',a.student.id).single())).lesson_balance,10)})
} catch(e) {results.push({name:'setup',status:'FAIL',error:e.message});console.error('Setup failed:',e.message)}
mkdirSync(`${root}/evidence`,{recursive:true});writeFileSync(`${root}/evidence/api-matrix.json`,JSON.stringify({scope:'Real production API Auth/PostgREST/Storage. Five synthetic identities; only owned IDs. API not UI acceptance',results},null,2))
console.log(`${results.filter(r=>r.status==='PASS').length} PASS; ${results.filter(r=>r.status==='FAIL').length} FAIL`)
if(results.some(r=>r.status==='FAIL')) process.exitCode=1

const cleanup={failures:[]};const clean=async(name,fn)=>{try{await ok(fn());cleanup[name]='PASS'}catch(e){cleanup.failures.push({name,error:e.message});process.exitCode=1}}
for(const suffix of ['A','B']){
const tid=state.accounts['teacher'+suffix]?.id,sid=state.accounts['student'+suffix]?.id
if(sid){const list=await serviceClient.storage.from('homework-photos').list(sid);for(const folder of list.data||[]){const files=await serviceClient.storage.from('homework-photos').list(sid+'/'+folder.name);if(files.data?.length)await clean('photos-'+suffix,()=>serviceClient.storage.from('homework-photos').remove(files.data.map(f=>sid+'/'+folder.name+'/'+f.name)))}}
if(tid){const groups=await serviceClient.from('groups').select('id').eq('created_by',tid);const gid=(groups.data||[]).map(r=>r.id);const students=await serviceClient.from('students').select('id').eq('created_by',tid);const ids=(students.data||[]).map(r=>r.id)
if(gid.length){const extra=await serviceClient.from('students').select('id').in('group_id',gid);ids.push(...(extra.data||[]).map(r=>r.id))}
if(ids.length)await clean('attendance-'+suffix,()=>serviceClient.from('lesson_attendance').delete().in('student_id',ids))
if(ids.length)await clean('progress-'+suffix,()=>serviceClient.from('lesson_progress').delete().in('student_id',ids))
await clean('payments-'+suffix,()=>serviceClient.from('payments').delete().eq('teacher_id',tid))
if(gid.length)await clean('schedule-'+suffix,()=>serviceClient.from('schedule_lessons').delete().in('group_id',gid))
await clean('homework-'+suffix,()=>serviceClient.from('homework').delete().eq('created_by',tid))
await clean('courses-'+suffix,()=>serviceClient.from('courses').delete().eq('created_by',tid))
if(ids.length)await clean('students-'+suffix,()=>serviceClient.from('students').delete().in('id',ids))
if(gid.length)await clean('groups-'+suffix,()=>serviceClient.from('groups').delete().in('id',gid))
}}
for(const [label,account] of Object.entries(state.accounts)){await clean('invites-'+label,()=>serviceClient.from('teacher_invites').delete().eq('email',account.email));await clean('auth-'+label,async()=>{const r=await serviceClient.auth.admin.getUserById(account.id);assert.equal(r.data.user.email,account.email.toLowerCase());return serviceClient.auth.admin.deleteUser(account.id)})}
const recipients=[...Object.values(state.accounts).map(x=>x.id),...Object.values(state.rows).map(x=>x.student.id)];if(recipients.length)await clean('notifications',()=>serviceClient.from('notifications').delete().in('recipient_id',recipients))
writeFileSync(root+'/cleanup.json',JSON.stringify(cleanup,null,2));console.log('cleanup failures',cleanup.failures.length)
