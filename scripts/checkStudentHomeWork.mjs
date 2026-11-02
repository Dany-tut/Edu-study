import assert from 'node:assert/strict'
import { build } from 'esbuild'
const result = await build({stdin:{contents:"export * from './src/lib/studentHomeWork'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:'https://stub.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'stub'})}})
const {studentHomeWork,homeModuleDebts} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))
const course={id:'chem',modules:[{id:41},{id:52},{id:63}]}
function entry(id,status,due,moduleOrder=0,selectedCourse=course){return {id,status,due,moduleOrder,course:selectedCourse,lesson:{id,number:1,title:id}}}
const today='2026-11-02'
const entries=[entry('late','current','2026-11-01'),entry('returned','returned','2026-10-29'),entry('today','current',today,2),entry('undated','current',null,2),entry('pending','submitted','2026-10-20'),entry('unknown','submitted_unknown','2026-10-20'),entry('accepted','completed','2026-10-20'),entry('passed','test_passed','2026-10-20'),entry('failed','test_low','2026-11-01',1),entry('locked','locked','2026-10-20')]
const before=JSON.stringify(entries)
const summary=studentHomeWork(entries,today)
assert.deepEqual(summary.overdue.map(e=>e.id),['returned','late','failed'])
assert.equal(summary.actions.length,5)
assert.deepEqual(summary.upcoming.map(e=>e.id),['today','undated'])
assert.deepEqual(summary.review.map(e=>e.id),['pending','unknown'])
assert.equal(summary.next.id,'returned')
assert.deepEqual(homeModuleDebts(entries,'chem',today),{41:2,52:1})
assert.deepEqual(homeModuleDebts(entries,'another-student-course',today),{})
assert.deepEqual(homeModuleDebts([...entries,entry('extra','current','2026-11-01',2,{...course,id:'other'})],'chem',today),{41:2,52:1})
assert.equal(JSON.stringify(entries),before,'Do not mutate session-owned records')
const empty=studentHomeWork([],today)
assert.deepEqual(empty.actions,[]);assert.deepEqual(empty.review,[]);assert.equal(empty.next,null)
console.log('PASS: real diary statuses, inclusive deadlines, undated work, pending results, module/course isolation, immutable records and empty account')
