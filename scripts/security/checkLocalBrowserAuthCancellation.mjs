// Production frontend + actual localhost Auth; hold a successful shared-session
// validation response, cancel, release, then verify storage and a fresh reload.
import fs from 'node:fs/promises'
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security'
const base=process.env.ISKRA_QA_BASE_URL||'http://127.0.0.1:5291'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local frontend required')
const coreFx=JSON.parse(await fs.readFile(root+'/fixture.json'))
if(!['localhost','127.0.0.1'].includes(new URL(coreFx.url).hostname))throw Error('Local backend required')
const out=process.env.ISKRA_QA_OUTPUT||'docs/qa/readiness-fixes-2026-11-03'
await fs.mkdir(out,{recursive:true})
const {chromium}=await import(process.env.ISKRA_PLAYWRIGHT_MODULE||'/tmp/iskra-icon-qa/node_modules/playwright/index.mjs')
const browser=await chromium.launch({channel:'chrome',headless:true})
try {const result=await (async()=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await ctx.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const p=await ctx.newPage();p.setDefaultTimeout(12000);
 try{await p.goto(base+'/#/teacher');await p.getByPlaceholder('Email',{exact:true}).fill(coreFx.accounts.teacherA.email);await p.getByPlaceholder('Пароль',{exact:true}).fill(coreFx.accounts.teacherA.password);
 let ready;const arrived=new Promise(r=>ready=r);let release;const wait=new Promise(r=>release=r);let count=0;
 await p.route('**/auth/v1/user',async route=>{const response=await route.fetch();count++;ready();await wait;await route.fulfill({response}).catch(()=>{})});
 await p.getByRole('button',{name:'Войти',exact:true}).click();await Promise.race([arrived,new Promise((_,reject)=>setTimeout(()=>reject(Error('Commit boundary missing')),12000))]);
 await p.getByRole('button',{name:'Отмена',exact:true}).click();release();await p.waitForTimeout(700);
 const check=async()=>({loginVisible:await p.getByRole('button',{name:'Войти',exact:true}).isVisible(),persistedSession:await p.evaluate(()=>Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k)&&!!localStorage.getItem(k)))});
 const beforeReload=await check();await p.reload();await p.getByRole('button',{name:'Войти',exact:true}).waitFor();const afterReload=await check();
 if(!beforeReload.loginVisible||beforeReload.persistedSession||!afterReload.loginVisible||afterReload.persistedSession)throw Error('Canceled session committed');
 const result={scope:'Actual production bundle, shared Supabase client and real local Auth; response paused after upstream /user succeeds',interceptedResponses:count,beforeReload,afterReload};await fs.writeFile(out+'/auth-browser-cancellation.json',JSON.stringify(result,null,2));return result;
 }finally{await ctx.close()}
})()
;console.log('PASS shared-client cancellation before and after reload',JSON.stringify(result));}finally{await browser.close()}
