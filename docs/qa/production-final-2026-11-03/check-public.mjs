import {chromium} from '/Users/dany/Cursor/student-dashboard/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='/Users/dany/Cursor/student-dashboard/docs/qa/production-final-2026-11-03',base='https://edu-study-app.vercel.app',sha='3601666e22f1529dad1811ba48b1940adb2d8417';
const results=[]; const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const phase of ['before','after']){
  if(phase==='after'||results.length===0){
   for(const file of ['release','version']){const r=await fetch(`${base}/${file}.json?qa=${Date.now()}`);assert.equal(r.status,200);const j=await r.json();assert.equal(j.commit,sha);writeFileSync(`${dir}/${file}-${phase}.json`,JSON.stringify(j,null,2));}
  }
  if(phase==='after')break;
  for(const width of [320,390,1440])for(const theme of ['light','dark'])for(const route of ['/login','/teacher']){
   const context=await browser.newContext({viewport:{width,height:width===320?568:width===390?844:900},colorScheme:theme,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'/#'+route,{waitUntil:'domcontentloaded'});
    const email=page.locator('input[type=email]'),password=page.getByPlaceholder('Пароль',{exact:true});
    await email.fill(`qa-${width}-${theme}@example.invalid`);await password.fill('UI-check-only-1922');
    const toggle=page.getByRole('button',{name:'Показать пароль',exact:true});
    const before=await toggle.boundingBox();await toggle.click();assert.equal(await page.getByRole('button',{name:'Скрыть пароль',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('input').filter({visible:true}).count()>0,true);
    assert.equal(await page.locator('input[type=text]').filter({has:undefined}).count()>=1,true);
    await page.getByRole('button',{name:'Скрыть пароль',exact:true}).click();
    assert.equal(await password.inputValue(),'UI-check-only-1922');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`overflow ${overflow}`);assert.deepEqual(errors,[]);
    await page.screenshot({path:`${dir}/${width}-${theme}-${route.slice(1)}.png`,fullPage:true});results.push({width,theme,route,status:'PASS',toggle:before,overflow,errors});console.log('PASS',width,theme,route);
   }catch(e){results.push({width,theme,route,status:'FAIL',error:String(e),errors});}finally{await context.close()}
  }
 }
}finally{await browser.close();writeFileSync(dir+'/results.json',JSON.stringify({sha,browser:'Chrome desktop emulation',results},null,2));}
console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,total:results.length,failed:results.filter(r=>r.status==='FAIL')},null,2));
