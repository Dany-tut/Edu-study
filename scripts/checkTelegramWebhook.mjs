// Execute the real Edge handler with a stub database: unauthorized requests must never write.
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const path=process.env.QA_WEBHOOK_SOURCE||'supabase/functions/tg-webhook/index.ts'
const source=transformSync(readFileSync(path,'utf8').replace(/^import .*;\s*$/gm,''),{loader:'ts',format:'cjs'}).code
async function invoke(secret,header,body,claim='Анна',parent=false,stops={}){
 let handler,writes=0
 const rpcs=[],replies=[],logged=[]
 const db={from(table){return {upsert(row){writes++;logged.push(row.last_message_text);return {select(){return {single:async()=>({data:{id:'fixture-thread'},error:null})}}}},async insert(row){writes++;logged.push(row.text);return {error:null}}}},
  async rpc(name,args){rpcs.push([name,args]);return {data:name==='tg_link_claim'?claim:(name in stops?stops[name]:1),error:null}}}
 const fetch=async(url,init)=>{replies.push(JSON.parse(init.body).text);return new Response('{}')}
 vm.runInNewContext(source,{Request,Response,Date,JSON,fetch,Deno:{env:{get:n=>n==='TELEGRAM_WEBHOOK_SECRET'?secret:'fixture'},serve:fn=>handler=fn},createClient:()=>db,handleParentCommand:async()=>parent})
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json',...(header?{'x-telegram-bot-api-secret-token':header}:{})},body:JSON.stringify(body)}))
 return {status:response.status,writes,rpcs,replies,logged}
}
const pick=({status,writes})=>({status,writes})
const msg={message:{message_id:1,text:'Synthetic fixture',chat:{id:1,first_name:'Fixture',type:'private'}}}
for(const [secret,header] of [[undefined,undefined],[undefined,'attacker'],['configured',undefined],['configured','wrong']])assert.deepEqual(pick(await invoke(secret,header,msg)),{status:403,writes:0})
assert.deepEqual(pick(await invoke('configured','configured',{})),{status:200,writes:0})
const plain=await invoke('configured','configured',msg)
assert.deepEqual(pick(plain),{status:200,writes:2})
assert.equal(plain.rpcs.length,0,'обычное сообщение не трогает привязку')
// /start <код>: привязка, ответ боту, код не попадает в журнал диалогов.
const code='0123456789abcdef0123456789abcdef'
const start=await invoke('configured','configured',{message:{...msg.message,text:`/start ${code}`}})
assert.deepEqual(JSON.parse(JSON.stringify(start.rpcs)),[['tg_link_claim',{p_code:code,p_chat:1,p_username:null,p_first_name:'Fixture'}]])
assert.match(start.replies[0],/^Анна, готово!/)
assert.ok(start.logged.every(t=>!t.includes(code)),'код ссылки записан в журнал диалогов')
const stale=await invoke('configured','configured',{message:{...msg.message,text:`/start ${code}`}},null)
assert.match(stale.replies[0],/устарела/)
// В группе /start <код> не привязывает (код мог бы увидеть кто угодно).
const group=await invoke('configured','configured',{message:{...msg.message,text:`/start ${code}`,chat:{id:-5,type:'group'}}})
assert.equal(group.rpcs.length,0)
// Правка старого сообщения не привязывает.
assert.equal((await invoke('configured','configured',{edited_message:{...msg.message,text:`/start ${code}`}})).rpcs.length,0)
// /stop гасит обе подписки: родительские отчёты и напоминания ученику.
const stopMsg={message:{...msg.message,text:'/stop'}}
const both=await invoke('configured','configured',stopMsg)
assert.deepEqual(JSON.parse(JSON.stringify(both.rpcs)).map(r=>r[0]).sort(),['parent_contact_stop_chat','tg_unlink_chat'])
assert.match(both.replies[0],/отчёты и напоминания/)
const onlyStudent=await invoke('configured','configured',stopMsg,'Анна',false,{parent_contact_stop_chat:0})
assert.match(onlyStudent.replies[0],/Напоминания отключены/)
assert.equal(onlyStudent.writes,2,'/stop ученика пишется в обращения, как раньше')
const onlyParent=await invoke('configured','configured',stopMsg,'Анна',false,{tg_unlink_chat:0})
assert.match(onlyParent.replies[0],/отчёты больше не придут/)
assert.equal(onlyParent.writes,0,'/stop родителя в обращения не пишется')
const nobody=await invoke('configured','configured',stopMsg,'Анна',false,{tg_unlink_chat:0,parent_contact_stop_chat:0})
assert.equal(nobody.replies.length,0)
// /start p_<код> и /stop родителя обрабатывает parentLink и не пишет их в обращения.
const par=await invoke('configured','configured',msg,'Анна',true)
assert.deepEqual(pick(par),{status:200,writes:0})
assert.equal(par.rpcs.length,0,'команда родителя не трогает привязку ученика')
console.log('Telegram webhook: 16 authorization/handler cases passed; parent /start handled by parentLink; /stop stops both subscriptions; missing configuration denies writes; /start code links privately without logging the code; /stop unlinks')
