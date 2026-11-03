import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome'})
const user={id:'e80611a9-db5e-4d31-ac5b-a74b5f60a36e',email:'qa@example.test',app_metadata:{role:'teacher'},user_metadata:{name:'Учитель длинное имя для проверки'}}
const output = process.env.QA_OUTPUT_DIR || 'docs/qa/profile-integration'
const results=[]
try {
for (const [width,height] of [[1440,900],[768,680],[390,844],[320,568]]) for (const theme of ['light','dark']) {
const p=await browser.newPage({viewport:{width,height}})
p.setDefaultTimeout(7000)
p.setDefaultNavigationTimeout(45000)
const errors=[];p.on('pageerror',e=>errors.push(e.message))
await p.addInitScript(({user,theme})=>{
localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}))
},{user,theme})
await p.route('http://fixture.invalid/**',r=>r.fulfill({json:r.request().url().includes('/oauth/grants')?[{client:{id:'fixture-claude',name:'Claude'}}]:r.request().url().includes('/teacher_modules')?[{meta:{email:'fixture@test.local',tests:25}}]:r.request().url().includes('/auth/v1/user')?user:r.request().url().includes('desktop_friends')?{handle:'teacher',contacts:[],searchable:true}:[]}))
let fail=true
await p.route('http://127.0.0.1:18764/**',async r=>{await new Promise(ok=>setTimeout(ok,220));await r.fulfill({status:fail?403:200,json:{token:'demo'}})})
await p.goto('http://localhost:4201/qa/profile-integration/')
await p.evaluate(th=>document.documentElement.dataset.theme=th,theme)
const nav=p.getByRole('navigation',{name:'Разделы профиля'})
const click=async name=>{const btn=nav.getByRole('button',{name,exact:true});await btn.click();assert.equal(await btn.getAttribute('aria-pressed'),'true')}
await nav.getByRole('button',{name:'Друзья'}).waitFor()
await p.context().grantPermissions(['clipboard-read','clipboard-write'], {origin:'http://localhost:4201'})
await p.getByRole('button',{name:'Скопировать ник teacher',exact:true}).click()
assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),'teacher')

await p.evaluate(()=>{
 window.navFrames=[]
 function frame(){const nav=document.querySelector('nav[aria-label="Разделы профиля"]'); if(!nav)return;const r=nav.getBoundingClientRect(); window.navFrames.push([r.x+r.width/2,r.y+r.height/2]);requestAnimationFrame(frame)}frame()
})
await click('Друзья')
assert.equal(await p.getByRole('navigation',{name:'Разделы друзей'}).count(),0)
for (const name of ['Поиск','Друзья']) {
  await p.getByRole('region',{name,exact:true}).waitFor()
}
await click('Настройки');await p.getByLabel('Твой ник').waitFor();await click('Главное');await click('Интеграции')
const card=p.locator('.transcription-module');await card.waitFor()
const header=p.locator('.teacher-profile-identity')
const n=await nav.boundingBox(),h=await header.boundingBox()
if(width>760){assert(Math.abs(n.x+n.width/2-width/2)<2);assert(Math.abs(n.y+n.height/2-h.y-h.height/2)<2)}
const shots=width===1440&&theme==='light'||width===320&&theme==='dark'
if(shots)await p.screenshot({path:output+'/'+width+'-'+theme+'.png'})
assert(await card.getByRole('button',{name:/Подключить компьютер/}).isDisabled())
const left=p.getByRole('link',{name:'Открыть Тестли'}), right=p.getByRole('button',{name:'Отключить',exact:true})
const [l,r]=await Promise.all([left.boundingBox(),right.boundingBox()])
assert(l&&r&&Math.abs(l.width-r.width)<1&&l.height===r.height&&l.y===r.y&&r.x>=l.x+l.width+8)
const grant=p.locator('.claude-access-grant')
await grant.waitFor()
const g=await grant.boundingBox(), revoke=await grant.getByRole('button').boundingBox()
assert(Math.abs(g.x+g.width-revoke.x-revoke.width)<1)
const guide=card.getByRole('heading',{name:'Что делать с ZIP-архивом'})
assert.equal(await guide.count(),0)
const reduced=width===390 && theme==='dark'
if(reduced)await p.emulateMedia({reducedMotion:'reduce'})
await card.evaluate(el=>{
 window.stepFrames=[]
 window.connectFrames=[]
 function sample(){
  if(!el.isConnected)return
  const button=el.querySelector('.transcription-step[data-phase="download"]')
  if(button)window.stepFrames.push(new DOMMatrix(getComputedStyle(button,'::before').transform).a)
  const connect=el.querySelector('button[data-phase="connecting"]')
  if(connect)window.connectFrames.push(new DOMMatrix(getComputedStyle(connect,'::before').transform).a)
  requestAnimationFrame(sample)
 }
 sample()
})
const dl=p.waitForEvent('download');await card.getByText('Скачать для Mac').click();assert.equal((await dl).suggestedFilename(),'iskra-transcription-mac.zip')
if(!reduced){
 assert(await card.getByRole('button',{name:/Подключить компьютер/}).isDisabled())
 assert.equal(await guide.count(),0)
}
await guide.waitFor()
const samples=await p.evaluate(()=>window.stepFrames)
if(!reduced)assert(samples.some(s=>s>0&&s<.5)&&samples.some(s=>s>.6&&s<1))

