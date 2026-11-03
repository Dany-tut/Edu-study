import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const root = '/tmp/iskra-local-security'
const config = JSON.parse(readFileSync(root + '/status.json'))
assert.equal(config.API_URL, 'http://127.0.0.1:55321')
const make = () => createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const fixture = JSON.parse(readFileSync(root + '/fixture.json'))
const teacher = make()
const jpg = readFileSync(root + '/class-photo.jpg')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function ok(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}
await ok(teacher.auth.signInWithPassword(fixture.accounts.teacherA))
const group = fixture.rows.A.group.id
const people = []
for (let i = 0; i < 60; i++) {
  const email = 'class-' + randomUUID() + '@example.invalid'
  const client = make()
  const { user } = await ok(client.auth.signUp({email, password: randomUUID()}))
  const card = await ok(teacher.from('students').insert({group_id:group,name:'QA Deadline '+i}).select('id,invite_token').single())
  await ok(client.rpc('claim_student_account',{p_token:card.invite_token,p_email:email}))
  people.push({client, uid:user.id, student:card.id})
}
for (const size of [30,60]) {
  const hw = await ok(teacher.from('homework').insert({group_id:group,title:'QA Deadline '+size,created_by:fixture.accounts.teacherA.id}).select('id').single())
  const ref = 'hw-' + hw.id + '-hard'
  const digest = new Map()
  const started = performance.now()
  const wave = await Promise.allSettled(people.slice(0,size).map(async ({client,uid,student}) => {
    const path = uid+'/'+student+'/'+Date.now()+'-'+randomUUID()+'.jpg'
    // A distinct JPEG comment lets the teacher detect any cross-student file swap.
    const bytes = Buffer.concat([jpg.subarray(0,2),Buffer.from([255,254,0,38]),Buffer.from(student),jpg.subarray(2)])
    digest.set(student,{path,hash:hash(bytes)})
    const before = performance.now()
    await ok(client.storage.from('homework-photos').upload(path,bytes,{contentType:'image/jpeg'}))
    const uploaded = performance.now()
    const payload = {student_id:student,lesson_ref:ref,subject:'Химия',status:'submitted',attachments:{v:2,tasks:[{key:'qa',answer:'6',photos:['hwp:'+path],board:null}]}}
    await ok(client.from('lesson_progress').upsert(payload,{onConflict:'student_id,lesson_ref'}))
    return {upload:uploaded-before,submit:performance.now()-uploaded,total:performance.now()-before}
  }))
  const elapsed = performance.now()-started
  const failures = wave.filter(x=>x.status==='rejected')
  if (failures.length) throw Error(failures.length+' failures: '+failures[0].reason.message)
  const rows = await ok(teacher.from('lesson_progress').select('student_id,status,attachments').eq('lesson_ref',ref))
  assert.equal(rows.length,size)
  assert.equal(new Set(rows.map(row=>row.student_id)).size,size)
  for (const row of rows) {
    const expected=digest.get(row.student_id)
    assert.equal(row.status,'submitted')
    assert.deepEqual(row.attachments.tasks[0].photos,['hwp:'+expected.path])
    const blob=await ok(teacher.storage.from('homework-photos').download(expected.path))
    assert.equal(hash(Buffer.from(await blob.arrayBuffer())),expected.hash)
  }
  const p95 = key => Math.round(wave.map(x=>x.value[key]).sort((a,b)=>a-b)[Math.ceil(.95*size)-1])
  console.log(JSON.stringify({size,verified:rows.length,bytesEach:jpg.length+40,elapsedMs:Math.round(elapsed),uploadP95:p95('upload'),submitP95:p95('submit'),totalP95:p95('total')}))
}
