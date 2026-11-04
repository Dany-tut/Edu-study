import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const out=new URL('.',import.meta.url).pathname,base='http://127.0.0.1:5319',results=[],errors=[]
const browser=await chromium.launch({channel:'chrome',headless:true})
let page,controls
async function geometry(){return page.evaluate(()=>{
 const round=n=>Math.round(n*10)/10,box=e=>{const r=e.getBoundingClientRect();return {x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height)}}
 const form=document.querySelector('form');return {card:box(document.querySelector('.auth-page-card')),inputs:[...form.querySelectorAll('input')].map(box),primary:box(form.querySelector('button[type="submit"]')),social:[...document.querySelectorAll('button[data-auth-provider]')].map(box),slot:box(document.querySelector('[data-auth-feedback-slot]'))}
})}
function stable(a,b,label){assert.deepEqual(b,a,label+' geometry changed')}
async function capture(name){await page.screenshot({path:out+name+'.png'})}
async function top(){await page.evaluate(()=>{for(const e of document.querySelectorAll('div'))if(getComputedStyle(e).overflowY==='auto')e.scrollTop=0});await page.waitForTimeout(80)}
async function framesStart(){await page.evaluate(()=>{window.__authFrames=[];window.__authFramesRunning=true;function sample(t){if(!window.__authFramesRunning)return;const form=document.querySelector('form'),b=form?.querySelector('button[type="submit"]')?.getBoundingClientRect();window.__authFrames.push({t,button:b?.toJSON(),scrolls:[...document.querySelectorAll('div')].filter(e=>getComputedStyle(e).overflowY==='auto'&&e.clientHeight).map(e=>e.scrollTop),status:document.querySelector('.auth-feedback')?.textContent,hash:location.hash});requestAnimationFrame(sample)}requestAnimationFrame(sample)})}
async function framesSave(name){await page.waitForTimeout(80);const frames=await page.evaluate(()=>{window.__authFramesRunning=false;return window.__authFrames});await fs.writeFile(out+name+'-frames.json',JSON.stringify(frames))}
async function scrollEdges(prefix){
 for(const position of ['start','middle','end']){
  await page.evaluate(pos=>{for(const e of document.querySelectorAll('div'))if(getComputedStyle(e).overflowY==='auto'&&e.clientHeight)e.scrollTop=pos==='start'?0:pos==='end'?e.scrollHeight:(e.scrollHeight-e.clientHeight)/2},position);await page.waitForTimeout(100)
  const areas=await page.evaluate(()=>[...document.querySelectorAll('div')].filter(e=>getComputedStyle(e).overflowY==='auto'&&e.clientHeight).map(e=>({top:e.scrollTop,total:e.scrollHeight,height:e.clientHeight,mask:getComputedStyle(e.parentElement).maskImage})))
  for(const a of areas){const colors=a.mask.match(/rgba?\([^)]+\)|transparent/g)||[],clear=c=>c==='transparent'||(c?.startsWith('rgba')&&Number(c.match(/[\d.]+/g)?.[3])===0);assert.equal(clear(colors[0]),a.top>2);assert.equal(clear(colors.at(-1)),a.top+a.height<a.total-2)}
  await capture(prefix+'-'+position)
 }
}
try{
for(const theme of ['light','dark'])for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[1024,500]]){
 if(process.env.ISKRA_QA_QUICK && (theme!=='light'||width!==390))continue
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<400,isMobile:width<400,serviceWorkers:'block'})
 await context.addInitScript(t=>localStorage.setItem('theme',t),theme)
 controls={delay:250,codeDelay:250,token:'invalid',recover:'success'}
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url())
  if(u.hostname==='127.0.0.1'&&u.port==='5319')return route.continue()
  if(u.pathname.includes('/auth/v1/')){
   if(u.pathname.endsWith('/token')){await new Promise(r=>setTimeout(r,controls.delay));return route.fulfill({status:400,headers:{'x-supabase-api-version':'2024-01-01','access-control-expose-headers':'X-Supabase-Api-Version'},contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',msg:'Invalid login credentials'})}).catch(()=>{})}
   if(u.pathname.endsWith('/recover')){await new Promise(r=>setTimeout(r,controls.delay));return route.fulfill({status:200,contentType:'application/json',body:'{}'}).catch(()=>{})}
   if(u.pathname.endsWith('/otp')){await new Promise(r=>setTimeout(r,controls.codeDelay));return route.fulfill({status:200,contentType:'application/json',body:'{}'}).catch(()=>{})}
   if(u.pathname.endsWith('/verify')){await new Promise(r=>setTimeout(r,controls.codeDelay));return route.fulfill({status:403,headers:{'x-supabase-api-version':'2024-01-01','access-control-expose-headers':'X-Supabase-Api-Version'},contentType:'application/json',body:JSON.stringify({code:'otp_expired',error_code:'otp_expired',msg:'Token has expired or is invalid'})}).catch(()=>{})}
   return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  }
  return route.abort()
 })
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message))
 for(const [role,path,title] of [['teacher','teacher/login','Вход для препода'],['student','login','Вход для ученика']]){
  const prefix=role+'-'+theme+'-'+width
  await page.goto(base+'/#/'+path);await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.locator('.auth-hero-art').evaluate(e=>e.decode());await page.waitForTimeout(250);await top()
  const email=page.getByPlaceholder('Email',{exact:true}),password=page.getByPlaceholder('Пароль',{exact:true}),submit=page.locator('form button[type="submit"]')
  await email.fill(role+'@example.invalid');await password.fill('Example-only-123');await top();const normal=await geometry()
  assert.equal(await page.locator('[data-auth-feedback-slot]').count(),1);assert.equal(normal.slot.height,96)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(prefix+'-idle')
  await framesStart();await submit.click();await page.getByRole('button',{name:'Отмена',exact:true}).waitFor();await top();stable(normal,await geometry(),prefix+' loading');await capture(prefix+'-loading')
  await page.getByText('Неверный email или пароль',{exact:true}).waitFor();await top();stable(normal,await geometry(),prefix+' error');assert.equal(await password.inputValue(),'Example-only-123');await capture(prefix+'-error');await framesSave(prefix+'-error')
  const fields=await page.locator('form input').evaluateAll(es=>es.map(e=>({font:parseFloat(getComputedStyle(e).fontSize),described:!!e.getAttribute('aria-describedby')})));assert.ok(fields.every(e=>e.font>=16&&e.described))
  await password.fill('Another-only-123');await top();stable(normal,await geometry(),prefix+' editing clears');assert.equal(await page.locator('.auth-feedback[data-tone="idle"]').count(),1)
  for(let repeat=0;repeat<5;repeat++){await page.getByRole('button',{name:'Показать пароль',exact:true}).click();await page.getByRole('button',{name:'Скрыть пароль',exact:true}).click()}await top();stable(normal,await geometry(),prefix+' visibility')
  controls.delay=600;await submit.click();await page.getByRole('button',{name:'Отмена',exact:true}).click();await page.getByText('Действие отменено',{exact:true}).waitFor();await page.waitForTimeout(700);await top();stable(normal,await geometry(),prefix+' cancel');assert.equal(await page.getByText('Неверный email или пароль',{exact:true}).count(),0);controls.delay=250
  await page.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await top();const reset=await geometry();await framesStart();await page.getByRole('button',{name:'Отправить письмо',exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).waitFor();await top();stable(reset,await geometry(),prefix+' recovery loading');await page.getByText('Письмо отправлено',{exact:true}).waitFor();await top();stable(reset,await geometry(),prefix+' recovery success');await capture(prefix+'-success');await framesSave(prefix+'-success');assert.equal(await email.inputValue(),role+'@example.invalid');await page.getByRole('button',{name:/Назад ко входу/}).click();assert.equal(await password.inputValue(),'Another-only-123')
  if([390,1440].includes(width)){
   await top();const socialBaseline=await geometry()
   await page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');window.__qaOAuthOriginal=supabase.auth.signInWithOAuth;supabase.auth.signInWithOAuth=({provider})=>{window.__qaProvider=provider;return new Promise(resolve=>window.__qaResolveOAuth=resolve)}})
   for(const provider of ['Apple','Google']){
    await page.getByRole('button',{name:'Продолжить с '+provider,exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__qaProvider),provider.toLowerCase());await top();stable(socialBaseline,await geometry(),prefix+' '+provider+' pending');await capture(prefix+'-'+provider.toLowerCase()+'-loading');await page.getByRole('button',{name:'Отмена',exact:true}).click();await page.getByText('Вход отменён',{exact:true}).waitFor();await page.evaluate(()=>window.__qaResolveOAuth({data:{url:null},error:new Error('Network request failed')}));await page.waitForTimeout(100);await top();stable(socialBaseline,await geometry(),prefix+' '+provider+' cancelled');assert.equal(await page.getByText('Вход отменён',{exact:true}).count(),1)
   }
   await page.getByRole('button',{name:'Продолжить с Google',exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).waitFor();await page.evaluate(()=>window.__qaResolveOAuth({data:{url:null},error:new Error('Network request failed')}));await page.getByText('Нет соединения',{exact:true}).waitFor();await top();stable(socialBaseline,await geometry(),prefix+' social error');await page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');supabase.auth.signInWithOAuth=window.__qaOAuthOriginal})
  }
  if(role==='teacher'){
   await page.getByRole('button',{name:'Войти по коду из письма',exact:true}).click();await page.getByRole('heading',{name:'Вход по коду',exact:true}).waitFor();await page.getByPlaceholder('Email',{exact:true}).fill('code@example.invalid');await top();const codeBase=await geometry();const code=page.getByPlaceholder('Код из письма',{exact:true});assert.equal(await code.isDisabled(),true)
   await page.getByRole('button',{name:'Отправить код',exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).waitFor();await top();stable(codeBase,await geometry(),prefix+' code loading');await page.getByText('Код отправлен',{exact:true}).waitFor();await top();stable(codeBase,await geometry(),prefix+' code sent');await capture(prefix+'-code-success');assert.equal(await code.isEnabled(),true)
   await code.fill('123456');await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await page.getByText('Код устарел',{exact:true}).waitFor();await top();stable(codeBase,await geometry(),prefix+' code error');await capture(prefix+'-code-error');await page.getByRole('button',{name:'Изменить почту',exact:true}).click();await top();stable(codeBase,await geometry(),prefix+' change email');assert.equal(await code.inputValue(),'');await page.getByRole('button',{name:'Назад ко входу',exact:true}).click();assert.equal(await password.inputValue(),'Another-only-123')
  }
  await top();if([320,1440].includes(width))await scrollEdges(prefix+'-scroll')
  await page.getByRole('button',{name:'Выбрать роль',exact:true}).click();await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();await page.keyboard.press('Escape')
  results.push({role,theme,width,height,normal,reset,fields})
 }
 await context.close()
}
assert.deepEqual(errors,[]);await fs.writeFile(out+'results.json',JSON.stringify({results,errors,scope:'Real local UI with synthetic Auth HTTP responses. OAuth SDK boundary held for UI cancellation tests; no provider or physical device contacted.'},null,2));console.log('PASS',results.length,'role/theme/viewport configurations')
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:out+'failure.png'});await fs.writeFile(out+'failure-text.txt',await page.locator('body').innerText())}await fs.writeFile(out+'failure.json',JSON.stringify({error:String(error),results,errors},null,2));throw error}finally{await browser.close()}
