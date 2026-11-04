import { chromium, webkit } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const out=new URL('.',import.meta.url).pathname,base=process.env.ISKRA_COMPACT_URL||'http://127.0.0.1:5318',results=[],errors=[],requests=[]
let activePage
const browser=await chromium.launch({channel:'chrome',headless:true})
async function scrollEdges(page,label){
 const positions=[]
 for(const pos of ['start','middle','end']){
  await page.evaluate(pos=>{for(const e of document.querySelectorAll('div'))if(/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.clientHeight)e.scrollTop=pos==='start'?0:pos==='end'?e.scrollHeight:(e.scrollHeight-e.clientHeight)/2},pos)
  await page.waitForTimeout(70)
  const areas=await page.evaluate(()=>[...document.querySelectorAll('div')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.clientHeight).map(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight,mask:getComputedStyle(e.parentElement).maskImage})))
  for(const m of areas){const colors=m.mask.match(/rgba?\([^)]+\)|transparent/g)||[];const transparent=c=>c==='transparent'||(c?.startsWith('rgba')&&Number(c.match(/[\d.]+/g)?.[3])===0);assert.equal(transparent(colors[0]),m.top>2,label+' top fade');assert.equal(transparent(colors.at(-1)),m.top+m.height<m.total-2,label+' bottom fade')}
  positions.push({pos,areas});if(label)await page.screenshot({path:out+label+'-'+pos+'.png'})
 }
 return positions
}
async function frames(page,action){
 await page.evaluate(()=>{window.__frames=[];let i=0;function sample(t){const box=document.querySelector('.auth-page-card')?.getBoundingClientRect();window.__frames.push({t,hash:location.hash,heading:document.querySelector('.auth-hero h1')?.textContent,box:box?.toJSON(),scroll:scrollY});if(++i<50)requestAnimationFrame(sample)}requestAnimationFrame(sample)})
 await action();await page.waitForTimeout(240);return await page.evaluate(()=>window.__frames)
}
try{
for(const theme of ['light','dark'])for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[1024,500],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<=390||height===390,hasTouch:width<=390||height===390,serviceWorkers:'block'})
 let observedRole=null
 await context.exposeBinding('qaRoleStored',(_,role)=>{observedRole=role})
 await context.addInitScript(t=>{localStorage.setItem('theme',t);const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){original.call(this,key,value);if(key==='iskra:oauth-role')void window.qaRoleStored(value)}},theme)
 let tokenDelay=0
 await context.route('**/*',async r=>{
  const url=new URL(r.request().url())
  if(['127.0.0.1','localhost'].includes(url.hostname))return r.continue()
  if(url.pathname.includes('/auth/v1/')){
   requests.push({path:url.pathname,method:r.request().method(),provider:url.searchParams.get('provider')})
   if(url.pathname.endsWith('/token')){if(tokenDelay)await new Promise(resolve=>setTimeout(resolve,tokenDelay));return r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',msg:'Invalid login credentials'})}).catch(()=>{})}
   if(url.pathname.endsWith('/recover')||url.pathname.endsWith('/otp'))return r.fulfill({status:200,contentType:'application/json',body:'{}'})
   if(url.pathname.endsWith('/verify'))return r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'otp_expired',msg:'Token has expired or is invalid'})})
   if(url.pathname.endsWith('/authorize')){return r.fulfill({status:200,contentType:'text/html',body:'<p>QA OAuth boundary. No provider contacted.</p>'})}
   return r.fulfill({status:200,contentType:'application/json',body:'{}'})
  }
  return r.abort()
 })
 const page=await context.newPage();activePage=page;page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 for(const [role,route,title,asset] of [['student','login','Вход для ученика','practice'],['teacher','teacher','Вход для препода','reminders']]){
  const url=base+'/#/'+route
  await page.goto(url);await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.locator('.auth-hero-art').evaluate(e=>e.decode());await page.waitForTimeout(250)
  const prefix=`${role}-${theme}-${width}`
  const geometry=await page.evaluate(()=>{
   const b=s=>document.querySelector(s).getBoundingClientRect().toJSON(),inputs=[...document.querySelectorAll('.auth-input')]
   const hero=b('.auth-hero'),art=b('.auth-hero-art'),copy=b('.auth-hero-copy')
   return {hero,art,copy,card:b('.auth-page-card'),overflow:document.documentElement.scrollWidth>innerWidth,inputs:inputs.map(e=>({font:getComputedStyle(e).fontSize,height:e.getBoundingClientRect().height})),scrolling:[...document.querySelectorAll('div')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.clientHeight).map(e=>({height:e.clientHeight,total:e.scrollHeight}))}
  })
  assert.equal(geometry.overflow,false);assert.ok(geometry.art.x>=geometry.copy.right-1);assert.ok(geometry.inputs.every(e=>parseFloat(e.font)>=16&&e.height>=44))
  const apple=page.getByRole('button',{name:'Продолжить с Apple',exact:true}),google=page.getByRole('button',{name:'Продолжить с Google',exact:true})
  assert.equal((await apple.innerText()).trim(),'Apple');assert.equal((await google.innerText()).trim(),'Google');assert.equal(await apple.locator('svg').count(),1);assert.equal(await google.locator('svg').count(),1)
  const ab=await apple.boundingBox(),gb=await google.boundingBox();assert.ok(Math.abs(ab.y-gb.y)<1);assert.ok(ab.height>=44&&gb.height>=44)
  if(width===390){assert.ok(geometry.scrolling.every(e=>e.total<=e.height+1),prefix+' must fit regular phone')}
  const edges=await scrollEdges(page,[320,390,1440].includes(width)?prefix:null)
  const mainForm=page.locator('form').first(),email=mainForm.getByPlaceholder('Email',{exact:true}),pass=mainForm.getByPlaceholder('Пароль',{exact:true})
  await email.fill('qa-'+role+'@example.invalid');await pass.fill('Example-123')
  for(let i=0;i<5;i++){await page.getByRole('button',{name:'Показать пароль',exact:true}).click();await page.getByRole('button',{name:'Скрыть пароль',exact:true}).click()}
  assert.equal(await pass.inputValue(),'Example-123')
  await page.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await page.getByRole('button',{name:/Назад ко входу/}).click();assert.equal(await pass.inputValue(),'Example-123')
  // Controlled refusal, not a real login.
  await mainForm.getByRole('button',{name:'Войти',exact:true}).click();await page.getByText('Неверный email или пароль',{exact:false}).waitFor();assert.equal(await pass.inputValue(),'Example-123')
  if([320,1440].includes(width)){
   tokenDelay=700;await mainForm.getByRole('button',{name:'Войти',exact:true}).click();await page.getByRole('button',{name:'Отмена',exact:true}).click();tokenDelay=0;await page.waitForTimeout(750);assert.equal(await pass.inputValue(),'Example-123')
   await page.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await page.getByRole('button',{name:'Отправить письмо',exact:true}).click();await page.getByRole('heading',{name:'Проверьте почту',exact:true}).waitFor();await page.getByRole('button',{name:'Вернуться ко входу',exact:true}).click()
   if(role==='teacher'){
    const toggle=page.getByRole('button',{name:'Войти по коду из письма',exact:true});await toggle.click();const codeForm=page.locator('form').nth(1);await codeForm.getByPlaceholder('Email',{exact:true}).fill('code-teacher@example.invalid');await codeForm.getByRole('button',{name:'Отправить код',exact:true}).click();await codeForm.getByPlaceholder('Код из письма',{exact:true}).fill('123456');await codeForm.getByRole('button',{name:'Войти',exact:true}).click();await codeForm.getByRole('alert').waitFor();await scrollEdges(page,prefix+'-code');await codeForm.getByRole('button',{name:'Изменить почту',exact:true}).click();await toggle.click()
   }
   const transitions=[]
   for(let i=0;i<5;i++){
    transitions.push(await frames(page,async()=>{await page.getByRole('button',{name:'Выбрать роль',exact:true}).click();await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor()}))
    await page.getByRole('button',{name:role==='teacher'?/Я препод/:/Я ученик/}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor()
   }
   await fs.writeFile(out+prefix+'-frames.json',JSON.stringify(transitions))
   await page.getByRole('button',{name:'Выбрать роль',exact:true}).dblclick();await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor({state:'hidden'});await page.goto(url);await page.getByRole('heading',{name:title,exact:true}).waitFor()
   await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.emulateMedia({reducedMotion:'no-preference'})
   // Trace each social button through the real client to its outgoing URL, without contacting Apple/Google.
   for(const provider of ['apple','google']){
    await page.getByRole('button',{name:'Продолжить с '+(provider==='apple'?'Apple':'Google'),exact:true}).click();await page.waitForURL(u=>u.pathname.endsWith('/authorize'));assert.equal(new URL(page.url()).searchParams.get('provider'),provider);assert.equal(observedRole,role);await page.goto(url);await page.getByRole('heading',{name:title,exact:true}).waitFor()
   }
   await page.evaluate(()=>{localStorage.removeItem('iskra:oauth-role');localStorage.removeItem('iskra:oauth-attempt')})
  }
  results.push({role,theme,width,height,geometry,providerButtons:{apple:ab,google:gb},edges})
 }
 await context.close()
}
assert.deepEqual(errors,[])
await fs.writeFile(out+'results.json',JSON.stringify({scope:'Actual production bundle UI with intercepted synthetic auth responses. No real accounts/providers/devices.',results,errors,requests},null,2));console.log('PASS',results.length,'role/theme/viewport combinations')
}catch(e){if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:out+'failure.png'});await fs.writeFile(out+'failure-text.txt',await activePage.locator('body').innerText())};await fs.writeFile(out+'failure.json',JSON.stringify({error:String(e),results,errors,requests},null,2));throw e}finally{await browser.close()}
