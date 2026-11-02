import {createClient} from '@supabase/supabase-js'
import {readFileSync,writeFileSync,chmodSync,existsSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE || '/tmp/iskra-icon-qa/node_modules/playwright/index.mjs')
const root='/tmp/iskra-local-security', base='http://127.0.0.1:5291'
const cfg=JSON.parse(readFileSync(root+'/status.json','utf8')), fixture=JSON.parse(readFileSync(root+'/fixture.json','utf8'))
if(new URL(cfg.API_URL).hostname!=='127.0.0.1')throw Error('Localhost only')
const teacher=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
let r=await teacher.auth.signInWithPassword(fixture.accounts.teacherA);if(r.error)throw r.error
async function prepare() {
const student=await teacher.from('students').insert({name:'QA Browser Learner',group_id:fixture.rows.A.group.id}).select().single();if(student.error)throw student.error
const tasks=[{id:'browser-short',type:'fill',isHard:false,label:'Краткий ответ',question:'Сколько будет 2 + 2?',answer:'4'},{id:'browser-long',type:'extended',isHard:false,label:'Развёрнутый ответ',question:'Объясните ответ одним предложением.',answer:'Сумма двух пар равна четырём.'}]
const homework=await teacher.from('homework').insert({title:'QA Browser Flow',group_id:fixture.rows.A.group.id,created_by:fixture.accounts.teacherA.id,assigned_at:'2026-11-01',basic_tasks:tasks}).select().single();if(homework.error)throw homework.error
const email=`browser-${Date.now()}@example.invalid`,password=randomUUID().replaceAll('-','')
const state={student:student.data,homework:homework.data,email,password}
writeFileSync(root+'/browser-fixture.json',JSON.stringify(state,null,2));chmodSync(root+'/browser-fixture.json',0o600);return state
}
const state=existsSync(root+'/browser-fixture.json')?JSON.parse(readFileSync(root+'/browser-fixture.json','utf8')):await prepare();
const student={data:state.student},homework={data:state.homework},{email,password}=state
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--renderer-process-limit=2','--js-flags=--max-old-space-size=512']})
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'})
 await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort())
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${base}/#/join?token=${student.data.invite_token}`,{waitUntil:'domcontentloaded',timeout:60000})
 await page.getByPlaceholder('Email (логин)',{exact:true}).fill(email)
 await page.getByPlaceholder('Пароль',{exact:true}).fill(password)
 writeFileSync(root+'/evidence/browser-join.txt',await page.locator('body').innerText())
 const buttons=await page.getByRole('button').allTextContents();console.log('Join buttons',buttons)
 const join=page.getByRole('button',{name:'Войти в платформу',exact:true}).first();await join.click()
 await page.waitForTimeout(1200)
 const consent=page.getByRole('checkbox');if(await consent.count()) {await consent.first().check();const go=page.getByRole('button',{name:/Продолжить|Принимаю|Соглас/}).last();if(await go.count())await go.click()}
 await page.goto(`${base}/#/homework/hw-${homework.data.id}`,{waitUntil:'domcontentloaded',timeout:60000})
 await page.waitForTimeout(1800)
 writeFileSync(root+'/evidence/browser-body.txt',await page.locator('body').innerText())
 await page.screenshot({path:root+'/evidence/browser-homework.png',fullPage:true})
 console.log('Browser homework text:',(await page.locator('body').innerText()).slice(0,3500))
 console.log('Page errors:',errors)
 await context.storageState({path:root+'/browser-state.json'});chmodSync(root+'/browser-state.json',0o600)
} finally {await browser.close()}
