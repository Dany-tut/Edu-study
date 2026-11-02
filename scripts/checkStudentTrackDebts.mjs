import assert from 'node:assert/strict'
import { build } from 'esbuild'
const result = await build({ stdin:{contents:"export * from './src/lib/studentTrackDebts'; export * from './src/components/studentTrackStand/data'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false })
const { isHomeworkOverdue, needsHomeworkAction, sortedHomeworkActions, overdueModuleCounts, makeTrackExample, SCENARIOS, TODAY } = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))
const issued = { id:'one',lessonId:'lesson',moduleId:1,title:'Домашка',required:true,state:'open',dueDate:'2026-10-31' }
assert.equal(isHomeworkOverdue(issued,TODAY),true)
for (const state of ['submitted','unknown','completed']) assert.equal(needsHomeworkAction({...issued,state}),false,`${state} is not a debt`)
for (const state of ['open','draft','returned','failed']) assert.equal(isHomeworkOverdue({...issued,state},TODAY),true)
assert.equal(isHomeworkOverdue({...issued,dueDate:TODAY},TODAY),false,'deadline is inclusive')
assert.equal(isHomeworkOverdue({...issued,dueDate:undefined},TODAY),false,'no inferred deadline')
assert.equal(isHomeworkOverdue({...issued,required:false},TODAY),false,'optional work is not debt')
assert.equal(isHomeworkOverdue({...issued,dueDate:'2026-11-03'},TODAY),false)
const {assignments,activeModule,subject} = makeTrackExample('debts')
assert.equal(activeModule,3)
assert.deepEqual(overdueModuleCounts(assignments,TODAY),{1:2})
assert.equal(sortedHomeworkActions(assignments,TODAY).length,3)
assert.equal(assignments.filter(w=>w.state==='submitted').length,2)
assert.deepEqual(sortedHomeworkActions(assignments,TODAY).map(w=>w.moduleId),[1,1,3])
const debt = sortedHomeworkActions(assignments,TODAY)[0]
assert.equal(debt.title,'Электронные оболочки')
assert.deepEqual(overdueModuleCounts(assignments.map(w=>w.id===debt.id?{...w,state:'submitted'}:w),TODAY),{1:1},'submission removes exactly one debt')
for (const [scenario] of SCENARIOS) {
 const example=makeTrackExample(scenario)
 assert.ok(example.subject.modules.some(m=>m.id===example.activeModule))
 assert.ok(example.subject.modules.flatMap(m=>m.lessons).some(l=>l.id===example.focusId))
 assert.equal(new Set(example.assignments.map(w=>w.id)).size,example.assignments.length)
}
assert.equal(makeTrackExample('fifty').subject.modules[0].lessons.length,50)
assert.equal(sortedHomeworkActions(makeTrackExample('completed').assignments,TODAY).length,0)
assert.deepEqual(overdueModuleCounts(makeTrackExample('empty').assignments,TODAY),{})
console.log('PASS: inclusive deadlines, pending/unknown/optional exclusions, old-module counts, submission update, 6 scenarios and 50 lessons')
