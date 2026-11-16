import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { readFile,writeFile,mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'playwright')
const out='.build/transcription-attempt',evidence=process.env.ISKRA_QA_OUTPUT||'.build/transcription-attempt-qa'
await mkdir(evidence,{recursive:true})
await build({entryPoints:['scripts/fixtures/studentRecording.tsx'],entryNames:'app',bundle:true,jsx:'automatic',format:'esm',outdir:out,loader:{'.svg':'file','.png':'file','.woff2':'file'},define:{'import.meta.env':JSON.stringify({DEV:true,PROD:false,VITE_SUPABASE_URL:'https://qa.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'fixture'})},plugins:[{name:'attempt-negative-control',setup(b){if(process.env.ATTEMPT_NEGATIVE)b.onLoad({filter:/LocalTranscription\.tsx$/},async({path})=>({loader:'tsx',contents:(await readFile(path,'utf8')).replace("if (draft || variants.text.length || variants.slides?.length) setView('entry')","if (false) setView('entry')")}))}},{name:'no-native-launch',setup(b){b.onLoad({filter:/localTranscription\.ts$/},async({path})=>({loader:'ts',contents:(await readFile(path,'utf8')).replace('window.location.assign(transcriptionAppURL)','void transcriptionAppURL')}))}},{name:'row-negative-control',setup(b){if(process.env.CHAPTER_ROWS_NEGATIVE)b.onLoad({filter:/LessonRecordingView\.tsx$/},async({path})=>({loader:'tsx',contents:(await readFile(path,'utf8')).replace('                  flexShrink: 0,','                  flexShrink: 1,')}))}},{name:'negative-control',setup(b){if(process.env.PREVIEW_QA_NEGATIVE)b.onLoad({filter:/TeacherCourseEditorPage\.tsx$/},async({path})=>({loader:'tsx',contents:(await readFile(path,'utf8')).replace('if (preview) return <ScrollFade','if (false) return <ScrollFade')}))}},{name:'fixture-db',setup(b){b.onLoad({filter:/\/supabase\.ts$/},()=>({loader:'ts',contents:`const user={id:'11111111-1111-4111-8111-111111111111',app_metadata:{role:'teacher'}};const query={select(){return this},eq(){return this},neq(){return this},order(){return this},range(){return this},maybeSingle:async()=>({data:null,error:null}),then(resolve){resolve({data:[],error:null})}};export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},rpc:async(name)=>({data:name==='my_features'?[{feature:'transcription',enabled:true}]:null,error:null}),from:()=>query,functions:{invoke:async()=>({data:null,error:null})}};export const SUPABASE_URL='https://qa.invalid';export const SUPABASE_KEY='fixture'`}))}}]})
await writeFile(out+'/app.css',(await postcss([tailwindcss(),autoprefixer()]).process(await readFile(out+'/app.css','utf8'),{from:out+'/app.css'})).css)
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname
 if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script>')}
 else if(path==='/video.mp4'){const data=await readFile('public/guides/mac-launch.mp4');res.setHeader('Content-Type','video/mp4');res.setHeader('Accept-Ranges','bytes');const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=range[2]?Number(range[2]):data.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1))}else{res.setHeader('Content-Length',data.length);res.end(data)}}
 else if(path==='/app.js'||path==='/app.css'){res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(out+path))}
 else res.writeHead(404).end()
}catch{res.writeHead(500).end()}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:process.env.ISKRA_BROWSER_CHANNEL||'chromium'})
try {
 const page=await browser.newPage(), errors=[]; page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 const base=`http://127.0.0.1:${server.address().port}`
 const workerVersion=(await readFile('src/lib/transcriptionModuleVersion.ts','utf8')).match(/VERSION = '([^']+)'/)[1]
 const owner='11111111-1111-4111-8111-111111111111'
 const key='iskra.transcription.job.'+JSON.stringify([owner,JSON.stringify(['fixture-course','A'])])
 const failure='Ссылка должна открывать видео для скачивания. Для закрытой записи выберите файл.'
 let posts=0, polls=0, delay=0, success=false, body='', responseOverride=null, offline=false, cancelled=false, stale=false, updateBusy=false, updates=0
 await page.route('http://127.0.0.1:18764/**',async route=>{
   const url=route.request().url()
   if(url.endsWith('/version'))return route.fulfill({json:{version:stale?'old-worker':workerVersion,slideChapters:true,update:true}})
   if(url.endsWith('/update')) {updates++;if(updateBusy)return route.fulfill({status:409,json:{error:'Модуль занят расшифровкой. Обновится, когда она закончится.'}});stale=false;return route.fulfill({status:202,json:{version:workerVersion}})}
   if(offline)return route.abort()
   if(route.request().method()==='DELETE'){cancelled=true;return route.fulfill({json:{cancelled:true}})}
   if(route.request().method()==='POST'){posts++;body=route.request().postData()||'';return route.fulfill({json:{id:'new-job'}})}
   polls++;if(delay)await new Promise(r=>setTimeout(r,delay))
   if(responseOverride)return route.fulfill({json:cancelled?{cancelled:true,stage:'Отменено'}:responseOverride})
   return route.fulfill({json:success?{done:true,stage:'Готово',segments:[{start:0,end:2,text:'Новая успешная реплика'}],chapters:[{start:0,title:'Новая глава'}]}:{error:true,stage:failure,done:true,canCancel:true}})
 })
 await page.goto(base)
 async function seed(query='', mode='text'){
   await page.evaluate(({owner,key,base,mode})=>{localStorage.clear();localStorage.setItem('iskra.transcription.device.'+owner,'fixture-token');localStorage.setItem(key,JSON.stringify({id:'failed-A',source:base+'/video.mp4?lesson=A',mode}))},{owner,key,base,mode})
   await page.goto(base+'/'+query)
 }
 await page.setViewportSize({width:1440,height:1000})
 await seed()
 await page.getByText('Повторная обработка не завершилась',{exact:true}).waitFor()
 await page.getByLabel('Название главы 1',{exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Редактировать реплику 1',exact:true}).textContent(),'Реплика A')
 assert.equal(await page.locator('[data-writes]').getAttribute('data-writes'),'0')
 for(const theme of ['light','dark']){
   await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')},theme)
   await page.screenshot({path:join(evidence,`saved-${theme}.png`),fullPage:true})
 }
 const before=polls;await page.reload();await page.getByText('Повторная обработка не завершилась',{exact:true}).waitFor();assert.equal(polls,before,'terminal job not polled on refresh')
 await page.getByRole('button',{name:'Скрыть сообщение',exact:true}).click();await page.reload();await page.getByLabel('Название главы 1',{exact:true}).waitFor();assert.equal(await page.getByRole('alert').count(),0)
 await page.getByRole('button',{name:'Другой урок',exact:true}).click();await page.getByLabel('Название главы 1',{exact:true}).waitFor();assert.match(await page.getByLabel('Название главы 1',{exact:true}).inputValue(),/^B:/)
 await page.getByRole('button',{name:'Другой урок',exact:true}).click();assert.equal(await page.getByText('Повторная обработка не завершилась',{exact:true}).count(),0)
 // Explicit retry shows source controls; file is uploaded without rewriting the lesson link.
 await page.getByRole('button',{name:'Повторить обработку',exact:true}).click()
 await page.getByLabel('Исходный файл для обработки',{exact:true}).setInputFiles({name:'same-video.mp4',mimeType:'video/mp4',buffer:Buffer.from('fixture-media')})
 success=true
 await page.getByRole('button',{name:'Начать расшифровку',exact:true}).click()
 await page.getByRole('button',{name:'Редактировать реплику 1',exact:true}).filter({hasText:'Новая успешная реплика'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e})
 assert.equal(posts,1);assert(body.includes('same-video.mp4'));assert(!body.includes('name="link"'));assert.equal(await page.locator('[data-writes]').getAttribute('data-writes'),'0','new result is a draft, never silently saved')
 // No existing result: actionable error, no fictitious saved-result claim.
 success=false;await seed('?empty')
 await page.getByText('Не удалось завершить расшифровку',{exact:true}).waitFor()
 assert.equal(await page.getByText('Ниже показан ранее сохранённый результат.',{exact:false}).count(),0)
 for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')},theme);await page.screenshot({path:join(evidence,`empty-${theme}.png`),fullPage:true})}
 await page.getByRole('button',{name:'Начать заново',exact:true}).click();await page.getByLabel('Исходный файл для обработки',{exact:true}).waitFor()
 await page.getByRole('button',{name:'К записи урока',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Расшифровать видео',exact:true}).waitFor()
 // A response delivered after navigation cannot show A's failure in B or overwrite B's result.
 delay=800;await seed();await page.getByRole('button',{name:'Другой урок',exact:true}).click();await page.waitForTimeout(1000)
 assert.match(await page.getByLabel('Название главы 1',{exact:true}).inputValue(),/^B:/);assert.equal(await page.getByText('Повторная обработка не завершилась',{exact:true}).count(),0)
 // Measured progress survives a metric-free poll, reload and reconnect.
 delay=0;responseOverride={stage:'Читаем слайды',canCancel:true,progress:{current:0,total:1083,unit:'frames'}};await seed()
 const progress=page.getByRole('progressbar',{name:'Читаем слайды',exact:true})
 await progress.waitFor();assert.equal(await progress.getAttribute('aria-valuenow'),'0')
 responseOverride={stage:'Читаем слайды',canCancel:true,progress:{current:596,total:1083,unit:'frames'}}
 await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='55')
 responseOverride={stage:'Читаем слайды',canCancel:true};await page.waitForTimeout(1200)
 assert.equal(await progress.getAttribute('aria-valuenow'),'55')
 responseOverride={stage:'Читаем слайды',canCancel:true,progress:{current:650,total:1083,unit:'frames'}}
 await page.reload();await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='60')
 for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')},theme);await page.screenshot({path:join(evidence,`progress-${theme}.png`),fullPage:true})}
 offline=true;await page.getByText('Модуль недоступен',{exact:true}).waitFor();offline=false
 await page.getByRole('button',{name:'Проверить связь',exact:true}).click();await progress.waitFor();assert.equal(await progress.getAttribute('aria-valuenow'),'60')
 responseOverride={stage:'Собираем главы',canCancel:true};await page.waitForTimeout(1200)
 assert.equal(await page.getByRole('progressbar').count(),0,'unknown denominator does not inherit the previous step percentage')
 assert.equal(await page.locator('.transcription-job-steps li').filter({hasText:'Читаем слайды'}).locator('svg').count(),1,'completed step has a check')
 await page.getByRole('button',{name:'Остановить расшифровку',exact:true}).click();await page.getByText('Расшифровка отменена',{exact:true}).waitFor()
 assert(cancelled);assert.equal(await page.getByRole('progressbar').count(),0)
 // Native can wake after the topbar's one-time version check: update before submitting.
 responseOverride=null;cancelled=false;success=false;stale=true;await seed('?empty')
 await page.getByText('Не удалось завершить расшифровку',{exact:true}).waitFor()
 await page.getByRole('button',{name:'К записи урока',exact:true}).click()
 await page.getByRole('button',{name:'Расшифровать видео',exact:true}).click()
 success=true
 await page.getByRole('button',{name:'Начать расшифровку',exact:true}).click()
 await page.getByRole('button',{name:'Редактировать реплику 1',exact:true}).filter({hasText:'Новая успешная реплика'}).waitFor()
 assert.equal(updates,1);assert.equal(stale,false)
 const submitted=posts;updateBusy=true;stale=true;success=false;await seed('?empty')
 await page.getByRole('button',{name:'Начать заново',exact:true}).click()
 await page.getByRole('button',{name:'Начать расшифровку',exact:true}).click()
 await page.getByText('Модуль занят другой расшифровкой. Дождитесь её завершения и повторите.',{exact:true}).waitFor()
 assert.equal(posts,submitted,'busy worker is neither restarted nor given a duplicate job')
 responseOverride={stage:'Читаем слайды',canCancel:true,progress:{current:650,total:1083,unit:'frames'}};stale=false;await seed('', 'slides')
 await page.getByRole('progressbar',{name:'Читаем слайды',exact:true}).waitFor()
 assert.equal(await page.locator('.transcription-job-steps li').count(),2)
 for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')},theme);await page.screenshot({path:join(evidence,`slides-progress-${theme}.png`),fullPage:true})}
 assert.deepEqual(errors,[])
 console.log('PASS terminal failure persistence, saved result remains visible, dismiss/reload, retry/file upload, no result, late lesson response, both PC themes')
} finally {await browser.close();server.close()}
