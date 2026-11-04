const {chromium}=await import(process.env.QA_PLAYWRIGHT || 'playwright')
import {writeFileSync} from 'node:fs'
const dir=process.env.QA_OUT || process.cwd()+'/docs/qa/rerun-1905/motion-prod', b=await chromium.launch({channel:'chrome'}), rows=[], frames=[]
try{
for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1440,900],[1280,600]])for(const theme of ['light','dark'])for(const reduced of ['no-preference','reduce']){
 const page=await b.newPage({viewport:{width,height},reducedMotion:reduced}); page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(60000)
 await page.addInitScript(t=>localStorage.setItem('theme',t),theme)
 try{
 await page.goto((process.env.QA_BASE || 'http://127.0.0.1:5218')+'/motion.html');await page.locator('[data-module-tab="2"]').waitFor()
 const id=[width,height,theme,reduced].join('-')
 await page.evaluate(()=>{window.samples=[];window.running=true;function tick(t){if(!window.running)return;const tabs=[...document.querySelectorAll('[data-module-tab]')], rect=tabs.map(x=>x.getBoundingClientRect());const nodes=[...document.querySelectorAll('[data-track-shape]')];window.samples.push([Math.round(t),Math.min(...rect.slice(1).map((r,i)=>r.left-rect[i].right)),nodes.length,Math.min(...nodes.map(n=>+getComputedStyle(n).opacity))]);requestAnimationFrame(tick)}requestAnimationFrame(tick)})
 for(const n of [3,4,3,2,1]){
 const tab=page.locator('[data-module-tab="'+n+'"]');await tab.click({position:{x:10,y:15}});await page.waitForTimeout(260);rows.push({id,element:'module '+n,action:'pointer',expected:n,actual:await page.locator('[data-module-tab][aria-pressed=true]').getAttribute('data-module-tab')})
 }
 for(const n of [4,2,...Array.from({length:20},(_,i)=>i%2?1:4)]){const tab=page.locator('[data-module-tab="'+n+'"]');await tab.press('Enter');rows.push({id,element:'module '+n,action:'rapid Enter',expected:n,actual:await page.locator('[data-module-tab][aria-pressed=true]').getAttribute('data-module-tab')})}
 await page.waitForTimeout(300)
 const locked=await page.locator('[data-module-tab="5"]').isDisabled();rows.push({id,element:'locked module 5',action:'inspect',expected:true,actual:locked})
 const sample=await page.evaluate(()=>{window.running=false;return window.samples});frames.push({id,sample});if(width===390&&reduced==='no-preference')await page.screenshot({path:dir+'/'+id+'.png'})
 }catch(e){rows.push({id:[width,height,theme,reduced].join('-'),action:'browser path',error:e.message.slice(0,300)})}finally{await page.close()}
 writeFileSync(dir+'/motion-actions.json',JSON.stringify(rows));writeFileSync(dir+'/motion-frames.json',JSON.stringify(frames))
}
}finally{await b.close()}
