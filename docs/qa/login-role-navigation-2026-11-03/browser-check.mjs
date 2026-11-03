import { chromium } from '/tmp/iskra-icon-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/Users/dany/Cursor/student-dashboard/docs/qa/login-role-navigation-2026-11-03';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[];
try {
for(const theme of ['light','dark']) for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[1024,500]]) {
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
 await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [role,path,asset] of [['ученика','login','practice'],['препода','teacher','reminders']]) {
  await page.goto('http://127.0.0.1:5306/#/'+path);
  await page.getByRole('heading',{name:'Вход для '+role,exact:true}).waitFor();
  await page.locator(`img[src$="/${asset}.png"]`).evaluate(e=>e.decode());
  await page.waitForTimeout(450);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const back=page.getByRole('button',{name:'Выбрать роль',exact:true});
  const target=await back.boundingBox();assert.ok(target.height>=44);
  for(const pos of ['start','middle','end']) {
   await page.evaluate(pos=>{for(const e of document.querySelectorAll('div'))if(/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=pos==='start'?0:pos==='middle'?(e.scrollHeight-e.clientHeight)/2:e.scrollHeight},pos);
   await page.waitForTimeout(80);
   const masks=await page.evaluate(()=>[...document.querySelectorAll('div')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.clientHeight>0).map(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight,mask:getComputedStyle(e.parentElement).maskImage})));
   for(const m of masks) { const colors=m.mask.match(/rgba?\([^)]+\)|transparent/g)||[];const transparent=c=>c==='transparent'||(c?.startsWith('rgba')&&Number(c.match(/[\d.]+/g)?.[3])===0); assert.equal(transparent(colors[0]),m.top>2);assert.equal(transparent(colors.at(-1)),m.top+m.height<m.total-2); }
   if([320,1440].includes(width))await page.screenshot({path:`${out}/${path}-${theme}-${width}-${pos}.png`});
  }
  const password=page.getByPlaceholder('Пароль',{exact:true});await password.fill('Example-only');
  await page.getByRole('button',{name:'Показать пароль',exact:true}).click();await page.getByRole('button',{name:'Скрыть пароль',exact:true}).click();assert.equal(await password.inputValue(),'Example-only');
  await page.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await page.getByRole('button',{name:'Отправить письмо',exact:true}).waitFor();await page.getByRole('button',{name:/Назад ко входу/}).click();assert.equal(await password.inputValue(),'Example-only');
  await back.focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();
  for(let repeat=0;repeat<([320,1440].includes(width)?5:1);repeat++) {
   for(const next of ['ученик','препод']) {
    // Capture frames starting before interaction.
    await page.evaluate(()=>{window.__roleFrames=[];let n=0;function sample(){window.__roleFrames.push({time:performance.now(),hash:location.hash,heading:document.querySelector('h1,h3')?.textContent});if(++n<45)requestAnimationFrame(sample)}requestAnimationFrame(sample)});
    await page.getByRole('button',{name:new RegExp('Я '+next)}).click();await page.getByRole('heading',{name:next==='ученик'?'Вход для ученика':'Вход для препода',exact:true}).waitFor();await page.waitForTimeout(450);
    if(repeat===0)await fs.writeFile(`${out}/frames-${path}-${theme}-${width}-${next}.json`,JSON.stringify(await page.evaluate(()=>window.__roleFrames)));
    await page.getByRole('button',{name:'Выбрать роль',exact:true}).click();await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();
   }
  }
  await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor({state:'hidden'});
  results.push({role,theme,width,height,target,checks:['heading','asset decoded','no horizontal overflow','scroll edges','password visibility','reset/back','keyboard return','repeated cycles both roles','Escape']});
 }
 await context.close();
}
assert.deepEqual(errors,[]);
await fs.writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));console.log('PASS',results.length,'role/theme/viewport configurations');
} catch(e) {await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),results,errors},null,2));throw e} finally {await browser.close()}
