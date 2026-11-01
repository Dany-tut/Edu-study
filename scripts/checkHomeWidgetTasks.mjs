import assert from 'node:assert/strict'
import { homeWidgetTasks } from '../src/lib/homeWidgetTasks.ts'
const lesson=(id,status,extra={})=>({id,status,title:id,number:0,shape:'circle',subject:'Химия',...extra})
const course=(id,lessons)=>({id,name:id,subject:'Химия',modules:[{id:1,label:'',lessons}]})
const returned=lesson('revise','returned')
const tasks=homeWidgetTasks([course('chemistry',[
  lesson('reading','current'),lesson('review','submitted',{result:{pending:true}}),
  lesson('exam','current',{kind:'test'}),lesson('draft','current',{result:{draft:true}}),
  returned,returned,lesson('recording','current',{nodeType:'rec'}),
  lesson('future','locked'),lesson('done','completed'),
]),course('biology',[lesson('revise','returned')])])
assert.equal(tasks.length,5,'Only actionable lessons are included; recording duplicates and pending reviews stay out')
assert.deepEqual(tasks.slice(0,2).map(t=>t.subjectId),['chemistry','biology'],'Returned work across courses comes first')
assert.equal(tasks.find(t=>t.lesson.id==='draft').homework,true)
assert.equal(tasks.find(t=>t.lesson.id==='exam').label,'Пройти тест')
assert.equal(tasks.find(t=>t.lesson.id==='reading').label,'Продолжить урок','An unopened lesson is not claimed to be overdue homework')
assert.equal(new Set(tasks.map(t=>t.key)).size,tasks.length,'Identity includes course, and repeated track nodes are deduplicated')
assert.deepEqual(homeWidgetTasks([]),[])
console.log('Home widget task checks passed')
