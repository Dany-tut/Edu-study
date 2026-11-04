import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
const cache=new URL('.',import.meta.url).pathname,out=cache+'copy-'+(process.env.QA_CASE||'fixed');mkdirSync(out,{recursive:true})
const {teacher}=JSON.parse(readFileSync(cache+'private.json','utf8'))
const keys=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref','igsdwvwiqnozgwczzycx','-o','json'],{stdio:['ignore','pipe','ignore']}))
const client=createClient('https://igsdwvwiqnozgwczzycx.supabase.co',keys.find(k=>k.name==='anon').api_key,{auth:{persistSession:false,autoRefreshToken:false}})
async function ok(p){const r=await p;if(r.error)throw new Error(r.error.message);return r.data}
const {session}=await ok(client.auth.signInWithPassword(teacher)),browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[],cleanup=[],undo=[]
try{
 const course=await ok(client.from('courses').select('id,short_id').eq('created_by',teacher.id).eq('title','QA Full Course A').single()),title='QA identity copy '+randomUUID()
 const [copy]=await ok(client.rpc('duplicate_my_course',{p_short_id:course.short_id,p_title:title}));undo.push(()=>ok(client.from('courses').delete().eq('id',copy.id)))
 const initial=await ok(client.from('lessons').select('id,short_id,homework').eq('course_id',copy.id).single())
 const group=await ok(client.from('groups').insert({created_by:teacher.id,name:'QA stable reference',subject:'Химия'}).select('id').single());undo.push(()=>ok(client.from('groups').delete().eq('id',group.id)))
 const student=await ok(client.from('students').insert({created_by:teacher.id,name:'QA synthetic stable student',group_id:group.id}).select('id').single());undo.push(()=>ok(client.from('students').delete().eq('id',student.id)))
 const progress=await ok(client.from('lesson_progress').insert({student_id:student.id,lesson_ref:initial.short_id,subject:'Химия',status:'current'}).select('id,lesson_ref,status').single());undo.push(()=>ok(client.from('lesson_progress').delete().eq('id',progress.id)))
 const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await ctx.addInitScript(s=>localStorage.setItem('sb-igsdwvwiqnozgwczzycx-auth-token',JSON.stringify(s)),session)
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000)
 await page.goto('http://127.0.0.1:5398/#/teacher/constructor',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Выберите предмет',exact:true}).click();await page.getByRole('button',{name:'Химия',exact:true}).click();await page.getByRole('button',{name:'Конструктор',exact:true}).click();await page.getByText(title,{exact:true}).first().click();await page.getByRole('button',{name:/QA Lesson A/}).click();await page.getByRole('button',{name:'Домашки',exact:true}).click()
 const text='QA preserve copied lesson reference '+Date.now();await page.getByPlaceholder('Условие задания...',{exact:true}).first().fill(text)
 let current;for(let i=0;i<70;i++){current=await ok(client.from('lessons').select('id,short_id,homework').eq('course_id',copy.id).single());if(current.homework.hwTasks[0].question===text)break;await new Promise(r=>setTimeout(r,150))}
 assert.equal(current.homework.hwTasks[0].question,text)
 results.push({name:'copied content edits reach server',status:'PASS'})
 results.push({name:'copy lesson identity comparison',initial:{id:initial.id,ref:initial.short_id},after:{id:current.id,ref:current.short_id}})
 assert.equal(current.id,initial.id,'Editing a copied lesson must update the same DB row')
 assert.equal(current.short_id,initial.short_id,'Progress reference must not be renamed')
 const after=await ok(client.from('lesson_progress').select('id,lesson_ref,status').eq('id',progress.id).single());assert.equal(after.lesson_ref,current.short_id);assert.equal(after.status,'current')
 results.push({name:'copied lesson and synthetic student progress stay linked',status:'PASS'});assert.deepEqual(errors,[])
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/QA Lesson A/}).click();await page.getByRole('button',{name:'Домашки',exact:true}).click();await page.getByPlaceholder('Условие задания...',{exact:true}).first().waitFor();assert.equal(await page.getByPlaceholder('Условие задания...',{exact:true}).first().inputValue(),text)
 results.push({name:'fresh load preserves copied reference and authored question',status:'PASS'})
}catch(e){results.push({status:'FAIL',error:e.stack});process.exitCode=1}finally{await browser.close();for(const fn of undo.reverse())try{await fn()}catch(e){cleanup.push(String(e))}writeFileSync(out+'/results.json',JSON.stringify({results,errors,cleanup},null,2))}
console.log(JSON.stringify({results,errors,cleanup}))
