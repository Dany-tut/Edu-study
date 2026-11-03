import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
const output = await build({entryPoints:['src/lib/mobileHomeworkReviewState.ts'],bundle:true,platform:'node',format:'esm',write:false})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/checkMobileHomeworkReview.mjs',output.outputFiles[0].text)
const {homeworkReviewAttemptKey:key,latestHomeworkSubmissions:latest}=await import('../node_modules/.cache/checkMobileHomeworkReview.mjs')
const row=(id,studentId,submittedAt,attemptId,verdict='pending')=>({id,studentId,submittedAt,verdict,answers:attemptId?{attemptId}:null})
const original=row('progress','student','2026-11-03T01:00:00Z','first')
const retry={...original,answers:{attemptId:'second'}}
const saved=new Map([[key(original),{verdict:'accepted',score:85}]])
assert.equal(saved.has(key(retry)),false,'same row id with a new attempt must be reviewable')
assert.equal(key({...original,submittedAt:'2026-11-03T02:00:00Z'}),key(original),'an updated timestamp alone cannot re-open a known attempt')
assert.notEqual(key(row('legacy','student','2026-11-03T01:00:00Z')),key(row('legacy','student','2026-11-03T02:00:00Z')),'legacy submissions use the timestamp to distinguish attempts')
const old=row('hw-progress','student','2026-11-02T01:00:00Z','old','returned')
const latestRow=row('course-progress','student','2026-11-03T01:00:00Z','new')
const another=row('another','student-b','2026-11-03T00:00:00Z','b')
assert.deepEqual(latest([latestRow,another,old]),[latestRow,another],'linked and independent references must not duplicate a student')
assert.deepEqual(latest([old,latestRow])[0],latestRow,'latest result wins regardless of input ordering')
assert.equal(latest([original,{...original,id:'duplicate'}])[0],original,'equal timestamps retain the first ordered row')
assert.equal(latest([{...old,submittedAt:''},latestRow])[0],latestRow,'a valid timestamp replaces a missing timestamp')
assert.equal(latest([latestRow,{...old,submittedAt:'bad date'}])[0],latestRow,'an invalid timestamp cannot replace a dated result')
assert.equal(latest([{...old,submittedAt:''},{...latestRow,submittedAt:'bad date'}])[0].id,old.id,'when both dates are unknown retain server ordering')
console.log('PASS: new attempts re-open the same progress row; legacy drafts are isolated; latest linked submissions are unique')
