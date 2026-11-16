import assert from 'node:assert/strict'
import {TranscriptionEta} from '../src/lib/transcriptionEta'
const e=new TranscriptionEta(), p=n=>({current:n,total:1000,unit:'frames'})
e.observe('A',p(0),0);e.observe('A',p(5),1000);assert.equal(e.remaining(p(5),1000),undefined)
e.observe('A',p(100),10000);assert.equal(e.remaining(p(100),10000),90)
assert.equal(e.remaining(p(100),31000),undefined,'stall does not inflate a guessed ETA')
e.observe('A',p(0),32000);assert.equal(e.remaining(p(0),32000),undefined,'retry resets speed')
e.observe('B',p(500),40000);assert.equal(e.remaining(p(500),40000),undefined,'another job cannot inherit speed')
e.observe('B',{...p(500),phase:'loading'},41000);assert.equal(e.remaining(p(500),41000),undefined)
e.observe('B',{current:0,total:0,unit:'frames'},42000);assert.equal(e.remaining(undefined,42000),undefined)
for(let at=0;at<=120000;at+=5000)e.observe('C',p(at/200),at)
assert.equal(e.remaining(p(600),120000),80,'rolling recent throughput')
console.log('PASS measured stage ETA: warmup, throughput, stall, retry, job/phase reset, rolling window')
