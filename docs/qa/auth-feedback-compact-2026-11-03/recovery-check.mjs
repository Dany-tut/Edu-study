import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const out=new URL('.',import.meta.url).pathname,b=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const role of ['teacher','student'])for(const width of [390,1440]){
 const c=await b.newContext({viewport:{width,height:900},serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const p=await c.newPage();
 await p.goto(`http://127.0.0.1:5319/qa/auth-feedback/index.html?role=${role}&recovery=1`);await p.getByPlaceholder('Новый пароль',{exact:true}).waitFor();await p.waitForTimeout(250);
 const geom=()=>p.evaluate(()=>{const b=document.querySelector('form button[type="submit"]').getBoundingClientRect(),r=document.querySelector('.auth-page-card').getBoundingClientRect();return {button:b.toJSON(),card:r.toJSON()}});const before=await geom();await p.getByPlaceholder('Новый пароль',{exact:true}).fill('123');await p.locator('form button[type="submit"]').click();await p.getByText('Слишком короткий пароль',{exact:true}).waitFor();assert.deepEqual(await geom(),before);await p.screenshot({path:out+`recovery-${role}-${width}-error.png`});
 if(role==='teacher'){
  await p.getByPlaceholder('Новый пароль',{exact:true}).fill('Example-new-only');await p.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');supabase.auth.updateUser=()=>new Promise(resolve=>window.__qaRecoveryResolve=resolve)});await p.locator('form button[type="submit"]').click();await p.getByRole('button',{name:'Отмена',exact:true}).waitFor();assert.deepEqual(await geom(),before);await p.evaluate(()=>window.__qaRecoveryResolve({data:{user:null},error:null}));await p.getByText('Пароль обновлён',{exact:true}).waitFor();assert.deepEqual(await geom(),before);assert.equal(await p.evaluate(()=>document.documentElement.dataset.qaLoginCompleted),'true');await p.screenshot({path:out+`recovery-${role}-${width}-success.png`});
 }
 await p.goto(`http://127.0.0.1:5319/qa/auth-feedback/index.html?role=${role}&expired=1`);await p.getByText('Ссылка устарела',{exact:true}).waitFor();await p.screenshot({path:out+`expired-${role}-${width}.png`});
 if(role==='student'){
  await p.evaluate(()=>sessionStorage.setItem('iskra:student-password-updated','1'));await p.goto('http://127.0.0.1:5319/#/login');await p.getByText('Пароль обновлён',{exact:true}).waitFor();assert.equal(await p.locator('[data-auth-feedback-slot]').count(),1);assert.equal(await p.evaluate(()=>sessionStorage.getItem('iskra:student-password-updated')),null);await p.screenshot({path:out+`student-confirmation-${width}.png`});
 }
 results.push({role,width,before});await c.close()
}
await fs.writeFile(out+'recovery-results.json',JSON.stringify({results,scope:'Recovery prop fixture, short-password validation and teacher updateUser SDK boundary; no actual password/session updates.'},null,2));console.log('PASS recovery',results.length)}finally{await b.close()}
