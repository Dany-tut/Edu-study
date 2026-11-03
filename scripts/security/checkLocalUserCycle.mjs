// Real browser happy path. Fixture authoring uses a trusted local-only teacher API.
// Student invitation/signup, submission, teacher review and fresh-login result use UI.
import {createClient} from '@supabase/supabase-js'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'/tmp/iskra-icon-qa/node_modules/playwright/index.mjs')
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security',base=process.env.ISKRA_QA_BASE_URL||'http://127.0.0.1:5291'
assert.equal(new URL(base).hostname,'127.0.0.1')
const cfg=JSON.parse(readFileSync(root+'/status.json','utf8'))
assert.equal(new URL(cfg.API_URL).hostname,'127.0.0.1')
const make=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const admin=make(cfg.SERVICE_ROLE_KEY),teacher=make(cfg.ANON_KEY)
async function ok(p){const r=await p;if(r.error)throw Error(`${r.error.code||r.error.status||''} ${r.error.message}`);return r.data}
async function insert(c,t,row){return ok(c.from(t).insert(row).select().single())}
const stamp=Date.now(),password=randomUUID().replaceAll('-','')
const teacherCredentials={email:`browser-teacher-${stamp}@example.invalid`,password}
const studentCredentials={email:`browser-student-${stamp}@example.invalid`,password:randomUUID().replaceAll('-','')}
// Use the real invitation transition; assigning Auth app_metadata=teacher alone
// is not the product's teacher provisioning flow.
const core=JSON.parse(readFileSync(root+'/fixture.json','utf8'))
const inviter=make(cfg.ANON_KEY);await ok(inviter.auth.signInWithPassword(core.accounts.admin))
const setup=await ok(teacher.auth.signUp({...teacherCredentials,options:{data:{name:'QA Browser Teacher'}}}))
const invite=await ok(inviter.rpc('admin_create_teacher_invite',{p_email:teacherCredentials.email,p_hidden_tabs:[],p_hidden_widgets:[],p_course_assignments:[],p_group_ids:[],p_subjects:['chemistry']}))
await ok(teacher.rpc('apply_teacher_invite',{p_token:invite}))
const group=await insert(teacher,'groups',{name:'QA Browser Group',subject:'Химия',created_by:setup.user.id})
const student=await insert(teacher,'students',{name:'QA Full Cycle Learner',group_id:group.id})
const course=await insert(teacher,'courses',{title:'QA Browser Course',subject:'Химия',status:'published',created_by:setup.user.id,group_ids:[group.id]})
const module=await insert(teacher,'course_modules',{course_id:course.id,label:'QA Module',position:1})
const lesson=await insert(teacher,'lessons',{course_id:course.id,module_id:module.id,title:'QA Legacy Date Lesson',short_id:'browser-'+stamp,scheduled_date:'01.01.2020',scheduled_time:'10:00',lesson_number:1})
// This linked assignment deliberately exercises the legacy date crash regression.
await insert(teacher,'homework',{group_id:group.id,lesson_id:lesson.id,title:'QA Date Regression',created_by:setup.user.id})
const homework=await insert(teacher,'homework',{group_id:group.id,title:'QA Full Browser Review',created_by:setup.user.id,assigned_at:'2026-11-01',basic_tasks:[
 {id:'short',type:'fill',isHard:false,label:'Краткий ответ',question:'Сколько будет 3 + 3?',answer:'6'},
 {id:'long',type:'extended',isHard:false,label:'Развёрнутый ответ',question:'Объясните решение своими словами.'},
]})
const ref='hw-'+homework.id,answer='Я сложил две тройки. <img src=x onerror="document.body.dataset.qaXss=1">',comment='Хорошее объяснение. Работа зачтена.'
const results=[];let browser,context,page,submission
const dir=root+'/evidence/browser-replay-'+stamp;mkdirSync(dir,{recursive:true})
async function step(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS:',name)}
async function newContext(){if(context)await context.close();context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());page=await context.newPage();page.setDefaultTimeout(25000)}
async function consent(){await page.getByText('Согласен(а) на обработку данных.',{exact:true}).click();await page.getByRole('button',{name:'Принимаю и продолжаю',exact:true}).click()}
async function openHomework(){await page.goto(`${base}/#/homework/${ref}`,{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'})}
async function pollProgress(predicate){for(let i=0;i<50;i++){const r=await ok(teacher.from('lesson_progress').select('id,status,score,attachments,review_comment').eq('student_id',student.id).eq('lesson_ref',ref).maybeSingle());if(r&&predicate(r))return r;await new Promise(r=>setTimeout(r,200))}throw Error('Expected server state not reached')}
async function login(credentials){await page.goto(base+'/#/login',{waitUntil:'domcontentloaded'});await page.locator('input[type=email]').fill(credentials.email);await page.locator('input[type=password]').fill(credentials.password);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByPlaceholder('Email',{exact:true}).waitFor({state:'hidden'})}
async function history(){await page.getByText('ДЗ зачтено · 90%',{exact:true}).waitFor();await page.getByRole('button',{name:/^История попыток/}).click();await page.getByText('Ответы в этой попытке',{exact:true}).click();await page.getByText(answer,{exact:true}).first().waitFor();assert.equal(await page.locator('img[onerror]').count(),0);assert.equal(await page.locator('body').getAttribute('data-qa-xss'),null);assert.ok((await page.locator('body').innerText()).includes(comment))}
try{
 browser=await chromium.launch({channel:process.env.ISKRA_BROWSER_CHANNEL || 'chrome',headless:true,args:['--disable-background-networking','--renderer-process-limit=2','--js-flags=--max-old-space-size=512']});await newContext()
 await step('Student opens invitation and registers through UI',async()=>{
  await page.goto(`${base}/#/join?token=${student.invite_token}`,{waitUntil:'domcontentloaded'});await page.getByPlaceholder('Email (логин)',{exact:true}).fill(studentCredentials.email);await page.getByPlaceholder('Пароль',{exact:true}).fill(studentCredentials.password);await page.getByRole('button',{name:'Войти в платформу',exact:true}).click();await page.getByPlaceholder('Email (логин)',{exact:true}).waitFor({state:'hidden'});await consent();
  const linked=await ok(teacher.from('students').select('auth_user_id,temp_password').eq('id',student.id).single());assert.ok(linked.auth_user_id);assert.equal(linked.temp_password,null)
 })
 await step('Student opens assigned homework, writes answers and reloads local draft',async()=>{
  await openHomework();await page.getByPlaceholder('Впиши слово или фразу…',{exact:true}).fill('6');await page.getByPlaceholder('Развёрнутый ответ…',{exact:true}).fill(answer);await page.reload({waitUntil:'domcontentloaded'});await page.getByPlaceholder('Впиши слово или фразу…',{exact:true}).waitFor();assert.deepEqual(await page.locator('textarea').evaluateAll(a=>a.map(x=>x.value)),['6',answer])
 })
 await step('Browser submission persists one pending manual attempt',async()=>{
  let committedId
  const endpoint = new URL('/rest/v1/lesson_progress',cfg.API_URL)
  await page.route(url=>url.origin===endpoint.origin && url.pathname===endpoint.pathname,async route=>{
    const request=route.request()
    if(request.method()!=='POST' || request.postDataJSON()?.lesson_ref!==ref || committedId) return route.fallback()
    const response=await route.fetch({maxRetries:0})
    assert.ok(response.ok())
    committedId=request.postDataJSON().attachments.attemptId
    assert.ok(committedId)
    await route.abort('connectionreset')
  })
  await page.getByRole('button',{name:'Сдать домашку',exact:true}).last().click()
  await page.getByRole('button',{name:'Отправить ещё раз',exact:true}).click()
  await page.getByText('Работа отправлена',{exact:true}).first().waitFor()
  submission=await pollProgress(r=>r.status==='submitted');assert.equal(submission.attachments.attemptId,committedId);assert.equal(submission.score,null);assert.equal(submission.attachments.reviewRequired,true);await page.screenshot({path:dir+'/student-submitted.png',fullPage:true})
 })
 await newContext()
 await step('Teacher logs in, opens live review and sees original answers',async()=>{
  await login(teacherCredentials)
  const reminder=page.getByText('Проверить ДЗ — QA Browser Group',{exact:true})
  const queue=page.getByRole('button',{name:/^Проверка/})
  await reminder.or(queue).first().waitFor()
  if (await reminder.isVisible()) {
    await reminder.click()
  } else {
    await queue.click()
    await page.getByRole('button',{name:/Проверить · QA Full Cycle Learner · QA Full Browser Review/}).click()
  }
  await page.getByText(answer,{exact:true}).first().waitFor();assert.equal(await page.locator('img[onerror]').count(),0);assert.equal(await page.locator('body').getAttribute('data-qa-xss'),null)
 })
 await step('Teacher publishes 90 percent and a comment through UI',async()=>{
  await page.getByRole('spinbutton',{name:/^(Итоговый результат|Итог ДЗ) в процентах$/}).fill('90');await page.getByRole('textbox',{name:/^Комментарий ученику( в полной проверке)?$/}).fill(comment);await page.screenshot({path:dir+'/teacher-review.png',fullPage:true});await page.getByRole('button',{name:/^(Сохранить и продолжить|Завершить проверку)$/}).click();const r=await pollProgress(r=>r.status==='completed'&&r.score===90);assert.equal(r.attachments.attemptId,submission.attachments.attemptId);assert.equal(r.review_comment,comment)
 })
 await newContext()
 await step('Fresh student login shows published result, comment and historical answers',async()=>{
  await login(studentCredentials);await consent();await openHomework();await history();await page.screenshot({path:dir+'/student-result.png',fullPage:true})
 })
 await step('Reload keeps result and exactly one server attempt',async()=>{
  await page.reload({waitUntil:'domcontentloaded'});await history();const attempts=await ok(teacher.from('homework_attempts').select('id,score,status').eq('progress_id',submission.id));assert.equal(attempts.length,1);assert.equal(attempts[0].id,submission.attachments.attemptId);assert.equal(attempts[0].score,90)
 })
}catch(e){if(page){await page.screenshot({path:dir+'/failure.png',fullPage:true}).catch(()=>{});writeFileSync(dir+'/failure-text.txt',await page.locator('body').innerText().catch(()=>''))}results.push({name:'browser user cycle',status:'FAIL',error:e.message.replace(/token=[^\s"&]+/g,'token=[redacted]')});console.error('FAIL:',results.at(-1).error);process.exitCode=1}
finally{if(browser)await browser.close();writeFileSync(dir+'/result.json',JSON.stringify({scope:'Local real Auth/DB/Storage. Assignment fixture via teacher API; student signup/submit and teacher review via UI; drafts same-browser localStorage',results,productionModified:false},null,2))}
console.log('Evidence:',dir)
