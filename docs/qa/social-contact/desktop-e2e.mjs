// Only localhost. The full UI talks to the local Auth and PostgREST services.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
const base='http://127.0.0.1:5382', api='http://127.0.0.1:55321'
const out=new URL('./',import.meta.url)
const config=execFileSync('docker',['exec','supabase_kong_iskra-local-security','sh','-c','cat "$KONG_DECLARATIVE_CONFIG"'],{encoding:'utf8'})
const service=config.match(/sb_secret_[\w-]+/)[0]
const headers={apikey:service,'Content-Type':'application/json'}
let owner
const password=randomUUID()
const run=randomUUID().slice(0,8)
const browser=await chromium.launch({channel:'chrome'})
const accounts=[]
const button=(p,s)=>p.getByRole('button',{name:s,exact:true})
const rpcErrors=[]
async function student(prefix){
  const nick=prefix+run, email=nick+'@example.test'
  const response=await fetch(api+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email,password,email_confirm:true,user_metadata:{name:nick,role:'student'}})})
  assert(response.ok,'local Auth account')
  const {id}=await response.json();accounts.push(id)
  const card=await fetch(api+'/rest/v1/students',{method:'POST',headers,body:JSON.stringify({name:nick,email,auth_user_id:id,created_by:owner})})
  assert(card.ok, await card.text())
  const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'})
  await ctx.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort())
  const p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>console.error(e.message));p.on('requestfailed',r=>{if(r.url().startsWith(base)) console.error('load',r.url().split('?')[0],r.failure()?.errorText)})
  p.on('response',r=>{if(r.url().endsWith('/rpc/desktop_friends')&&r.status()>=400)rpcErrors.push(r.status())})
  await p.goto(base+'/#/login')
  await p.getByPlaceholder('Email',{exact:true}).fill(email);await p.getByPlaceholder('Пароль',{exact:true}).fill(password)
  await button(p,'Войти').click()
  await p.getByText('Согласен(а) на обработку данных.').click()
  await button(p,'Принимаю и продолжаю').click()
  return {p,nick}
}
async function open(p){await button(p,'Профиль').last().click();await p.getByText('Друзья',{exact:true}).last().click();await p.getByRole('dialog').waitFor()}
async function save(p,nick,visible){
  await p.getByLabel('Твой ник').fill(nick)
  await p.getByRole('checkbox').setChecked(visible);await button(p,'Сохранить').click()
  await p.getByText('Настройки сохранены.').waitFor()
}
try {
  const teacher=await fetch(api+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email:'owner'+run+'@example.test',password,email_confirm:true,app_metadata:{role:'teacher'}})})
  assert(teacher.ok); owner=(await teacher.json()).id; accounts.push(owner)
  const a=await student('luna_'), b=await student('sever_')
  await open(a.p);await save(a.p,a.nick,false)
  await open(b.p);await save(b.p,b.nick,false)
  await a.p.getByLabel('Точный ник').fill('@'+b.nick.toUpperCase());await button(a.p,'Найти').click()
  await a.p.getByText('Ник не найден.',{exact:false}).waitFor()
  await save(b.p,b.nick,true);await b.p.keyboard.press('Escape')
  await button(a.p,'Найти').click();await button(a.p,'Отправить заявку').click()
  await a.p.getByRole('heading',{name:'Отправленные'}).waitFor()
  assert.equal(await a.p.locator('[data-friend-section=requests] .friend-row').innerText(),'@'+b.nick+'\nОтменить')
  await button(b.p,'Уведомления').click();await b.p.getByRole('button',{name:new RegExp(a.nick+' .*Заявка в друзья')}).click()
  await button(b.p,'Принять').waitFor()
  const panel=b.p.getByRole('dialog')
  await panel.evaluate(async node => { await new Promise(requestAnimationFrame); await Promise.all(node.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))); })
  await b.p.waitForTimeout(450)
  await panel.screenshot({path:new URL('desktop-incoming.png',out).pathname})
  await b.p.setViewportSize({width:1280,height:330})
  assert.equal(await panel.getByRole('navigation',{name:'Разделы друзей'}).count(),0)
  const edges=await panel.evaluate(async node=>{
    const el=[...node.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+8 && ['auto','scroll'].includes(getComputedStyle(e).overflowY))
    if(!el) return []
    const max=el.scrollHeight-el.clientHeight, readings=[]
    for(const pos of [0,max/2,max]){
      el.scrollTop=pos
      await new Promise(done=>setTimeout(done,100))
      readings.push({top:el.scrollTop,mask:getComputedStyle(el).maskImage})
    }
    return readings
  })
  assert.equal(edges.length,3);assert.equal(new Set(edges.map(r=>r.mask)).size,3)
  await writeFile(new URL('desktop-scroll.json',out),JSON.stringify(edges,null,2))
  await b.p.setViewportSize({width:1440,height:900})
  // Direct profile route works independently of the notification.
  await b.p.keyboard.press('Escape');await open(b.p)
  await button(b.p,'Принять').click();await b.p.getByText('@'+a.nick+' теперь в друзьях.').waitFor()
  for (const [user,other] of [[a,b],[b,a]]) {
    if(user===b) await user.p.evaluate(()=>localStorage.setItem('theme','dark'))
    await user.p.reload();await open(user.p);await user.p.locator('.friend-row').filter({hasText:'@'+other.nick}).waitFor()
    assert.equal(await user.p.locator('.friend-row').count(),1)
    if(user===b) {assert.equal(await user.p.locator('html').getAttribute('data-theme'),'dark');await user.p.getByRole('dialog').screenshot({path:new URL('desktop-dark.png',out).pathname})}
  }
  assert.deepEqual(rpcErrors,[])
  await writeFile(new URL('desktop-result.txt',out),'PASS · two Chrome profiles 1440×900, password login, hidden/exact search, send, notification, direct requests, accept, bilateral list after reload. Local Auth + PostgREST.\n')
} catch(e){
  for(const c of browser.contexts())for(const p of c.pages()) console.error(new URL(p.url()).hash,(await p.locator('body').innerText()).slice(-1600))
  throw e
} finally {
  await browser.close()
  if(owner) await fetch(api+'/rest/v1/students?created_by=eq.'+owner,{method:'DELETE',headers})
  for(const id of accounts.reverse()) await fetch(api+'/auth/v1/admin/users/'+id,{method:'DELETE',headers})
}
