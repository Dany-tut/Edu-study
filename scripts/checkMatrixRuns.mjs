import assert from 'node:assert/strict'
import { columnWindow, columnSpacers } from '../src/components/teacher/journalStand/columnWindow.ts'
import { matrixRuns } from '../src/components/teacher/journalStand/matrixRuns.ts'
const columns = Array.from({length:1642},(_,i)=>i)
const assigned = new Set([0,5,6,912,1641])
const runs = matrixRuns(columns,c=>assigned.has(c))
assert.equal(runs.reduce((n,r)=>n+r.span,0),columns.length)
assert.deepEqual(runs.filter(r=>r.assigned).map(r=>r.item),[...assigned])
assert.ok(runs.length<=assigned.size*2+1)
let column=0
for(const run of runs){assert.equal(run.item,column);column+=run.span}
assert.deepEqual(matrixRuns([],()=>false),[])
const empty = matrixRuns(columns,()=>false)
assert.deepEqual(empty.map(r=>r.span),[1000,642])
assert.equal(empty.reduce((n,r)=>n+Math.min(r.span,1000),0),columns.length)
assert.ok(runs.every(r=>r.span<=1000))
assert.equal(matrixRuns(columns,()=>true).length,columns.length)
console.log('PASS: sparse matrix retains exact positions and every assigned work; empty cells compressed')

for (const width of [196, 600, 1104]) {
  for (const count of [0, 24, 41, 1644, 5001]) {
    const seen = new Set()
    for (let left = 0; left <= count * 145; left += 145) {
      const {start, end} = columnWindow(count, left, width, 145)
      assert.ok(start >= 0 && end <= count && start <= end)
      const first = Math.min(count - 1, Math.floor(left / 145))
      if (count) assert.ok(start <= first && end > first)
      for (let i = start; i < end; i++) seen.add(i)
      assert.equal(columnSpacers(start).reduce((a,b)=>a+b,0) + end-start + columnSpacers(count-end).reduce((a,b)=>a+b,0),count)
      assert.ok([...columnSpacers(start),...columnSpacers(count-end)].every(n=>n>0&&n<=1000))
      if(count>40) assert.ok(end-start<=Math.ceil(width/145)+9)
    }
    assert.equal(seen.size,count,'Every work must become reachable by scrolling, including the last column')
  }
}
assert.deepEqual(columnWindow(24, 0, 196,145),{start:0,end:24},'Small journals retain native rendering')
console.log('PASS: journal windows cover every column on mobile/desktop, preserve tracks and respect HTML span limits')
