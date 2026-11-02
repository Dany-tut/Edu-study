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
assert.equal(matrixRuns(columns,()=>false)[0].span,columns.length)
assert.equal(matrixRuns(columns,()=>true).length,columns.length)
console.log('PASS: sparse matrix retains exact positions and every assigned work; empty cells compressed')
