// Read-only local browser run; requires the private synthetic teacher fixture.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'/tmp/iskra-icon-qa/node_modules/playwright/index.mjs');
const base=process.env.ISKRA_QA_ORIGIN||'http://127.0.0.1:5297';assert.equal(new URL(base).hostname,'127.0.0.1');
const fx=JSON.parse(await fs.readFile('/tmp/iskra-local-security/fixture.json'));const out='docs/qa/readiness-fixes-2026-11-03/teacher-geometry';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
async function openAt(width,height){await page.setViewportSize({width:width<1024?1440:width,height:width<1024?900:height});await page.getByRole('button',{name:'Платёж',exact:true}).click();if(width<1024)await page.setViewportSize({width,height})}
async function measure(label){
 const dialog=page.getByRole('dialog');await dialog.waitFor();const frames=[];
 for(let i=0;i<12;i++){
 const g=await dialog.evaluate(d=>{const b=d.getBoundingClientRect(),close=d.querySelector('button[aria-label="Закрыть"]')?.getBoundingClientRect();const save=[...d.querySelectorAll('button')].find(e=>e.textContent.includes('Сохранить платёж'))?.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:innerWidth,height:innerHeight,close:close?{left:close.left,right:close.right,top:close.top,bottom:close.bottom}:null,save:save?{top:save.top,bottom:save.bottom}:null}});
 assert.ok(g.left>=-1&&g.right<=g.width+1&&g.top>=-1&&g.bottom<=g.height+1,label+' dialog outside viewport');
 for(const c of [g.close,g.save].filter(Boolean))assert.ok(c.top>=g.top-1&&c.bottom<=g.bottom+1,label+' action outside dialog');frames.push(g);await page.waitForTimeout(40);}
 results.push({label,frames});
}
try{
 await page.goto(base+'/#/teacher');await page.getByPlaceholder('Email',{exact:true}).fill(fx.accounts.teacherA.email);await page.getByPlaceholder('Пароль',{exact:true}).fill(fx.accounts.teacherA.password);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByRole('button',{name:'Финансы',exact:true}).click();await page.getByRole('button',{name:'Платёж',exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Платёж',exact:true}).waitFor();
 for(const [width,height] of [[1024,720],[1280,720],[1440,900],[1920,720],[900,600],[320,568],[390,844]]){
 await openAt(width,height);await measure('open '+width+'x'+height);await page.screenshot({path:out+'/'+width+'-open.png'});await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 for(let i=0;i<5;i++){await openAt(width,height);await measure('repeat '+width+'/'+i);await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});}
 }
 await page.setViewportSize({width:1440,height:900});
 for(const delay of [1100,0,1100,0,1100]){await page.getByRole('button',{name:/^Журнал/}).first().click();if(delay)await page.waitForTimeout(delay);await page.getByRole('button',{name:'Финансы',exact:true}).click();await page.getByRole('button',{name:'Платёж',exact:true}).click();await measure('journal-finance delay '+delay);await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify({scope:'Actual frozen production frontend and local synthetic Auth/API; no payment mutations. Widths below 1024 resize an already-open desktop payment modal; mobile finance entry is unavailable in this shell and is not accepted by this test',results,errors},null,2));console.log('PASS',results.length,'geometry states');
}catch(error){await fs.writeFile(out+'/partial.json',JSON.stringify({results,errors,error:String(error)},null,2));await page.screenshot({path:out+'/failure.png'});throw error}finally{await browser.close()}
