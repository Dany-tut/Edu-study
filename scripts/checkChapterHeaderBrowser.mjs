import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { readFile,writeFile,mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'playwright')
const out='.build/chapter-header',evidence=process.env.ISKRA_QA_OUTPUT||'.build/chapter-header-qa'
await mkdir(evidence,{recursive:true})
await build({entryPoints:['scripts/fixtures/chapterHeader.tsx'],entryNames:'app',bundle:true,jsx:'automatic',format:'esm',outdir:out,loader:{'.svg':'file','.png':'file','.woff2':'file'},define:{'import.meta.env':JSON.stringify({DEV:true,PROD:false,VITE_SUPABASE_URL:'https://qa.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'fixture'})},plugins:[{name:'fixture-db',setup(b){b.onLoad({filter:/\/supabase\.ts$/},()=>({loader:'ts',contents:`export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:null}})}};export const SUPABASE_URL='https://qa.invalid';export const SUPABASE_KEY='fixture'`}))}}]})
await writeFile(out+'/app.css',(await postcss([tailwindcss(),autoprefixer()]).process(await readFile(out+'/app.css','utf8'),{from:out+'/app.css'})).css)
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname
 if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script>')}
 else if(path==='/app.js'||path==='/app.css'){res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(out+path))}
 else res.writeHead(404).end()
}catch{res.writeHead(500).end()}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:process.env.ISKRA_BROWSER_CHANNEL||'chromium'})
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 for(const platform of ['pc','iphone','ipad','android'])for(const theme of ['light','dark']){
  let left
  for(const n of [0,10,100]){
   await page.setViewportSize({width:platform==='pc'?(n===10?1440:1280):platform==='iphone'?390:platform==='ipad'?1180:412,height:850})
   await page.goto(`http://127.0.0.1:${server.address().port}/?n=${n}`)
   await page.evaluate(({platform,theme})=>{document.documentElement.dataset.platform=platform;document.documentElement.dataset.theme=theme},{platform,theme})
   await page.getByRole('tab',{name:'По тексту',exact:true}).waitFor()
   const g=await page.evaluate(()=>{
    const title=document.querySelector('.chapter-header-title').getBoundingClientRect(),modes=document.querySelector('.chapter-header-modes').getBoundingClientRect(),track=document.querySelector('[role=tablist]'),tabs=[...document.querySelectorAll('[role=tab]')],r=track.getBoundingClientRect(),a=tabs[0].getBoundingClientRect(),b=tabs[1].getBoundingClientRect()
    return {top:modes.top,bottom:title.bottom,left:modes.left,gap:modes.left-title.right,start:a.left-r.left,end:r.right-b.right,overflow:b.right>r.right,labels:tabs.every(e=>e.scrollWidth<=e.clientWidth),radius:getComputedStyle(track).borderRadius,inner:getComputedStyle(tabs[0]).borderRadius}
   })
   if(platform==='pc'){
    assert(g.top<g.bottom);assert.equal(g.gap,12);assert(g.labels&&!g.overflow);assert(Math.abs(g.start-g.end)<1);assert.equal(g.radius,'11px');assert.equal(g.inner,'7px')
    if(left!==undefined)assert.equal(left,g.left);left=g.left
   }else{assert(g.top>=g.bottom);assert.equal(g.radius,'999px');assert.equal(g.inner,'999px')}
   for(const label of ['По слайдам','По тексту']){const tab=page.getByRole('tab',{name:label,exact:true});await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true')}
   await page.locator('.chapter-header').screenshot({path:join(evidence,`${platform}-${theme}-header-${n}.png`)})
   if(n===100)for(const fraction of [0,.5,1]){
    await page.evaluate(f=>{const el=[...document.querySelectorAll('.timecode-editor div')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight);if(!el)throw Error('Missing chapter scroller');el.scrollTop=(el.scrollHeight-el.clientHeight)*f},fraction)
    await page.waitForTimeout(100);await page.screenshot({path:join(evidence,`${platform}-${theme}-${fraction}.png`)})
   }
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS real chapter header: geometry, radii, modes, counts0/10/100, scroll;4platforms×2themes')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
