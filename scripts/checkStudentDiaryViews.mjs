import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const outfile = resolve('node_modules/.cache/checkStudentDiaryViews.mjs')
await build({ entryPoints:['src/lib/studentDiaryViews.ts'], outfile, bundle:true, platform:'node', format:'esm', logLevel:'silent' })
const { groupDiaryTimeline, diaryUpcomingDays, readStudentDiaryView, saveStudentDiaryView } = await import(pathToFileURL(outfile))
const rows = [
  {id:'undated',due:null,late:false}, {id:'next',due:'2026-11-03',late:false},
  {id:'passed-past',due:'2026-10-29',late:false}, {id:'late',due:'2026-10-31',late:true},
  {id:'today-2',due:'2026-11-01',late:false}, {id:'today-1',due:'2026-11-01',late:false},
]
const snapshot = JSON.stringify(rows)
const groups = groupDiaryTimeline(rows,null,row=>row.late)
assert.deepEqual(groups.map(g=>g.key),['overdue','2026-10-29','2026-11-01','2026-11-03','undated'])
assert.deepEqual(groups.flatMap(g=>g.entries).map(e=>e.id).sort(),rows.map(e=>e.id).sort(),'All-dates view includes undated and old work exactly once')
assert.deepEqual(groups.find(g=>g.key==='2026-11-01').entries.map(e=>e.id),['today-2','today-1'],'Preserve chosen row sorting inside a date')
assert.deepEqual(groupDiaryTimeline(rows,'2026-11-01',row=>row.late).flatMap(g=>g.entries).map(e=>e.id),['today-2','today-1'])
assert.deepEqual(groupDiaryTimeline(rows,'2026-11-07',row=>row.late),[])
assert.deepEqual(groupDiaryTimeline([],null,()=>false),[])
assert.deepEqual(groupDiaryTimeline(rows,null,row=>row.late,true).map(g=>g.key),['overdue','2026-11-03','2026-11-01','2026-10-29','undated'])
assert.equal(JSON.stringify(rows),snapshot,'Grouping must not reorder or modify the shared data')
assert.deepEqual(diaryUpcomingDays('2026-12-29'),['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04'])
assert.deepEqual(diaryUpcomingDays('not-a-date'),[])
const data=new Map();const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}
assert.equal(readStudentDiaryView(null,storage),'journal')
saveStudentDiaryView('student:a','work',storage);saveStudentDiaryView('student:b','courses',storage)
assert.equal(readStudentDiaryView('student:a',storage),'work');assert.equal(readStudentDiaryView('student:b',storage),'journal')
saveStudentDiaryView('student:a','lessons',storage);assert.equal(readStudentDiaryView('student:a',storage),'work','Opening a lesson must not overwrite the preferred diary view')
saveStudentDiaryView('student:a','unknown',storage);assert.equal(readStudentDiaryView('student:a',storage),'work')
assert.equal(readStudentDiaryView('new-student',storage),'journal')
for (const legacy of ['today', 'courses', 'lessons', 'unknown']) {
  data.set('iskra:diary-view:' + encodeURIComponent('legacy-student'), legacy)
  assert.equal(readStudentDiaryView('legacy-student',storage),'journal','Old saved modes must open the journal')
}
saveStudentDiaryView('student:a','journal',storage);assert.equal(readStudentDiaryView('student:a',storage),'journal')
const blocked={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}
assert.equal(readStudentDiaryView('student:a',blocked),'journal');assert.doesNotThrow(()=>saveStudentDiaryView('student:a','work',blocked))
console.log('PASS: complete timeline, selected days, descending dates, no source mutation, year boundary and account-scoped view preference with blocked storage.')
