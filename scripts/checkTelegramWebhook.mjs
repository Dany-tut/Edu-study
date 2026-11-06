// Execute the real Edge handler with a stub database: unauthorized requests must never write.
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const path=process.env.QA_WEBHOOK_SOURCE||'supabase/functions/tg-webhook/index.ts'
const source=transformSync(readFileSync(path,'utf8').replace(/^import .*;\s*$/gm,''),{loader:'ts',format:'cjs'}).code
async function invoke(secret,header,body,parent=false){
 let handler,writes=0
 const db={from(table){return {upsert(){writes++;return {select(){return {single:async()=>({data:{id:'fixture-thread'},error:null})}}}},async insert(){writes++;return {error:null}}}}}
 vm.runInNewContext(source,{Request,Response,Date,Deno:{env:{get:n=>n==='TELEGRAM_WEBHOOK_SECRET'?secret:'fixture'},serve:fn=>handler=fn},createClient:()=>db,handleParentCommand:async()=>parent})
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json',...(header?{'x-telegram-bot-api-secret-token':header}:{})},body:JSON.stringify(body)}))
 return {status:response.status,writes}
}
const msg={message:{message_id:1,text:'Synthetic fixture',chat:{id:1,first_name:'Fixture'}}}
for(const [secret,header] of [[undefined,undefined],[undefined,'attacker'],['configured',undefined],['configured','wrong']])assert.deepEqual(await invoke(secret,header,msg),{status:403,writes:0})
assert.deepEqual(await invoke('configured','configured',{}),{status:200,writes:0})
assert.deepEqual(await invoke('configured','configured',msg),{status:200,writes:2})
// /start p_<код> и /stop родителя обрабатывает parentLink и не пишет их в обращения.
assert.deepEqual(await invoke('configured','configured',msg,true),{status:200,writes:0})
console.log('Telegram webhook: 7 authorization/handler cases passed; missing configuration denies writes')
