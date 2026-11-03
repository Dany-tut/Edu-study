import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

// Executes the actual application loaders with an owner/transport boundary mock.
// No production requests, credentials, or copied implementations of the loaders.
async function load(path) {
  const queries = [], calls = []
  let owner = null
  const chain = new Proxy({}, { get: (_, key) => key === 'then'
    ? resolve => resolve({ data: [], error: null })
    : (...args) => { calls.push([key, ...args]); return chain } })
  const values = {
    supabase: { from: table => { calls.push(['from', table]); return chain } },
    getOwnerId: async () => owner,
    createSharedQuery: fetcher => { queries.push(fetcher); return {} },
  }
  const code = stripTypeScriptTypes(readFileSync((process.env.OWNERLESS_BASE_DIR ?? '') + path, 'utf8'))
  const imports = new Map()
  for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const names = (imports.get(m[2]) ?? new Set())
    for (const name of m[1].split(',')) names.add(name.trim().split(/\s+as\s+/)[0])
    imports.set(m[2], names)
  }
  const context = vm.createContext({ console, setTimeout, clearTimeout })
  const module = new vm.SourceTextModule(code, { context })
  await module.link(specifier => {
    const names = [...imports.get(specifier)]
    return new vm.SyntheticModule(names, function () {
      for (const name of names) this.setExport(name, values[name] ?? (() => []))
    }, { context })
  })
  await module.evaluate()
  return { queries, calls, setOwner: value => { owner = value } }
}

const groups = await load('src/lib/useGroups.ts')
const homework = await load('src/lib/useHomework.ts')
const targets = [
  ['groups', groups, 0], ['allStudents', groups, 2],
  ['homework', homework, 0], ['hardSubmissions', homework, 1],
]
let failures = 0
for (const [name, fixture, index] of targets) {
  try {
    fixture.setOwner(null); fixture.calls.length = 0
    const value = await fixture.queries[index]()
    assert.equal(JSON.stringify(value), '[]')
    assert.equal(fixture.calls.length, 0, `${name}: signed-out loader must make no owner-scoped request`)
    fixture.setOwner('teacher-a'); fixture.calls.length = 0
    await fixture.queries[index]()
    assert.ok(fixture.calls.some(([op, column, id]) => op === 'eq' && column.endsWith('created_by') && id === 'teacher-a'), `${name}: signed-in owner scope preserved`)
    assert.ok(!fixture.calls.some(([op, , id]) => op === 'eq' && id == null))
    fixture.setOwner('teacher-b'); fixture.calls.length = 0
    await fixture.queries[index]()
    assert.ok(fixture.calls.some(([op, column, id]) => op === 'eq' && column.endsWith('created_by') && id === 'teacher-b'))
    assert.ok(!fixture.calls.some(([op, , id]) => op === 'eq' && id === 'teacher-a'))
    console.log(`PASS ${name}: signed-out no request; signed-in scoped`)
  } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`) }
}
if (failures) process.exitCode = 1
