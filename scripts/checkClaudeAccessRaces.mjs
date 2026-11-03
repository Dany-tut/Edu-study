// Real React lifecycle and useAsyncTask, controlled Auth/clipboard/HTTP promises.
// node scripts/checkClaudeAccessRaces.mjs (or set ISKRA_BROWSER_CHANNEL=chromium)
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const bundle = await build({
  stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Card from './src/components/teacher/ClaudeAccessCard';
    let root; window.mount = () => {root=createRoot(document.querySelector('main'));root.render(<Card/>);};
    window.unmount=()=>root.unmount(); window.mount();
  `, loader:'tsx', resolveDir:process.cwd() },
  bundle:true, write:false, jsx:'automatic', loader:{'.css':'empty'},
  plugins:[{name:'controlled services',setup(b){
    b.onResolve({filter:/^\.\.\/\.\.\/lib\/supabase$/},()=>({path:'auth',namespace:'fixture'}))
    b.onResolve({filter:/^\.\.\/ConfirmHost$/},()=>({path:'confirm',namespace:'fixture'}))
    b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='auth'
      ? "export const supabase={auth:window.testAuth}, SUPABASE_KEY='test', SUPABASE_URL='https://fixture.invalid';"
      : 'export const confirmDialog=()=>window.pending("confirm");'}))
  }}],
})
const browser=await chromium.launch({ channel:process.env.ISKRA_BROWSER_CHANNEL || 'chrome' })
try {
  const page=await browser.newPage()
  page.setDefaultTimeout(3500)
  await page.setContent('<main></main>')
  await page.evaluate(()=>{
    const jobs=new Map()
    window.pending=(kind)=>new Promise((resolve,reject)=>jobs.set(kind,{resolve,reject}))
    window.settle=(kind,value,success=true)=>{const job=jobs.get(kind);jobs.delete(kind);success?job.resolve(value):job.reject(new Error('late failure'))}
    window.started=kind=>jobs.has(kind)
    let owner='A', listener
    window.reads=[]; window.deletes=[]
    const session=()=>({user:{id:owner},access_token:'session-'+owner})
    window.switchOwner=next=>{owner=next;listener?.('SIGNED_IN',session())}
    window.testAuth={
      onAuthStateChange(cb){listener=cb;cb('INITIAL_SESSION',session());return {data:{subscription:{unsubscribe(){listener=undefined}}}}},
      async getSession(){return {data:{session:window.nextSession ?? session()}}},
      oauth:{async listGrants(){window.reads.push(owner);return {data:[{client:{id:'shared-client',name:'Приложение '+owner}}]}}}
    }
    window.fetch=async (url,opts)=>{
      if(opts.method==='DELETE'){
        window.deletes.push([String(url),opts.headers.Authorization])
        return await window.pending('delete') // intentionally ignores signal
      }
      return {ok:true,json:async()=>({resource:'https://fixture.invalid/functions/v1/iskra-mcp',authorization_servers:['https://fixture.invalid/auth/v1']})}
    }
    Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>window.pending('copy')}})
  })
  await page.addScriptTag({content:bundle.outputFiles[0].text})
  const revoke=page.getByRole('button',{name:'Отозвать доступ',exact:true})
  const copy=page.getByRole('button',{name:'Скопировать адрес',exact:true})
  const owner=n=>page.getByText('Приложение '+n,{exact:false}).last().waitFor()
  const started=k=>page.waitForFunction(k=>window.started(k),k)
  const settle=(kind,value,ok=true)=>page.evaluate(([k,v,s])=>window.settle(k,v,s),[kind,value,ok])
  const switchTo=async n=>{await page.evaluate(n=>window.switchOwner(n),n);await owner(n)}
  const flush=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
  const reads=()=>page.evaluate(()=>window.reads.length)
  async function noNotice(){
    await flush()
    assert.equal(await page.getByText(/Доступ отозван\.|Не удалось отозвать|Адрес скопирован\.|Не удалось скопировать/).count(),0)
  }
  await owner('A')
  await revoke.click();await started('confirm');await switchTo('B');await settle('confirm',true);await noNotice()
  assert.equal(await page.evaluate(()=>window.deletes.length),0,'obsolete confirmation issued DELETE')
  await revoke.click();await started('confirm')
  await page.evaluate(()=>{window.nextSession={user:{id:'C'},access_token:'session-C'}})
  await settle('confirm',true);await noNotice();assert.equal(await page.evaluate(()=>window.deletes.length),0)
  await page.evaluate(()=>{window.nextSession=null})
  await revoke.click();await started('confirm');await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))
  await owner('B');await settle('confirm',true);await noNotice();assert.equal(await page.evaluate(()=>window.deletes.length),0)
  for(const success of [false,true]){
    await switchTo('A');await revoke.click();await started('confirm');await settle('confirm',true);await started('delete')
    assert.deepEqual((await page.evaluate(()=>window.deletes.at(-1))),['https://fixture.invalid/auth/v1/user/oauth/grants?client_id=shared-client','Bearer session-A'])
    await switchTo('B');const before=await reads()
    await settle('delete',{ok:true},success);await noNotice()
    assert.equal(await reads(),before,'late revoke refreshed B')
  }
  for(const kind of ['confirm','delete','copy']){
    if(kind==='copy')await copy.click();else await revoke.click()
    if(kind==='delete'){await started('confirm');await settle('confirm',true)}
    await started(kind);const count=await page.evaluate(()=>window.deletes.length)
    await page.evaluate(()=>window.unmount());await page.evaluate(()=>window.mount());await owner('B')
    const before=await reads();await settle(kind,kind==='confirm'?true:{ok:true});await noNotice()
    assert.equal(await reads(),before);assert.equal(await page.evaluate(()=>window.deletes.length),count)
  }
  for(const success of [false,true]){
    await copy.click();await started('copy')
    await page.getByRole('button',{name:'Обновить статус'}).click();await owner('B')
    await settle('copy',undefined,success);await noNotice()
  }
  await revoke.click();await started('confirm');await settle('confirm',true);await started('delete');await settle('delete',{ok:true})
  await page.getByText('Доступ отозван.',{exact:true}).waitFor()
  console.log('PASS: stale confirmation, pinned owner token, late revoke failure/success, unmount/remount, clipboard refresh race and current revoke.')
} finally {await browser.close()}
