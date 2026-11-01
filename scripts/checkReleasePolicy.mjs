import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RELEASE, git, releaseCheckoutChanges, containsCommit, readProduction, validateProductionRelease } from './releasePolicy.mjs'

const dir = mkdtempSync(join(tmpdir(), 'iskra-release-policy-test-'))
let checks = 0
const reject = (args, pattern) => { assert.throws(() => validateProductionRelease(args), pattern); checks++ }
try {
  git(['init', '-b', 'main'], dir)
  git(['config', 'user.name', 'Release policy test'], dir)
  git(['config', 'user.email', 'release@example.test'], dir)
  const commit = name => {
    writeFileSync(join(dir, name), name)
    git(['add', name], dir); git(['-c', 'core.hooksPath=/dev/null', 'commit', '-m', name], dir)
    return git(['rev-parse', 'HEAD'], dir)
  }
  const base = commit('base')
  const live = commit('live')
  const head = commit('candidate')
  git(['checkout', '-b', 'stale', base], dir)
  const stale = commit('unrelated-feature')
  const contains = (a, b) => containsCommit(a, b, dir)
  const shallow = join(dir, 'shallow-copy')
  git(['clone', '--depth=1', '--branch=main', pathToFileURL(dir).href, shallow], dir)
  assert.equal(containsCommit(live, head, shallow, pathToFileURL(dir).href), true); checks++
  const guard = fileURLToPath(new URL('./guardProductionRelease.mjs', import.meta.url))
  mkdirSync(join(dir, 'public'))
  writeFileSync(join(dir, 'public/version.json'), JSON.stringify({ build: 11, version: '1.0.11' }))
  for (const phase of ['--before-build', '--after-build']) {
    const result = spawnSync(process.execPath, [guard, phase], { cwd: dir, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'stale', VERCEL_GIT_COMMIT_SHA: stale } })
    assert.equal(result.status, 1); assert.match(result.stderr, /Git integration/); checks++
  }
  const untracked = spawnSync(process.execPath, [guard, '--check'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: '' } })
  assert.equal(untracked.status, 1); assert.match(untracked.stderr, /uncommitted/); checks++
  writeFileSync(join(dir, 'unrelated-feature'), 'modified tracked source')
  const dirty = spawnSync(process.execPath, [guard, '--before-build'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_SHA: stale } })
  assert.equal(dirty.status, 1); assert.match(dirty.stderr, /uncommitted/); checks++
  // Real Vercel clones drop tracked .vercelignore matches before the guard runs.
  const hosted = join(dir, 'hosted-checkout')
  mkdirSync(hosted)
  git(['init', '-b', 'main'], hosted)
  git(['config', 'user.name', 'Release policy test'], hosted)
  git(['config', 'user.email', 'release@example.test'], hosted)
  mkdirSync(join(hosted, 'supabase'))
  writeFileSync(join(hosted, '.vercelignore'), '.env*\nsupabase/\n')
  writeFileSync(join(hosted, '.gitignore'), 'local-only.txt\n')
  for (const name of ['.env.example', 'supabase/schema.sql', 'app.ts', 'local-only.txt']) writeFileSync(join(hosted, name), 'fixture')
  git(['add', '-f', '.'], hosted)
  git(['-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'Hosted fixture'], hosted)
  rmSync(join(hosted, '.env.example'))
  rmSync(join(hosted, 'supabase/schema.sql'))
  assert.equal(releaseCheckoutChanges({cwd:hosted}).length, 2); checks++
  assert.deepEqual(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}), []); checks++
  writeFileSync(join(hosted, 'app.ts'), 'changed source')
  assert.ok(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}).some(change => change.endsWith('app.ts'))); checks++
  git(['checkout', '--', 'app.ts'], hosted)
  writeFileSync(join(hosted, 'unexpected.ts'), 'uncommitted source')
  assert.ok(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}).some(change => change.startsWith('??'))); checks++
  rmSync(join(hosted, 'unexpected.ts'))
  rmSync(join(hosted, 'app.ts'))
  assert.ok(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}).some(change => change.endsWith('app.ts'))); checks++
  git(['checkout', '--', 'app.ts'], hosted)
  rmSync(join(hosted, 'local-only.txt'))
  assert.ok(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}).some(change => change.endsWith('local-only.txt'))); checks++
  git(['checkout', '--', 'local-only.txt'], hosted)
  git(['add', '-u'], hosted)
  assert.equal(releaseCheckoutChanges({cwd:hosted,allowVercelDeletions:true}).length, 2); checks++
  const valid = { head, main: head, live: { commit: live, build: 10 }, version: { build: 11, version: '1.0.11' }, contains }
  validateProductionRelease(valid); checks++
  reject({ ...valid, head: stale }, /behind origin\/main/)
  reject({ ...valid, head: stale, main: stale }, /does not contain/)
  reject({ ...valid, version: { build: 9, version: '1.0.9' } }, /newer build/)
  reject({ ...valid, version: { build: 10, version: '1.0.10' } }, /newer build/)
  reject({ ...valid, version: { build: 11, version: '1.0.9' } }, /disagree/)
  reject({ ...valid, live: { commit: 'missing', build: 10 } }, /full Git SHA/)
  reject({ ...valid, live: { commit: live, build: null } }, /Invalid/)
  validateProductionRelease({ ...valid, head: live, main: live, live: { commit: live, build: 10 }, version: { build: 10, version: '1.0.10' } }); checks++
  validateProductionRelease({ ...valid, main: live, requireTip: false }); checks++
  const manifest = { repository: RELEASE.repository, branch: 'main', environment: 'production', commit: live, build: 10 }
  assert.deepEqual(await readProduction(async () => new Response(JSON.stringify(manifest))), manifest); checks++
  await assert.rejects(() => readProduction(async () => new Response('{invalid')), /JSON/); checks++
  await assert.rejects(() => readProduction(async () => new Response(JSON.stringify({ ...manifest, branch: 'old-branch' }))), /unexpected/); checks++
  await assert.rejects(() => readProduction(async () => new Response('', { status: 503 })), /HTTP 503/); checks++
  for (const status of [200, 404]) {
    const fetcher = async url => url.includes('/release.json')
      ? new Response('<html>SPA fallback</html>', { status })
      : new Response(JSON.stringify({ build: RELEASE.bootstrap.build, version: `1.0.${RELEASE.bootstrap.build}` }))
    assert.deepEqual(await readProduction(fetcher), RELEASE.bootstrap); checks++
  }
  await assert.rejects(() => readProduction(async url => new Response(url.includes('/release.json') ? '<html>' : JSON.stringify({ build: 1392, version: '1.0.1392' }))), /no verifiable commit/); checks++
  await assert.rejects(() => readProduction(async () => { throw new Error('offline') }), /offline/); checks++
  console.log(`PASS: ${checks} release policy checks — stale/diverged source, version regressions, unknown production and network failures are blocked.`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
