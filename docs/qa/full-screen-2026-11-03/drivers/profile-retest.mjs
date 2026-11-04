import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
const cache=new URL('.',import.meta.url).pathname,out=cache+'profile-fixed';mkdirSync(out,{recursive:true})
const {teacher}=JSON.parse(readFileSync(cache+'private.json','utf8')),{pupilId,homeworkId}=JSON.parse(readFileSync(cache+'student-private.json','utf8'))
const keys=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref','igsdwvwiqnozgwczzycx','-o','json'],{stdio:['ignore','pipe','ignore']}))
const c=createClient('https://igsdwvwiqnozgwczzycx.supabase.co',keys.find(k=>k.name==='anon').api_key,{auth:{persistSession:false,autoRefreshToken:false}})
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data}
await ok(c.auth.signInWithPassword(teacher))
const owner=await ok(c.from('students').select('created_by').eq('id',pupilId).single());assert.equal(owner.created_by,teacher.id)
const progress=await ok(c.from('lesson_progress').select('id,score').eq('student_id',pupilId).eq('lesson_ref','hw-'+homeworkId).single()),browser=await chromium.launch({channel:'chrome',headless:true}),rows=[]
try{for(const score of [90,0]){
 await ok(c.from('lesson_progress').update({score}).eq('id',progress.id))
 for(const width of [320,390])for(const theme of ['light','dark']){
  const ctx=await browser.newContext({storageState:JSON.parse(readFileSync(cache+'student-storage.json','utf8')),viewport:{width,height:width===320?568:844},serviceWorkers:'block'}),page=await ctx.newPage();page.setDefaultTimeout(15000);await page.addInitScript(t=>localStorage.setItem('theme',t),theme)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  try{await page.goto('http://127.0.0.1:5398/#/profile',{waitUntil:'domcontentloaded'})
   await page.getByText(score+'/200 XP',{exact:true}).waitFor()
   await page.waitForFunction(score=>[...document.querySelectorAll('svg text')].some(e=>e.textContent===score+'%'),score)
   assert.equal(await page.getByText('Пока нет оценок — график появится после первой проверки',{exact:true}).count(),0)
   assert.ok((await page.locator('body').innerText()).includes(score+'%'))
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme)
   assert.equal(await page.locator('svg').evaluateAll(es=>es.some(e=>/NaN|Infinity/.test(e.outerHTML))),false)
   assert.deepEqual(errors,[]);await page.locator('svg[viewBox="0 0 320 132"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${score}-${width}-${theme}.png`});rows.push({score,width,theme,status:'PASS',detail:'First completed score is visible as chart point; zero stays 0%, no empty-grade message or invalid coordinates'})
  }catch(e){rows.push({score,width,theme,status:'FAIL',error:String(e)});process.exitCode=1}finally{await ctx.close();writeFileSync(out+'/results.json',JSON.stringify(rows,null,2))}
 }
}}finally{await ok(c.from('lesson_progress').update({score:progress.score}).eq('id',progress.id));await browser.close()}
console.log(JSON.stringify(rows))
