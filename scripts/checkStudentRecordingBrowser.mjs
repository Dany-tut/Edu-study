import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { readFile,writeFile,mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'playwright')
const out='.build/recording-preview',evidence=process.env.ISKRA_QA_OUTPUT||'.build/recording-preview-qa'
await mkdir(evidence,{recursive:true})
await build({entryPoints:['scripts/fixtures/studentRecording.tsx'],entryNames:'app',bundle:true,jsx:'automatic',format:'esm',outdir:out,loader:{'.svg':'file','.png':'file','.woff2':'file'},define:{'import.meta.env':JSON.stringify({DEV:true,PROD:false,VITE_SUPABASE_URL:'https://qa.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'fixture'})},plugins:[{name:'negative-control',setup(b){if(process.env.PREVIEW_QA_NEGATIVE)b.onLoad({filter:/TeacherCourseEditorPage\.tsx$/},async({path})=>({loader:'tsx',contents:(await readFile(path,'utf8')).replace('if (preview) return <ScrollFade','if (false) return <ScrollFade')}))}},{name:'fixture-db',setup(b){b.onLoad({filter:/\/supabase\.ts$/},()=>({loader:'ts',contents:`const user={id:'11111111-1111-4111-8111-111111111111',app_metadata:{role:'teacher'}};const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null}),then(resolve){resolve({data:[],error:null})}};export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},rpc:async(name)=>({data:name==='my_features'?[{feature:'transcription',enabled:true}]:null,error:null}),from:()=>query,functions:{invoke:async()=>({data:null,error:null})}};export const SUPABASE_URL='https://qa.invalid';export const SUPABASE_KEY='fixture'`}))}}]})
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
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)})
 const base=`http://127.0.0.1:${server.address().port}`
 await page.setViewportSize({width:1440,height:900})
 await page.goto(base+'/?montage')
 await page.getByLabel('Название главы 1',{exact:true}).waitFor()
 await page.getByLabel('Название главы 1',{exact:true}).fill('Исправленная глава A')
 await page.getByRole('button',{name:'Предпросмотр',exact:true}).click()
 await page.getByRole('button',{name:/Исправленная глава/}).waitFor()
 assert.equal(await page.locator('textarea').count(),0)
 assert.equal(await page.locator('[data-writes]').getAttribute('data-writes'),'0')
 await page.waitForTimeout(300);await page.screenshot({path:join(evidence,'pc-preview-light.png')})
 await page.getByRole('button',{name:'Оригинал',exact:true}).click()
 assert.equal(await page.getByLabel('Название главы 1',{exact:true}).inputValue(),'Исправленная глава a')
 await page.waitForTimeout(300);await page.screenshot({path:join(evidence,'pc-original-light.png')})

 // Each UI mode must switch by keyboard as well, retaining the actual draft.
 await page.evaluate(()=>{
  window.__previewFrames=[];window.__observePreview=true
  const sample=()=>{const selected=document.querySelector('[aria-label="Предпросмотр"]')?.getAttribute('aria-pressed')==='true';window.__previewFrames.push({selected,editors:document.querySelectorAll('textarea').length});if(window.__observePreview)requestAnimationFrame(sample)}
  requestAnimationFrame(sample)
 })
 for(let i=0;i<5;i++){
  await page.getByRole('button',{name:'Предпросмотр',exact:true}).press(i%2?'Enter':' ')
  assert.equal(await page.locator('textarea').count(),0)
  await page.getByRole('button',{name:'Оригинал',exact:true}).click()
  assert.equal(await page.getByLabel('Название главы 1',{exact:true}).inputValue(),'Исправленная глава a')
 }
 await page.getByRole('button',{name:'Редактировать реплику 1',exact:true}).click()
 await page.getByLabel('Реплика 1',{exact:true}).fill('Исправленная реплика')
 await page.getByRole('tab',{name:'По слайдам',exact:true}).click()
 await page.getByLabel('Название главы 1',{exact:true}).fill('Исправленный слайд')
 await page.getByRole('button',{name:'Предпросмотр',exact:true}).click()
 await page.getByRole('button',{name:/Исправленный слайд/}).waitFor()
 await page.getByRole('button',{name:'Оригинал',exact:true}).click()
 assert.equal(await page.getByRole('tab',{name:'По слайдам',exact:true}).getAttribute('aria-selected'),'true')
 assert.equal(await page.getByLabel('Название главы 1',{exact:true}).inputValue(),'Исправленный слайд')
 assert.equal(await page.getByRole('button',{name:'Редактировать реплику 1',exact:true}).textContent(),'Исправленная реплика')
 const frames=await page.evaluate(()=>{window.__observePreview=false;return window.__previewFrames})
 assert(frames.some(f=>f.selected));assert(frames.filter(f=>f.selected).every(f=>f.editors===0),'no teacher editor frame under preview selection')
 await writeFile(join(evidence,'transition-frames.json'),JSON.stringify(frames))
 // Actual native playback and montage, not just selected-label assertions.
 for(const query of ['?montage','?','?montage&stale']){
  await page.evaluate(()=>localStorage.clear());await page.goto(base+'/'+query)
  await page.getByLabel('Название главы 1',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Предпросмотр',exact:true}).click()
  await page.getByRole('button',{name:/глава 2/}).click()
  await page.waitForFunction(cut=>document.querySelector('video')?.currentTime>(cut?6:3.2),query==='?montage').catch(async e=>{console.error(query,await page.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,duration:v.duration,ready:v.readyState,error:v.error?.message})));throw e})
  const time=await page.locator('video').evaluate(v=>v.currentTime)
  if(query==='?montage')assert(time>=6&&time<8,'cut is skipped')
  else assert(time<5,'no cut without same-source montage')
  await page.getByRole('button',{name:'Пауза',exact:true}).click()
  assert(await page.locator('video').evaluate(v=>v.paused))
  const slider=page.getByRole('slider',{name:'Перемотка',exact:true})
  assert((await slider.getAttribute('aria-valuetext')).endsWith(query==='?montage'?'0:13':'0:16'))
  const box=await slider.boundingBox()
  await slider.click({position:{x:box.width/2,y:box.height/2}})
  const sought=await page.locator('video').evaluate(v=>v.currentTime)
  assert(Math.abs(sought-(query==='?montage'?9.5:8))<.7,'edited timeline maps to source time')
  await page.getByRole('button',{name:'Другой урок',exact:true}).click()
  await page.getByRole('button',{name:/B: глава 1/}).waitFor()
  assert.equal(await page.getByRole('button',{name:/A: глава/}).count(),0)
  await page.getByRole('button',{name:/B: глава 1/}).click()
  assert((await page.locator('video').getAttribute('src')).includes('lesson=B'))
  assert.equal(await page.locator('[data-writes]').getAttribute('data-writes'),'0')
  await page.getByRole('button',{name:'Оригинал',exact:true}).click()
  await page.getByRole('button',{name:'Перейти к главе',exact:true}).nth(1).click()
  await page.waitForFunction(()=>document.querySelector('video')?.currentTime>3.1)
  assert(await page.locator('video').evaluate(v=>v.currentTime<5),'original does not cut')
 }
 for(const platform of ['pc','iphone','ipad','android'])for(const theme of ['light','dark'])for(const n of [0,4,40]){
  await page.setViewportSize({width:{pc:1280,iphone:390,ipad:1180,android:412}[platform],height:850})
  await page.evaluate(()=>localStorage.clear());await page.goto(base+'/?n='+n)
  await page.evaluate(({platform,theme})=>{document.documentElement.dataset.platform=platform;document.documentElement.dataset.theme=theme},{platform,theme})
  await page.getByRole('button',{name:'Предпросмотр',exact:true}).click()
  await page.waitForTimeout(300)
  assert.equal(await page.locator('textarea,input:not([type=range])').count(),0)
  assert.equal(await page.getByText('Изменить',{exact:true}).count(),0)
  assert.equal(await page.getByText('Реплики',{exact:true}).count(),0)
  assert.equal(await page.getByText('Таймкоды',{exact:true}).count(),n?1:0)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
  if(n===4)await page.screenshot({path:join(evidence,`${platform}-${theme}-preview.png`)})
  if(n===40)for(const f of [0,.5,1]){
   const masks=await page.evaluate(f=>{
    const list=[...document.querySelectorAll('div')].find(e=>e.style.paddingRight==='10px'&&e.style.overflowY==='auto')
    if(!list)throw Error('No chapter scroll container')
    list.scrollTop=f*(list.scrollHeight-list.clientHeight)
    return {scrollable:list.scrollHeight>list.clientHeight}
   },f)
   assert(masks.scrollable)
   await page.waitForTimeout(100)
   const mask=await page.evaluate(()=>[...document.querySelectorAll('div')].find(e=>e.style.paddingRight==='10px'&&e.style.overflowY==='auto').style.maskImage)
   assert(mask.includes('gradient'))
   await page.screenshot({path:join(evidence,`${platform}-${theme}-scroll-${f}.png`)})
  }
 }
 assert.deepEqual(errors,[])
 console.log('PASS real editor original/preview, draft retention, no writes, playback, cut/source identity, timeline seek, A/B; 4 platforms × 2 themes, 0/4/40 chapters and scroll')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
