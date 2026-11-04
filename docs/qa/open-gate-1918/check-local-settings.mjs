// Run with ISKRA_LOCAL_DIR pointing to disposable local Supabase fixtures.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dir = process.env.ISKRA_LOCAL_DIR
assert.ok(dir, 'ISKRA_LOCAL_DIR is required')
const read = async name => JSON.parse(await readFile(join(dir, name), 'utf8'))
const config = await read('status.json')
const fixture = await read('fixture.json')
assert.equal(new URL(config.API_URL).hostname, '127.0.0.1')
const client = key => createClient(config.API_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const admin = client(config.SERVICE_ROLE_KEY)
const student = client(config.ANON_KEY)
assert.ifError((await student.auth.signInWithPassword(fixture.accounts.studentA)).error)
const own = fixture.rows.A.student.id
const other = fixture.rows.B.student.id
const previous = await admin.from('students').select('preferences').eq('id', own).single()
assert.ifError(previous.error)
const save = (id, values) => student.rpc('save_student_preferences', {
  p_student: id,
  p_preferences: values,
})
try {
  assert.ifError((await save(own, { avatarId: 'flower' })).error)
  const changed = await student.from('students').select('preferences').eq('id', own).single()
  assert.ifError(changed.error)
  assert.equal(changed.data.preferences.avatarId, 'flower')
  assert.equal((await save(other, { avatarId: 'cat' })).error?.code, '42501')
  assert.equal((await save(own, { hidden_widgets: [] })).error?.code, '22023')
  console.log('PASS own preferences saved, foreign ID and protected field rejected')
} finally {
  assert.ifError((await admin.from('students').update(previous.data).eq('id', own)).error)
}
