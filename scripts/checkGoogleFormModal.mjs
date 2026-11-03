import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer } from 'vite'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'playwright')
const out=resolve(process.env.ISKRA_QA_OUTPUT||'node_modules/.cache/google-modal-qa');mkdirSync(out,{recursive:true})
const baseline=process.env.ISKRA_GOOGLE_MODAL_BASELINE==='1'
const oldComponent=baseline?execFileSync('git',['show','abf7986c:src/components/teacher/GoogleFormImportModal.tsx']).toString():null
const server=await createServer({cacheDir:'node_modules/.cache/google-modal-vite',plugins:[{name:'controlled-form-service',enforce:'pre',load(id){if(baseline&&id===resolve('src/components/teacher/GoogleFormImportModal.tsx'))return oldComponent;if(id===resolve('src/lib/googleFormsImport.ts'))return `export const isGoogleFormUrl=value=>/^https:\\/\\/(forms\\.gle\\/|docs\\.google\\.com\\/forms\\/)/.test(value);export const importGoogleForm=(url,signal)=>new Promise((resolve,reject)=>window.__requests.push({url,resolve,reject,signal}));`}}],server:{host:'127.0.0.1',port:5398,strictPort:true,hmr:false,watch:{ignored:['**/*']}},optimizeDeps:{entries:['qa/google-form/index.html']}})
await server.listen();const browser=await chromium.launch(process.env.CI?{headless:true}:{channel:'chrome',headless:true}),results=[]
const luminance=c=>{const a=c.match(/[\d.]+/g).slice(0,3).map(v=>{const s=Number(v)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722}
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const data=(prefix,count=20)=>({title:prefix+' form',questions:Array.from({length:count},(_,i)=>({id:prefix+'-'+i,title:prefix+' question '+i+' '+('Long label '.repeat(7)),type:'single',choices:['One','Two','Three','Four'],required:!!i}))})
try{
for(const[width,height]of(baseline?[[320,568]]:[[320,568],[390,844],[1440,900],[1024,600]]))for(const theme of(baseline?['light']:['light','dark'])){
 const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message))
 try{
 await page.addInitScript(theme=>{window.__requests=[];window.__imports=[];localStorage.setItem('theme',theme);document.addEventListener('DOMContentLoaded',()=>document.documentElement.dataset.theme=theme,{once:true})},theme)
 await page.goto('http://127.0.0.1:5398/qa/google-form/',{waitUntil:'domcontentloaded',timeout:30000});const url=baseline?page.getByPlaceholder('https://forms.gle/...',{exact:true}):page.getByRole('textbox',{name:'Ссылка Google Forms',exact:true});await url.fill('https://forms.gle/A');await page.screenshot({path:out+`/${width}-${theme}-input.png`});await url.press('Enter');await page.waitForFunction(()=>window.__requests.length===1)
 if(baseline){await page.getByRole('button',{name:'',exact:true}).click();await url.waitFor({state:'hidden'})}else{await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>window.__requests[0].signal.aborted),true)}
 await page.getByRole('button',{name:'Открыть импорт',exact:true}).click();await url.fill('https://forms.gle/B');await url.press('Enter');await page.waitForFunction(()=>window.__requests.length===2)
 await page.evaluate(d=>window.__requests[1].resolve(d),data('B'));await page.getByText('B form',{exact:true}).waitFor();await page.evaluate(d=>window.__requests[0].resolve(d),data('A'));await page.waitForTimeout(80);assert.equal(await page.getByText('A form',{exact:true}).count(),0)
 const first=page.getByRole('checkbox',{name:data('B').questions[0].title,exact:true});await first.focus();await page.keyboard.press('Space');assert.equal(await first.getAttribute('aria-checked'),'false');await first.focus();await page.keyboard.press('Enter');assert.equal(await first.getAttribute('aria-checked'),'true')
 await page.waitForTimeout(250);const dialog=page.getByRole('dialog');const geometry=await dialog.boundingBox();assert.ok(geometry.x>=0&&geometry.x+geometry.width<=width+1);const close=page.getByRole('button',{name:'Закрыть',exact:true}),cr=await close.boundingBox();assert.ok(cr.width>=44&&cr.height>=44)
 const scroll=dialog.locator('.no-scrollbar').first();const masks=[]
 for(const ratio of[0,.5,1]){await scroll.evaluate((el,ratio)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*ratio;el.dispatchEvent(new Event('scroll'))},ratio);await page.waitForTimeout(100);masks.push(await scroll.evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight,mask:getComputedStyle(el).maskImage})));await page.screenshot({path:out+`/${width}-${height}-${theme}-${ratio}.png`})}
 assert.ok(masks[0].max>0);assert.notEqual(masks[0].mask,'none');assert.notEqual(masks[0].mask,masks[1].mask);assert.notEqual(masks[1].mask,masks[2].mask)
 const footer=page.getByRole('button',{name:'Импортировать 20',exact:true});const palette=await footer.evaluate(el=>{const c=getComputedStyle(el);return{fg:c.color,bg:c.backgroundColor}});assert.ok(contrast(palette.fg,palette.bg)>=4.5);const fr=await footer.boundingBox();assert.ok(fr.height>=44&&fr.y+fr.height<=height);assert.equal(await footer.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}),true)
 await page.evaluate(()=>window.__rejectImport=true);await footer.click();await page.getByRole('alert').waitFor();await page.evaluate(()=>window.__rejectImport=false);await footer.click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>window.__imports[1].ids),data('B').questions.map(q=>q.id))
 await page.getByRole('button',{name:'Открыть импорт',exact:true}).click();await url.fill('https://forms.gle/C');await url.press('Enter');await page.waitForFunction(()=>window.__requests.length===3);await page.evaluate(d=>window.__requests[2].resolve(d),data('C',1));const only=page.getByRole('checkbox');await only.focus();await page.keyboard.press('Space');assert.equal(await page.getByRole('button',{name:'Импортировать',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Назад',exact:true}).click();assert.equal(await url.inputValue(),'https://forms.gle/C');await close.click();assert.deepEqual(errors,[])
 results.push({width,height,theme,status:'PASS',masks,ctaContrast:contrast(palette.fg,palette.bg),actions:['A→close→B→lateA','request aborted','named URL/Enter','row Space/Enter','20 selected IDs','callback failure/retry','none disables import','back/close/reset','44px actions','scroll start/mid/end']})
 }catch(e){results.push({width,height,theme,status:'FAIL',error:String(e)});await page.screenshot({path:out+`/failure-${width}-${theme}.png`}).catch(()=>{})}
 await ctx.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))
}
}finally{await browser.close();await server.close()}
writeFileSync(out+'/runtime.json',JSON.stringify({sha:execFileSync('git',['rev-parse','HEAD']).toString().trim(),hashes:Object.fromEntries(['src/components/teacher/GoogleFormImportModal.tsx','src/components/Modal.tsx','src/lib/googleFormsImport.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),layer:'Actual component/Modal/CSS with controlled deferred service; no external API'},null,2))
console.log(JSON.stringify(results));if(results.some(r=>r.status!=='PASS'))process.exitCode=1