const help=card.locator('.transcription-blocked')
await help.locator('summary').focus()
await help.locator('summary').press('Enter')
const settings=help.getByRole('link',{name:'Открыть настройки Mac'})
assert.equal(await settings.getAttribute('href'),'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Security')
await help.getByText('«Все равно открыть»',{exact:true}).waitFor()
if(shots)await help.screenshot({path:output+'/blocked-'+width+'.png'})
await help.locator('summary').click()
assert(!await settings.isVisible())
assert.equal(await card.locator('.transcription-setup li').count(),3)
await card.getByRole('button',{name:/Подключить компьютер/}).click();await card.getByText('Подключаем…').waitFor();await card.getByRole('alert').waitFor();assert.equal(await card.getByText('Готово',{exact:true}).count(),0);fail=false
await card.getByRole('button',{name:/Подключить компьютер/}).click()
const disconnect=card.getByRole('button',{name:'Отключить компьютер'})
await disconnect.waitFor()
const ready=await card.getByRole('button',{name:'Готово'}).boundingBox(), off=await disconnect.boundingBox()
const row=await card.locator('.transcription-steps').boundingBox()
assert(ready.width===ready.height && ready.width<=32)
assert(Math.abs(ready.y+ready.height/2-off.y-off.height/2)<1 && Math.abs(off.x+off.width-row.x-row.width)<1)
assert(off.height>=44 && off.x>=ready.x+ready.width+4)
assert.equal(await guide.count(),0)
if(shots)await card.screenshot({path:output+'/connected-'+width+'.png'})
await disconnect.click();await card.getByText('Не подключён',{exact:true}).waitFor()
if(shots) {
 for(const [i,f] of [0,.5,1].entries()) {
  await p.evaluate(f=>{for(const [sel,key] of [['.teacher-page-scroll','scrollTop'],['.teacher-profile-header .no-scrollbar','scrollLeft']]){const el=document.querySelector(sel);el[key]=(key==='scrollTop'?el.scrollHeight-el.clientHeight:el.scrollWidth-el.clientWidth)*f}},f)
  await p.waitForTimeout(100); await p.screenshot({path:'/tmp/profile-redesign-'+width+'-'+i+'.png'})
 }
}
const geometry=await p.evaluate(async()=>{
 const sc=document.querySelector('.teacher-page-scroll'), tabs=document.querySelector('.teacher-profile-header .no-scrollbar')
 const points=[]
 for(const f of [0,.5,1]){sc.scrollTop=(sc.scrollHeight-sc.clientHeight)*f;tabs.scrollLeft=(tabs.scrollWidth-tabs.clientWidth)*f;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));points.push([sc.scrollTop,tabs.scrollLeft,tabs.parentElement.style.maskImage])}
 return points
})
const connectSamples=await p.evaluate(()=>window.connectFrames)
if(!reduced)assert(connectSamples.some(s=>s>0&&s<1))
const frames=await p.evaluate(()=>window.navFrames.length);assert.deepEqual(errors,[]);results.push({width,height,theme,reduced,downloadFrames:samples.length,connectFrames:connectSamples.length,frames,geometry,nav:n,identity:h});await p.close()
}
await fs.writeFile(output+'/check.json',JSON.stringify(results,null,2))
console.log(results.length+' profile scenarios passed')
}finally{await browser.close()}
