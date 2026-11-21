import {enqueueChapterSave} from '../src/lib/chapterSaveQueue.ts'
import assert from 'node:assert/strict'
import {sentenceTitle,titleConcern,prepareSlideChapters,chapterPayload,rebaseChapterLessons,hasChapterVariant} from '../src/lib/chapterVariants.ts'
import {taxonCase} from '../src/lib/taxonCase.ts'
import {saveLessonChapters} from '../src/lib/saveLessonChapters.ts'
for(const text of ['V гч ···','sm rч ···','mm o ···','om V','мт ч ···','mm ч ···']) assert.ok(titleConcern(text),text)
assert.equal(sentenceTitle('ДРУГИЕ ЖГУТИКОНОСЦЫ'),'Другие жгутиконосцы')
// Таксоны после слова ранга — с заглавной; ранг строчный; общие слова не трогаем.
for (const [raw, want] of [
  ['класс ракообразные', 'класс Ракообразные'],
  ['Класс ракообразный и подтип трилобитообразные', 'Класс Ракообразный и подтип Трилобитообразные'],
  ['относится к типу членистоногих.', 'относится к типу Членистоногих.'],
  ['тип членистоногие, отряд хищные, семейство псовые', 'тип Членистоногие, отряд Хищные, семейство Псовые'],
  ['царство животные и царство грибы', 'царство Животные и царство Грибы'],
  ['тип кольчатые черви и тип плоские черви', 'тип Кольчатые черви и тип Плоские черви'],
  ['надкласс рыбы, класс птицы, класс млекопитающие', 'надкласс Рыбы, класс Птицы, класс Млекопитающие'],
  ['представители семейства розоцветных', 'представители семейства Розоцветных'],
  ['Теперь класс насекомые', 'Теперь класс Насекомые'],
  ['этот класс животных', 'этот класс животных'],
  ['класс животных', 'класс животных'],
  ['этот класс ракообразных', 'этот класс ракообразных'],
  ['тип химической связи', 'тип химической связи'],
  ['класс неорганических веществ', 'класс неорганических веществ'],
  ['класс органических соединений', 'класс органических соединений'],
  ['отдел головного мозга', 'отдел головного мозга'],
  ['порядок действий', 'порядок действий'],
  ['в классе ученики', 'в классе ученики'],
  ['тип реакции', 'тип реакции'],
  ['род Homo и класс Ракообразные', 'род Homo и класс Ракообразные'],
  ['подкласс', 'подкласс'],
]) assert.equal(taxonCase(raw), want, raw)
assert.equal(sentenceTitle('КЛАСС РАКООБРАЗНЫЕ'), 'Класс Ракообразные')
assert.equal(sentenceTitle('ПОДТИП ТРИЛОБИТООБРАЗНЫЕ ТИПА ЧЛЕНИСТОНОГИХ'), 'Подтип Трилобитообразные типа Членистоногих')
assert.equal(sentenceTitle('ДНК И РНК, pH, Na, H2O, II'),'ДНК и РНК, pH, Na, H2O, II')
for(const short of ['pH','Na','Ёж','ДНК','РНК']) {assert.equal(titleConcern(short),undefined);assert.equal(sentenceTitle(short),short)}
assert.ok(titleConcern(sentenceTitle('om V')))
const old=[{time:'00:00',seconds:0,label:'Старые главы'}]
const slides=prepareSlideChapters(Array.from({length:5},(_,i)=>({time:`00:${String(i*10).padStart(2,'0')}`,seconds:i*10,label:'ТЕМА '+i})))
assert.equal(slides[0].originalTitle,'ТЕМА 0');assert.equal(slides[0].label,'Тема 0')
const variants={source:'https://video.test/file',active:'slides',revision:2,text:old,slides,fileSignature:undefined}
assert.equal(hasChapterVariant([]),false,'an empty text variant must offer chapter generation')
assert.equal(hasChapterVariant(undefined),false,'a missing slide variant must offer slide generation')
assert.equal(hasChapterVariant(old),true,'a populated variant is available')
const patch=chapterPayload(variants)
assert.deepEqual(Object.keys(patch).sort(),['chapter_variants','timecodes'])
const lesson={id:'A',videoUrl:variants.source,timecodes:old,transcript:{segments:['keep']},theory:'keep',materials:['keep']}
const confirmed=new Map([['A',variants]])
const result=rebaseChapterLessons([lesson,{...lesson,id:'B'}],confirmed)
assert.deepEqual(result[0].timecodes,slides);assert.equal(result[0].transcript,lesson.transcript);assert.equal(result[0].materials,lesson.materials);assert.equal(result[1].timecodes,old)
assert.equal(rebaseChapterLessons([{...lesson,videoUrl:'different'}],confirmed)[0].timecodes,old)
assert.equal(rebaseChapterLessons([{...lesson,chapterVariants:{...variants,revision:3},timecodes:old}],confirmed)[0].timecodes,old)
function fake(mode){let row={updated_at:'1',youtube_url:variants.source,timecodes:old,chapter_variants:null},calls=[];return {calls,get row(){return row},from(table){let update,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},abortSignal(){return q},update(v){update=v;return q},async single(){calls.push({read:true});return {data:row,error:null}},async maybeSingle(){calls.push({table,update,filters});if(mode==='denied')return {data:null,error:{message:'RLS'}};if(mode==='conflict'){row={...row,timecodes:[{...old[0],label:'Другой автор'}]};return {data:null,error:null}};row={...row,...JSON.parse(JSON.stringify(update)),updated_at:'2'};if(mode==='lost-response')return {data:null,error:{name:'AbortError'}};return {data:row,error:null}}};return q}}}
for(const mode of ['success','lost-response']){const client=fake(mode),start=performance.now();assert.equal(await saveLessonChapters('A',variants,old,undefined,client),'2');assert.equal(client.calls.filter(c=>c.update).length,1);assert.equal(client.row.timecodes.length,5);console.log(mode,Math.round((performance.now()-start)*100)/100+'ms in-memory',client.calls.length+' requests',Buffer.byteLength(JSON.stringify(patch))+' payload bytes');await saveLessonChapters('A',variants,old,undefined,client);assert.equal(client.calls.filter(c=>c.update).length,1,'idempotent retry')}
for(const mode of ['denied','conflict']) await assert.rejects(()=>saveLessonChapters('A',variants,old,undefined,fake(mode)),/не подтверждено/)
const client=fake('success');await assert.rejects(()=>saveLessonChapters('A',{...variants,source:'other'},old,undefined,client),/Запись урока изменилась/);assert.equal(client.calls.filter(c=>c.update).length,0)
await assert.rejects(()=>saveLessonChapters('A',variants,[{...old[0],label:'stale'}],undefined,fake('success')),/другой вкладке/)
console.log('PASS chapter variants, OCR review, narrow confirmed save, RLS/timeout/CAS/idempotency, late snapshot rebasing')

let unblock; const queue={current:new Promise(r=>{unblock=r})};let writes=0
const expired=enqueueChapterSave(queue,async()=>{writes++;return true},5)
await assert.rejects(expired,/другие изменения/);unblock();await queue.current.catch(()=>{})
assert.equal(writes,0,'expired save cannot run late')
const order=[];queue.current=Promise.resolve()
await Promise.all([enqueueChapterSave(queue,async()=>{await new Promise(r=>setTimeout(r,5));order.push('A');return true}),enqueueChapterSave(queue,async()=>{order.push('B');return true})])
assert.deepEqual(order,['A','B']);console.log('PASS queue serialization and expired-wait late-write prevention')
