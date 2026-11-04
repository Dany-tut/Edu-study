import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const out=new URL('.',import.meta.url).pathname,b=await chromium.launch({channel:'chrome',headless:true}),results=[];
for(const theme of ['light','dark'])for(const width of [320,1440]){
const c=await b.newContext({viewport:{width,height:width===320?568:900},serviceWorkers:'block'});await c.addInitScript(t=>localStorage.setItem('theme',t),theme);await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const p=await c.newPage();
for(const [role,path,title,expected] of [['teacher','teacher/login','Вход для препода',['#8876EE','#5949D2']],['student','login','Вход для ученика',['#9D8BFF','#6A5AE6']]]){
await p.goto('http://127.0.0.1:5319/#/'+path);await p.getByRole('heading',{name:title,exact:true}).waitFor();await p.waitForTimeout(250);const stops=await p.locator('.iskra-mark linearGradient').first().locator('stop').evaluateAll(es=>es.map(e=>e.getAttribute('stop-color')));assert.deepEqual(stops,expected);
for(const pos of ['start','middle','end']){await p.evaluate(pos=>{for(const e of document.querySelectorAll('div'))if(/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=pos==='start'?0:pos==='end'?e.scrollHeight:(e.scrollHeight-e.clientHeight)/2},pos);await p.waitForTimeout(80);await p.screenshot({path:out+`logo-${role}-${theme}-${width}-${pos}.png`})}results.push({role,theme,width,stops})}
await c.close()}
await fs.writeFile(out+'deep-logo-results.json',JSON.stringify(results,null,2));console.log('PASS',results.length);await b.close();
