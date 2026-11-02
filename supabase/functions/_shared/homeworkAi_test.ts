import { gradeViaLinali, parseGradeResult, GradeError, classifyProviderStatus } from './homeworkAi.ts'
import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1'
import type { Work } from '../hw-grade/grader.ts'
import atlas from './homeworkCriteria.json' with { type: 'json' }
const work: Work = {kind:'basic',subject:'chemistry',exam:'ege',title:'Учебная проверка',note:'',tasks:[{n:1,type:'write',statement:'Объясните восстановление железа.',reference:'Железо принимает электроны.',answer:'Железо принимает электроны.',machine:'review'}]}
const raw = () => ({tasks:[{n:1,kim_n:null,max_points:0,scale:[],elements:[{text:'Приём электронов',verdict:'yes',quote:'Железо принимает электроны.',from:'text',ref:'эталон преподавателя'}],comment:'Верно объяснено восстановление.',note:''}],comment:'Восстановление объяснено верно.',teacher_note:''})
Deno.test('paid prompt omits machine-only catalogue, preserves all scoring criteria and records safe usage',async()=>{
 for (const [key,items] of Object.entries(atlas)) {
  const [exam,subject]=key.split('_') as ['ege'|'oge','chemistry'|'biology']
  const graded=await gradeViaLinali({...work,exam,subject},[],{key:'test',fetcher:async(_input,init)=>{
   const prompt=JSON.parse(String(init?.body)).messages[1].content[0].text as string
   for (const item of items.filter(item=>'criteria' in item && item.criteria?.length)) assertEquals(prompt.includes(JSON.stringify(item)),true)
   assertEquals(prompt.includes(JSON.stringify(items[0])),false)
   assertEquals(prompt.length < JSON.stringify(items).length,true)
   return new Response(JSON.stringify({usage:{prompt_tokens:1200,completion_tokens:220,total_tokens:1420,private_trace:'ignore'},choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw())}}]}))
  }})
  assertEquals(graded.tokenUsage,{prompt_tokens:1200,completion_tokens:220,total_tokens:1420})
 }
})
Deno.test('API key is server-only and images reach the provider; custom task has feedback without invented score',async()=>{
 const graded=await gradeViaLinali(work,[{name:'t1-board.png',mediaType:'image/png',data:'AAAA'}],{key:'test-private-key',fetcher:async(input,init)=>{
  assertEquals(input,'https://api.linaliapi.com/v1/chat/completions')
  assertEquals(new Headers(init?.headers).get('authorization'),'Bearer test-private-key')
  const body=JSON.parse(String(init?.body));assertEquals(body.messages[1].content[2].type,'image_url')
  assertEquals(body.messages[1].content[2].image_url.url,'data:image/png;base64,AAAA')
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw())}}]}))
 }})
 assertEquals(graded.score,null);assertEquals(graded.tasks[0].elements[0].counted,true)
 assertEquals(JSON.stringify(graded).includes('test-private-key'),false)
})
Deno.test('unknown and incomplete criterion results are rejected, never published',()=>{
 const missing=raw();missing.tasks=[];assertThrows(()=>parseGradeResult(JSON.stringify(missing),work),GradeError)
 const invented=raw();invented.tasks[0].kim_n=99 as unknown as null;assertThrows(()=>parseGradeResult(JSON.stringify(invented),work),GradeError)
 assertThrows(()=>parseGradeResult('{not json}',work),GradeError)
})
Deno.test('provider failures expose only an error code, never response bodies or credentials',async()=>{
 for(const [status,code] of [[401,'credentials'],[402,'balance'],[429,'rate_limit'],[500,'unavailable'],[504,'timeout']] as const){
  const error=await assertRejects(()=>gradeViaLinali(work,[],{key:'private',fetcher:async()=>new Response('secret provider trace',{status})}),GradeError)
  assertEquals(error.message,code);assertEquals(JSON.stringify(error).includes('secret provider trace'),false)
 }
 assertEquals(classifyProviderStatus(429).retryable,true)
 assertEquals(classifyProviderStatus(401).retryable,false)
})
Deno.test('configuration failure does not make a paid provider request',async()=>{
 let called=false;await assertRejects(()=>gradeViaLinali(work,[],{fetcher:async()=>{called=true;return new Response()}}),GradeError,'configuration');assertEquals(called,false)
})
Deno.test('token-truncated JSON cannot masquerade as a completed grade',async()=>{
 await assertRejects(()=>gradeViaLinali(work,[],{key:'test',fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:JSON.stringify(raw())}}]}))}),GradeError,'invalid_result')
})

Deno.test('legacy credentials are never selected without explicit routing',async()=>{
 const {resolveLinaliKey}=await import('./homeworkAiKey.ts')
 assertEquals(resolveLinaliKey(undefined,'legacy-key'),undefined)
 assertEquals(resolveLinaliKey(undefined,' saved-key ',true),'saved-key')
 assertEquals(resolveLinaliKey(' dedicated-key ','legacy-key',true),'dedicated-key')
})
