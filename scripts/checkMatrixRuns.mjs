import assert from 'node:assert/strict'
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
