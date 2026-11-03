// Run the actual consent component/helper with delayed Auth/HTTP responses.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {chromium} from 'playwright'
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Consent from './src/pages/teacher/OAuthConsentPage';let root;window.mount=()=>{root=createRoot(document.querySelector('main'));root.render(<Consent/>)};window.unmount=()=>root.unmount();window.mount();`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'controlled auth',setup(b){
 b.onResolve({filter:/(?:\.\.\/\.\.\/lib\/supabase|^\.\/supabase)$/},()=>({path:'auth',namespace:'fixture'}))
 b.onResolve({filter:/^\.\/TeacherLoginPage$/},()=>({path:'login',namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='auth'?"export const supabase={auth:window.testAuth,rpc:async()=>({data:true})},SUPABASE_URL='https://backend.fixture.invalid',SUPABASE_KEY='public-fixture';":"export default function Login(){return null}"}))
}}]})
const browser=await chromium.launch(process.env.CI?{headless:true}:{channel:'chrome',headless:true})
async function fixture(){
 const page=await browser.newPage();page.setDefaultTimeout(5000)
 await page.route('https://iskra.fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<main></main>'}))
 await page.route('https://callback.fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:'Callback'}))
 await page.goto('https://iskra.fixture.invalid/oauth/consent?authorization_id=shared-authorization')
 await page.evaluate(()=>{
  let owner='A',listener;const jobs=new Map();window.posts=[]
  window.pending=kind=>new Promise(resolve=>jobs.set(kind,resolve));window.settle=(kind,value)=>{jobs.get(kind)(value);jobs.delete(kind)};window.started=k=>jobs.has(k)
  window.switchOwner=n=>{owner=n;listener?.('SIGNED_IN',{user:{id:n}})}
  window.testAuth={async getUser(){return {data:{user:{id:owner,email:owner+'@example.invalid'}}}},async getSession(){return {data:{session:{user:{id:window.nextSession||owner},access_token:'session-'+owner}}}},onAuthStateChange(cb){listener=cb;return {data:{subscription:{unsubscribe(){listener=undefined}}}}},oauth:{async getAuthorizationDetails(){return {data:{client:{id:'client-1',name:'QA MCP Client'},scope:'openid'}}}}}
  window.fetch=async(url,options)=>{window.posts.push({url:String(url),authorization:options.headers.Authorization,action:JSON.parse(options.body).action});return window.pending('consent')}
 })
 await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByText('A@example.invalid',{exact:true}).waitFor();return page
}
const flush=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
try{
 let page=await fixture()
 await page.evaluate(()=>{window.nextSession='B'})
 await page.getByRole('button',{name:'Разрешить доступ',exact:true}).click();await page.getByText('Аккаунт изменился. Обновите страницу подключения.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.posts.length),0);await page.close()
 for(const close of [false,true]){
  page=await fixture();await page.getByRole('button',{name:'Разрешить доступ',exact:true}).click();await page.waitForFunction(()=>window.started('consent'))
  assert.deepEqual(await page.evaluate(()=>window.posts[0]),{url:'https://backend.fixture.invalid/auth/v1/oauth/authorizations/shared-authorization/consent',authorization:'Bearer session-A',action:'approve'})
  if(close){await page.evaluate(()=>window.unmount());await page.evaluate(()=>window.switchOwner('B'));await page.evaluate(()=>window.mount());await page.getByText('B@example.invalid',{exact:true}).waitFor()}
  else await page.evaluate(()=>window.switchOwner('B'))
  await page.evaluate(()=>window.settle('consent',{ok:true,json:async()=>({redirect_url:'https://callback.fixture.invalid/?code=late-A'})}));await flush(page)
  assert.ok(page.url().startsWith('https://iskra.fixture.invalid/oauth/consent'),'late consent redirected new owner')
  if(close)assert.equal(await page.getByText('B@example.invalid',{exact:true}).count(),1)
  else await page.getByText('Аккаунт изменился. Обновите страницу подключения.',{exact:true}).waitFor()
  await page.close()
 }
 page=await fixture();await page.getByRole('button',{name:'Не сейчас',exact:true}).click();await page.waitForFunction(()=>window.started('consent'));assert.equal(await page.evaluate(()=>window.posts[0].action),'deny');await page.evaluate(()=>window.settle('consent',{ok:true,json:async()=>({redirect_url:'https://callback.fixture.invalid/?error=access_denied'})}));await page.waitForURL('https://callback.fixture.invalid/**');await page.close()
 console.log('PASS consent: confirmed identity, captured bearer, owner change, unmount/remount, late approval and denial redirect')
}finally{await browser.close()}
