import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'node_modules/.cache/checkProfileSectionState.mjs')
mkdirSync(dirname(output), { recursive: true })
execFileSync(resolve(root, 'node_modules/.bin/esbuild'), [
  resolve(root, 'src/lib/profileSectionState.ts'), '--bundle', '--platform=node', '--format=esm', `--outfile=${output}`, '--log-level=error',
])
const state = await import(`file://${output}?run=${Date.now()}`)
const values = new Map([['profile_section', 'integrations']])
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

assert.equal(state.readProfileSection(storage), null, 'initial profile section must not inherit the one-time notification key')
for (const section of ['main', 'friends', 'integrations', 'settings']) {
  state.writeProfileSection(section, storage)
  assert.equal(state.readProfileSection(storage), section, `refresh should restore ${section}`)
}
assert.equal(values.get('profile_section'), 'integrations', 'persistent profile state must leave notification deep-link state separate')
values.set(state.PROFILE_SECTION_STORAGE_KEY, 'unknown')
assert.equal(state.readProfileSection(storage), null, 'unknown saved sections should fall back safely')
assert.equal(state.readProfileSection({ getItem() { throw new Error('storage disabled') } }), null, 'blocked storage should not break profile initialization')
assert.doesNotThrow(() => state.writeProfileSection('settings', { setItem() { throw new Error('storage disabled') } }), 'blocked storage should not break profile navigation')

const page = readFileSync(resolve(root, 'src/pages/teacher/TeacherProfileSettingsPage.tsx'), 'utf8')
assert.match(page, /writeProfileSection\(page\)/, 'the ordinary profile page must persist its selected section')
assert.match(page, /if \(embedded\) return embedded === 'schedule' \? 'settings' : 'main'/, 'embedded mobile profile sections must remain fixed')
assert.match(page, /sessionStorage\.removeItem\('profile_section'\)/, 'notification deep-link remains a separate one-time mechanism')
console.log('Profile section restore: main/friends/integrations/settings, notification isolation, unavailable storage and embedded profile passed')
