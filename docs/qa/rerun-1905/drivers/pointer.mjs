const {chromium}=await import(process.env.QA_PLAYWRIGHT || 'playwright')
import fs from 'node:fs'
const b=await chromium.launch({channel:'chrome'});for(const [port,tag] of [[Number(process.env.QA_PORT || 5218),process.env.QA_LABEL || 'prod']]){
const rows=[];for(const [w,h] of [[320,568],[390,844],[844,390],[768,1024],[1440,900],[1280,600]])for(const theme of ['light','dark'])for(const motion of ['no-preference','reduce']){
const p=await b.newPage({viewport:{width:w,height:h},reducedMotion:motion});try{await p.addInitScript(t=>localStorage.setItem('theme',t),theme);await p.goto('http://127.0.0.1:'+port+'/motion.html');await p.locator('[data-module-tab="2"]').waitFor();await p.waitForTimeout(350);
for(const id of [3,4,3,2,1,4,2,...Array.from({length:20},(_,i)=>i%2?1:4)]){
const tab=p.locator('[data-module-tab="'+id+'"]');const point=await tab.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});const hit=await p.evaluate(pt=>document.elementFromPoint(pt.x,pt.y)?.closest('[data-module-tab]')?.getAttribute('data-module-tab'),point);await p.mouse.click(point.x,point.y);const actual=await p.locator('[data-module-tab][aria-pressed=true]').getAttribute('data-module-tab');rows.push({w,h,theme,motion,id,point,hit,actual,status:actual===String(id)?'PASS':'FAIL'})}
}catch(e){rows.push({w,h,theme,motion,error:String(e).slice(0,200)})}finally{await p.close()}fs.writeFileSync('docs/qa/rerun-1905/pointer-'+tag+'.json',JSON.stringify(rows))}}
await b.close()
