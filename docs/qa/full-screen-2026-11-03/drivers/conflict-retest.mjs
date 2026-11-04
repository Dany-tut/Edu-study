import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
const cache=new URL('.',import.meta.url).pathname,out=cache+'conflict-fixed';mkdirSync(out,{recursive:true})
const {teacher}=JSON.parse(readFileSync(cache+'private.json','utf8')),owned=JSON.parse(readFileSync(cache+'owned.json','utf8'))
const keys=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref','igsdwvwiqnozgwczzycx','-o','json'],{stdio:['ignore','pipe','ignore']}))
const client=createClient('https://igsdwvwiqnozgwczzycx.supabase.co',keys.find(k=>k.name==='anon').api_key,{auth:{persistSession:false,autoRefreshToken:false}})
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data}
const {session}=await ok(client.auth.signInWithPassword(teacher)),browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[]
try{
 const course=await ok(client.from('courses').select('id').eq('created_by',teacher.id).eq('title','QA Full Course A').single())
 const createPage=async()=>{const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await ctx.addInitScript(s=>localStorage.setItem('sb-igsdwvwiqnozgwczzycx-auth-token',JSON.stringify(s)),session);const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5398/#/teacher/constructor',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Выберите предмет',exact:true}).click();await page.getByRole('button',{name:'Химия',exact:true}).click();await page.getByRole('button',{name:'Конструктор',exact:true}).click();await page.getByText('QA Full Course A',{exact:true}).first().click();await page.getByRole('button',{name:/QA Lesson A/}).click();await page.getByRole('button',{name:'Домашки',exact:true}).click();await page.getByPlaceholder('Условие задания...',{exact:true}).first().waitFor();return page}
 const a=await createPage(),b=await createPage(),aText='QA committed A '+Date.now(),stale='QA rejected stale B '+Date.now()
 const poll=async expected=>{for(let i=0;i<70;i++){const r=await ok(client.from('lessons').select('homework').eq('course_id',course.id).single());if(r.homework.hwTasks[0].question===expected)return;await new Promise(r=>setTimeout(r,150))}throw Error('Expected server text not reached')}
 await a.getByPlaceholder('Условие задания...',{exact:true}).first().fill(aText);await poll(aText)
 await b.getByPlaceholder('Условие задания...',{exact:true}).first().fill(stale);await b.getByText('Курс изменили в другом месте',{exact:true}).waitFor();await poll(aText)
 results.push({name:'stale write prevented',status:'PASS'})
 await Promise.all([b.waitForNavigation({waitUntil:'domcontentloaded'}),b.getByRole('button',{name:'Взять из базы',exact:true}).click()])
 await b.getByRole('button',{name:/QA Lesson A/}).click();await b.getByRole('button',{name:'Домашки',exact:true}).click()
 await b.waitForFunction(t=>[...document.querySelectorAll('textarea[placeholder="Условие задания..."]')].some(e=>e.value===t),aText)
 assert.equal(await b.getByPlaceholder('Условие задания...',{exact:true}).first().inputValue(),aText)
 assert.equal(await b.getByPlaceholder('Условие задания...',{exact:true}).first().inputValue()===stale,false)
 await poll(aText);results.push({name:'take database version reloads authoritative homework',status:'PASS'})
 await b.screenshot({path:out+'/database-version.png',fullPage:true})
 const finalText='QA fresh B after accepting server '+Date.now();await b.getByPlaceholder('Условие задания...',{exact:true}).first().fill(finalText);await poll(finalText)
 results.push({name:'new change after database reload commits fresh contents',status:'PASS'});assert.deepEqual(errors,[])
}catch(e){results.push({status:'FAIL',error:String(e)});process.exitCode=1}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));await browser.close()}
console.log(JSON.stringify({results,errors}))
