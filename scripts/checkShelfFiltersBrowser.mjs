import {chromium} from 'playwright'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const out=process.env.QA_OUT||process.env.ISKRA_QA_OUTPUT||'/tmp/iskra-shelf-filters'
process.env.VITE_SUPABASE_URL||='http://127.0.0.1:9'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY||='shelf-fixture'
const server=process.env.QA_ORIGIN?null:await createServer({cacheDir:'node_modules/.cache/shelf-filter-vite',optimizeDeps:{entries:['qa/shelf-filters/index.html']},server:{hmr:false,watch:{ignored:['**/*']},host:'127.0.0.1',port:Number(process.env.ISKRA_QA_PORT||5179),strictPort:true}})
if(server)await server.listen()
const base=process.env.QA_ORIGIN||`http://127.0.0.1:${process.env.ISKRA_QA_PORT||5179}`
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture URL required')
mkdirSync(out,{recursive:true})
const browser=await chromium.launch(process.env.CI?{headless:true}:{channel:'chrome',headless:true}),results=[]
try{
 for(const [width,height] of (process.env.ISKRA_SHELF_SINGLE?[[320,568]]:[[320,568],[390,844],[768,1024],[1440,900],[1024,600]]))for(const theme of (process.env.ISKRA_SHELF_SINGLE?['light']:['light','dark'])){
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000)
  try{
   await page.addInitScript(t=>{localStorage.setItem('theme',t);document.addEventListener('DOMContentLoaded',()=>document.documentElement.dataset.theme=t,{once:true})},theme)
   await page.goto(base+'/qa/shelf-filters/',{waitUntil:'domcontentloaded'})
   const sort=page.locator('[data-qa=sort]'),facet=page.locator('[data-qa=facet]'),subjects=page.locator('[data-qa=subjects]')
   const activate=async(button,key)=>{await button.focus();await page.keyboard.press(key)}
   await activate(sort.getByRole('button',{name:'Новые',exact:true}),'Enter')
   const oldest=sort.getByRole('button',{name:'Старые',exact:true});await activate(oldest,'Space')
   await page.waitForFunction(()=>document.querySelector('[data-qa=sort] output')?.textContent==='oldest')
   assert.equal(await sort.getByRole('button',{name:'Старые',exact:true}).first().getAttribute('aria-expanded'),'false')
   await activate(sort.getByRole('button',{name:'Старые',exact:true}).first(),'Enter')
   await sort.getByRole('button',{name:'Новые',exact:true}).focus();await page.waitForTimeout(180)
   assert.ok(await sort.getByRole('button',{name:'Новые',exact:true}).isVisible(),'Tab focus must not close sort')
   await page.keyboard.press('Escape');await sort.getByRole('button',{name:'Новые',exact:true}).waitFor({state:'hidden'})
   assert.equal(await sort.getByRole('button',{name:'Старые',exact:true}).evaluate(e=>e===document.activeElement),true)
   await activate(facet.getByRole('button',{name:'Все уровни',exact:true}),'Enter')
   await facet.getByPlaceholder('Все уровни',{exact:true}).fill('ЕГЭ')
   await activate(facet.getByRole('button',{name:'ЕГЭ',exact:true}),'Enter')
   await page.waitForFunction(()=>document.querySelector('[data-qa=facet] output')?.textContent==='ЕГЭ')
   assert.equal(await facet.getByRole('button',{name:'ЕГЭ',exact:true}).first().evaluate(e=>e===document.activeElement),true)
   await activate(subjects.getByRole('button',{name:'Выберите предмет',exact:true}),'Enter')
   await activate(subjects.getByRole('button',{name:'Химия',exact:true}),'Space')
   await page.waitForFunction(()=>document.querySelector('[data-qa=subjects] output')?.textContent==='chemistry')
   await activate(subjects.getByRole('button',{name:'Корейский',exact:true}),'Enter')
   await page.waitForFunction(()=>document.querySelector('[data-qa=subjects] output')?.textContent==='chemistry,korean')
   assert.equal(await subjects.getByRole('button',{name:'Корейский',exact:true}).getAttribute('aria-pressed'),'true')
   await page.keyboard.press('Escape');await subjects.getByRole('button',{name:'Корейский',exact:true}).waitFor({state:'hidden'})
   const trigger=subjects.getByRole('button',{name:'Химия +1',exact:true});assert.equal(await trigger.evaluate(e=>e===document.activeElement),true)
   for(let i=0;i<5;i++){await trigger.click();await subjects.getByRole('button',{name:'Корейский',exact:true}).waitFor();await page.keyboard.press('Escape');await subjects.getByRole('button',{name:'Корейский',exact:true}).waitFor({state:'hidden'})}
   await trigger.click();await subjects.getByRole('button',{name:'Химия',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-qa=subjects] output')?.textContent==='korean')
   await page.getByRole('button',{name:'Вне списка',exact:true}).click();await subjects.getByRole('button',{name:'Химия',exact:true}).waitFor({state:'hidden'})
   assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${width}-${height}-${theme}.png`})
   results.push({width,height,theme,status:'PASS',actions:['sort Enter/Space/focus/Escape','facet search/Enter/focus return','subject Space/Enter/multiselect/pressed/Escape','five reopenings','pointer toggle/outside blur']})
  }catch(e){results.push({width,height,theme,status:'FAIL',error:String(e)});await page.screenshot({path:`${out}/failure-${width}-${theme}.png`}).catch(()=>{})}
  await ctx.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))
 }
}finally{await browser.close();await server?.close()}
writeFileSync(out+'/runtime.json',JSON.stringify({sha:execFileSync('git',['rev-parse','HEAD']).toString().trim(),sourceSha256:createHash('sha256').update(readFileSync('src/components/teacher/ShelfFilters.tsx')).digest('hex'),layer:'Populated fixture with real shared components; no backend writes'},null,2))
console.log(JSON.stringify(results.map(({width,theme,status,error})=>({width,theme,status,error}))))
if(results.some(r=>r.status!=='PASS'))process.exitCode=1
