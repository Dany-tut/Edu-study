const {chromium}=await import(process.env.QA_PLAYWRIGHT || 'playwright')
import fs from 'node:fs'
const b=await chromium.launch({channel:'chrome'});for(const [port,tag] of [[Number(process.env.QA_PORT || 5218),process.env.QA_LABEL || 'prod']]){
const rows=[];for(const [w,h] of [[320,568]])for(const theme of ['dark'])for(const motion of ['no-preference']){
const p=await b.newPage({viewport:{width:w,height:h},reducedMotion:motion});try{await p.addInitScript(t=>localStorage.setItem('theme',t),theme);await p.goto('http://127.0.0.1:'+port+'/motion.html');await p.locator('[data-module-tab="2"]').waitFor();await p.waitForTimeout(350);
for(const id of [3,4,3,2,1,4,2,...Array.from({length:20},(_,i)=>i%2?1:4)]){
const tab=p.locator('[data-module-tab="'+id+'"]');await tab.evaluate(e=>e.scrollIntoView({inline:'center',block:'nearest',behavior:'instant'}));const sample=await tab.evaluate(e=>{const r=e.getBoundingClientRect(),point={x:r.x+r.width/2,y:r.y+r.height/2};return{point,hit:document.elementFromPoint(point.x,point.y)?.closest('[data-module-tab]')?.getAttribute('data-module-tab')}});const {point,hit}=sample;await p.mouse.click(point.x,point.y);const actual=await p.locator('[data-module-tab][aria-pressed=true]').getAttribute('data-module-tab');rows.push({w,h,theme,motion,id,point,hit,actual,status:actual===String(id)?'PASS':'FAIL'})}
}catch(e){rows.push({w,h,theme,motion,error:String(e).slice(0,200)})}finally{await p.close()}fs.writeFileSync(process.env.QA_RESULT || 'docs/qa/beta-entry-track-release/pointer.json',JSON.stringify(rows))}}
await b.close()
