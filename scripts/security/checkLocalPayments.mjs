// Real local PostgreSQL RLS regression, rolled back after every test.
// The service Auth API is not mocked here; claim variables emulate its verified
// PostgREST context. The separate HTTP matrix covers real Auth/JWT validation.
import {readFileSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security'
const f=JSON.parse(readFileSync(root+'/fixture.json','utf8'))
assert.equal(new URL(f.url).hostname,'127.0.0.1')
const results=[]
for(const [label,expected] of [['studentA',false],['teacherB',false],['teacherA',true]]) {
 const actor=f.accounts[label].id,student=f.rows.A.student.id
 assert.match(actor,/^[0-9a-f-]{36}$/);assert.match(student,/^[0-9a-f-]{36}$/)
 const sql=`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);insert into public.payments(student_id,teacher_id,amount,lessons_paid) values('${student}','${actor}',1,0);rollback;`
 const r=spawnSync('docker',['exec','-i','supabase_db_iskra-local-security','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'})
 if(expected)assert.equal(r.status,0,r.stderr)
 else {assert.notEqual(r.status,0);assert.match(r.stderr,/Payment must belong to the student owner|row-level security/)}
 results.push({actor:label,allowed:r.status===0,expected_allowed:expected})
}
writeFileSync(root+'/evidence/payments-regression-latest.json',JSON.stringify({scope:'Real restored PostgreSQL, transactional SET ROLE regression',results},null,2))
console.log('PASS: student/foreign-teacher payment denied; owner payment allowed; no test payments committed')
