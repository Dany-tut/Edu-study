// Local-only fixtures and API assertions for the mobile review browser walk-through.
import {createClient} from '@supabase/supabase-js'
import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security'
const dir=process.env.ISKRA_MOBILE_REVIEW_DIR||'/tmp/iskra-mobile-review-local'
const cfg=JSON.parse(readFileSync(root+'/status.json','utf8'))
assert.ok(['localhost','127.0.0.1'].includes(new URL(cfg.API_URL).hostname),'Local API only')
const make=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const admin=make(cfg.SERVICE_ROLE_KEY),teacher=make(cfg.ANON_KEY),student=make(cfg.ANON_KEY)
const ok=async value=>{const r=await value;if(r.error)throw new Error(`${r.error.code||r.error.status||''} ${r.error.message}`);return r.data}
const row=(c,t,data)=>ok(c.from(t).insert(data).select().single())
const results=[]
const pass=name=>{results.push({name,status:'PASS'});console.log('PASS:',name)}
const command=process.argv[2]||'setup'
mkdirSync(dir,{recursive:true})
let f
try {
 if(command==='setup') {
  const stamp=Date.now()
  const teacherCredentials={email:`mobile-review-teacher-${stamp}@example.invalid`,password:randomUUID().replaceAll('-','')}
  const studentCredentials={email:`mobile-review-student-${stamp}@example.invalid`,password:randomUUID().replaceAll('-','')}
  const baseline=JSON.parse(readFileSync(root+'/fixture.json','utf8')),inviter=make(cfg.ANON_KEY)
  await ok(inviter.auth.signInWithPassword(baseline.accounts.admin))
  const teacherAuth=await ok(admin.auth.admin.createUser({...teacherCredentials,email_confirm:true,user_metadata:{name:'QA Mobile Teacher'}}))
  await ok(teacher.auth.signInWithPassword(teacherCredentials))
  const invite=await ok(inviter.rpc('admin_create_teacher_invite',{p_email:teacherCredentials.email,p_hidden_tabs:[],p_hidden_widgets:[],p_course_assignments:[],p_group_ids:[],p_subjects:['chemistry']}))
  await ok(teacher.rpc('apply_teacher_invite',{p_token:invite}))
  const group=await row(teacher,'groups',{name:'QA Mobile Review Group',subject:'Химия',created_by:teacherAuth.user.id})
  const pupil=await row(teacher,'students',{name:'QA Mobile Review Learner',group_id:group.id})
  await ok(admin.auth.admin.createUser({...studentCredentials,email_confirm:true,user_metadata:{name:pupil.name}}))
  await ok(student.auth.signInWithPassword(studentCredentials))
  await ok(student.rpc('claim_student_account',{p_token:pupil.invite_token,p_email:studentCredentials.email}))
  const homework=await row(teacher,'homework',{title:'QA Mobile End-to-End',group_id:group.id,created_by:teacherAuth.user.id,assigned_at:'2026-11-03',due_date:'2026-11-06',basic_tasks:[{id:'short',type:'fill',question:'Сколько будет 3 + 3?',answer:'6',isHard:false},{id:'long',type:'extended',question:'Объясните решение своими словами.',isHard:false}]})
  const ref='hw-'+homework.id,attemptId=randomUUID()
  const answers={v:'basic-1',draft:false,attemptId,gradable:1,correct:1,reviewRequired:true,recommendationScore:70,rows:[{n:1,type:'fill',prompt:'Сколько будет 3 + 3?',answer:'6',correct:'6',verdict:'correct'},{n:2,type:'extended',prompt:'Объясните решение своими словами.',answer:'Две тройки дают шесть.',verdict:'review'}]}
  const progress=await ok(student.from('lesson_progress').upsert({student_id:pupil.id,lesson_ref:ref,subject:'Химия',status:'submitted',score:null,attachments:answers},{onConflict:'student_id,lesson_ref'}).select().single())
  f={teacherCredentials,studentCredentials,homework,group,pupil,progress,firstAttempt:attemptId,ref}
  writeFileSync(dir+'/fixture.json',JSON.stringify(f,null,2));chmodSync(dir+'/fixture.json',0o600)
  pass('Synthetic teacher, claimed learner and pending manual homework created through local Auth/PostgREST')
 } else {
  f=JSON.parse(readFileSync(dir+'/fixture.json','utf8'))
  await ok(teacher.auth.signInWithPassword(f.teacherCredentials));await ok(student.auth.signInWithPassword(f.studentCredentials))
  const stored=await ok(teacher.from('lesson_progress').select('id,status,score,attachments,review_comment').eq('id',f.progress.id).single())
  if(command==='verify-returned') {
   assert.equal(stored.status,'returned');assert.equal(stored.attachments.attemptId,f.firstAttempt);assert.equal(stored.review_comment,'Добавь уравнения реакций.');pass('Mobile teacher UI saved return and comment in real local database')
   const learnerStored=await ok(student.from('lesson_progress').select('status,review_comment').eq('id',f.progress.id).single());assert.equal(learnerStored.status,'returned');assert.equal(learnerStored.review_comment,stored.review_comment);pass('Learner Auth session reads the returned result and comment')
  } else if(command==='resubmit') {
   assert.equal(stored.status,'returned')
   const attemptId=randomUUID(),answers={...stored.attachments,attemptId,draft:false,reviewedAt:null,rows:stored.attachments.rows.map(r=>r.n===2?{...r,answer:'На катоде идёт восстановление, на аноде — окисление. Добавлены уравнения реакций.'}:r)}
   const progress=await ok(student.from('lesson_progress').upsert({student_id:f.pupil.id,lesson_ref:f.ref,subject:'Химия',status:'submitted',score:null,attachments:answers},{onConflict:'student_id,lesson_ref'}).select().single())
   assert.equal(progress.id,f.progress.id);assert.equal(progress.attachments.attemptId,attemptId);f.secondAttempt=attemptId;writeFileSync(dir+'/fixture.json',JSON.stringify(f,null,2));chmodSync(dir+'/fixture.json',0o600);pass('Learner resubmits a new attempt on the same progress row through local PostgREST')
   // Exact production adapter: stale review must not overwrite the resubmission.
   const {build}=await import('esbuild')
   const bundle=await build({stdin:{contents:"export {reviewHomework} from './src/lib/useHomework'; export {supabase} from './src/lib/supabase'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false,define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:cfg.API_URL,VITE_SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY})},logLevel:'silent'})
   mkdirSync('node_modules/.cache',{recursive:true});writeFileSync('node_modules/.cache/localMobileReviewAdapter.mjs',bundle.outputFiles[0].text)
   const adapter=await import('../../node_modules/.cache/localMobileReviewAdapter.mjs');await ok(adapter.supabase.auth.signInWithPassword(f.teacherCredentials))
   assert.equal(await adapter.reviewHomework(f.progress.id,'accepted',100,'stale',{photos:[],board:null},f.firstAttempt),false)
   const unchanged=await ok(student.from('lesson_progress').select('status,attachments').eq('id',f.progress.id).single());assert.equal(unchanged.status,'submitted');assert.equal(unchanged.attachments.attemptId,attemptId);pass('Production reviewHomework rejects stale expectedAttemptId against real local API')
  } else if(command==='verify-completed') {
   assert.equal(stored.status,'completed');assert.equal(stored.score,90);assert.equal(stored.attachments.attemptId,f.secondAttempt);assert.equal(stored.review_comment,'Отлично, исправления зачтены.');pass('Mobile teacher UI publishes 90 percent for the new attempt')
   const fresh=make(cfg.ANON_KEY);await ok(fresh.auth.signInWithPassword(f.studentCredentials));const result=await ok(fresh.from('lesson_progress').select('status,score,review_comment').eq('id',f.progress.id).single());assert.equal(result.score,90);assert.equal(result.review_comment,stored.review_comment);pass('Fresh learner Auth login sees final score and teacher comment')
   const history=await ok(fresh.from('homework_attempts').select('id,status,score').eq('progress_id',f.progress.id));assert.equal(history.length,2);assert.equal(history.find(r=>r.id===f.firstAttempt).status,'returned');assert.equal(history.find(r=>r.id===f.secondAttempt).score,90);pass('Learner attempt history preserves returned first attempt and graded second attempt')
  } else throw Error('Unknown command')
 }
} catch(e) {results.push({name:command,status:'FAIL',error:e.message});console.error('FAIL:',e.message);process.exitCode=1}
writeFileSync(dir+'/'+command+'.json',JSON.stringify({scope:'Real localhost Supabase Auth/PostgREST and synthetic owned data',productionModified:false,results},null,2))
