import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const out='docs/qa/profile-redesign'
const browser=await chromium.launch({channel:'chrome'})
const user={id:'e80611a9-db5e-4d31-ac5b-a74b5f60a36e',email:'qa@example.test',app_metadata:{role:'teacher'},user_metadata:{name:'Учитель'}}
const results=[]
try {
for(const [width,height] of [[1440,900],[768,680],[390,844],[320,568]]) for(const theme of ['light','dark']) {
 const p=await browser.newPage({viewport:{width,height}});const errors=[];p.on('pageerror',e=>errors.push(e.message))
 await p.addInitScript(user=>localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user)
 await p.route('http://fixture.invalid/**',r=>r.fulfill({json:r.request().url().includes('/oauth/grants')?[]:r.request().url().includes('/teacher_modules')?[{meta:{email:'fixture@test.local',tests:25}}]:r.request().url().includes('/auth/v1/user')?user:r.request().url().includes('desktop_friends')?{handle:'teacher',contacts:[],searchable:true}:[]}))
 await p.goto('http://localhost:4201/qa/profile-integration/')
 await p.evaluate(th=>document.documentElement.dataset.theme=th,theme)
 const nav=p.getByRole('navigation',{name:'Разделы профиля'})
 await nav.getByRole('button',{name:'Друзья',exact:true}).waitFor()
 await p.evaluate(()=>{window.framesQA=[];function frame(){const el=document.querySelector('.teacher-profile-header');const r=el.getBoundingClientRect();window.framesQA.push([r.width,r.height]);requestAnimationFrame(frame)}frame()})
 for(const name of ['Главное','Друзья','Интеграции','Настройки','Настройки','Друзья','Главное']) {
  await nav.getByRole('button',{name,exact:true}).click()
  assert.equal(await nav.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true')
  if(name==='Настройки'){assert.equal(await p.getByLabel('Твой ник',{exact:true}).count(),0);await p.getByText('Время в расписании',{exact:true}).waitFor()}
  if(name==='Главное'){await p.getByRole('button',{name:'cat',exact:true}).click();assert(await p.getByLabel('Имя в профиле').isVisible())}
  await p.screenshot({path:`${out}/${width}-${theme}-${name}.png`})
 }
 await nav.getByRole('button',{name:'Друзья',exact:true}).click()
 await p.getByRole('button',{name:'Изменить ник и видимость',exact:true}).click()
 await p.getByLabel('Твой ник',{exact:true}).waitFor()
 assert.equal(await nav.getByRole('button',{name:'Друзья',exact:true}).getAttribute('aria-pressed'),'true')
 await p.getByRole('button',{name:'Готово',exact:true}).click()
 await p.getByRole('textbox',{name:'Точный ник'}).waitFor()
 await nav.getByRole('button',{name:'Интеграции',exact:true}).click()
 const scroll=p.locator('.teacher-page-scroll')
 for(const [label,part] of [['start',0],['middle',.5],['end',1]]) {
  await scroll.evaluate((el,part)=>el.scrollTop=(el.scrollHeight-el.clientHeight)*part,part)
  await p.waitForTimeout(100)
  await p.screenshot({path:`${out}/${width}-${theme}-scroll-${label}.png`})
 }
 const geometry=await p.evaluate(()=>({horizontal:document.documentElement.scrollWidth>innerWidth,frames:window.framesQA}))
 assert(!geometry.horizontal);assert.deepEqual(errors,[])
 results.push({width,height,theme,errors,geometry})
 await p.close()
}
await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
} finally {await browser.close()}
