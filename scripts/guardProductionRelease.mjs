import { readFileSync, writeFileSync } from 'node:fs'
import { RELEASE, git, releaseCheckoutChanges, assertCommit, containsCommit, readProduction, validateProductionRelease } from './releasePolicy.mjs'

const phase = process.argv[2]
if (!['--before-build', '--after-build', '--check'].includes(phase)) {
  console.error('Usage: node scripts/guardProductionRelease.mjs --before-build|--after-build|--check')
  process.exit(1)
}

try {
  const production = phase !== '--check' && process.env.VERCEL_ENV === 'production'
  const version = JSON.parse(readFileSync('public/version.json', 'utf8'))
  let head
  try { head = git(['rev-parse', 'HEAD']) } catch { head = process.env.VERCEL_GIT_COMMIT_SHA || null }
  if (production || phase === '--check') {
    assertCommit(head)
    if (production && (process.env.VERCEL_GIT_COMMIT_REF !== RELEASE.branch || process.env.VERCEL_GIT_COMMIT_SHA !== head)) {
      throw new Error('Production must be built by the Git integration from the current main commit.')
    }
    // Git-hosted builds may add generated service files; local preflight is strict.
    const changes = releaseCheckoutChanges({ allowVercelDeletions: production && process.env.VERCEL === '1', allowVercelFormatting: production && process.env.VERCEL === '1', includeUntracked: !production })
    if (changes.length) {
      throw new Error('Release checkout has uncommitted source files. Use a clean, isolated worktree. Changes: ' + changes.slice(0, 12).join('; '))
    }
    const remote = git(['ls-remote', RELEASE.remote, `refs/heads/${RELEASE.branch}`])
    const main = assertCommit(remote.split(/\s/)[0])
    const live = await readProduction()
    validateProductionRelease({ head, main, live, version, contains: containsCommit, requireTip: production })
    console.log(`Release guard passed: ${head} contains production ${live.commit}; build ${version.build}.`)
  }
  if (phase === '--after-build') {
    let branch = process.env.VERCEL_GIT_COMMIT_REF || null
    if (!branch) { try { branch = git(['branch', '--show-current']) || null } catch { /* Source-only previews have no .git. */ } }
    const manifest = {
      repository: RELEASE.repository,
      branch,
      environment: process.env.VERCEL_ENV || 'local',
      commit: head,
      build: version.build,
      version: version.version,
    }
    writeFileSync('dist/release.json', JSON.stringify(manifest, null, 2) + '\n')
    writeFileSync('dist/version.json', JSON.stringify({ ...version, commit: head }, null, 2) + '\n')
  }
} catch (error) {
  console.error(`Release blocked: ${error.message}`)
  process.exit(1)
}
