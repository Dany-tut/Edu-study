// Exercise RLS under concurrent dashboard reads using only local synthetic accounts.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const root = process.env.ISKRA_LOCAL_DIR || '/tmp/iskra-local-security'
const config = JSON.parse(readFileSync(root + '/status.json', 'utf8'))
assert.equal(new URL(config.API_URL).hostname, '127.0.0.1')
const { accounts, rows } = JSON.parse(readFileSync(root + '/fixture.json', 'utf8'))
const ids = [rows.A.student.id, rows.B.student.id]
const readers = []
for (const suffix of ['A', 'B']) {
  const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword(accounts['student' + suffix])
  assert.ifError(error)
  readers.push({ client, expected: rows[suffix].student.id })
}
for (const concurrency of [1, 4, 12]) {
  const timings = []
  const start = performance.now()
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    for (let i = 0; i < 20; i++) {
      const { client, expected } = readers[(i + worker) % readers.length]
      const before = performance.now()
      const { data, error } = await client.from('students').select('id').in('id', ids)
      assert.ifError(error)
      assert.deepEqual(data.map(row => row.id), [expected])
      timings.push(performance.now() - before)
    }
  }))
  timings.sort((a, b) => a - b)
  console.log(JSON.stringify({ concurrency, requests: timings.length,
    p95ms: Math.round(timings[Math.ceil(timings.length * .95) - 1]),
    requestsPerSecond: Math.round(1000 * timings.length / (performance.now() - start)) }))
}
