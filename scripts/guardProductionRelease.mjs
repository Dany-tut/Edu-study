import { readFileSync, writeFileSync } from 'node:fs'
import { RELEASE, git, assertCommit, containsCommit, readProduction, validateProductionRelease } from './releasePolicy.mjs'

const phase = process.argv[2]
if (!['--before-build', '--after-build', '--check'].includes(phase)) {
  console.error('Usage: node scripts/guardProductionRelease.mjs --before-build|--after-build|--check')
  process.exit(1)
}

try {
  const production = process.env.VERCEL_ENV === 'production'
  const version = JSON.parse(readFileSync('public/version.json', 'utf8'))
  let head
  try { head = git(['rev-parse', 'HEAD']) } catch { head = process.env.VERCEL_GIT_COMMIT_SHA || null }
  if (production || phase === '--check') {
    assertCommit(head)
    if (production && (process.env.VERCEL_GIT_COMMIT_REF !== RELEASE.branch || process.env.VERCEL_GIT_COMMIT_SHA !== head)) {
      throw new Error('Production must be built by the Git integration from the current main commit.')
    }
    if (git(['status', '--porcelain', '--untracked-files=normal'])) {
      throw new Error('Release checkout has uncommitted files. Use a clean, isolated worktree.')
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
  }
} catch (error) {
  console.error(`Release blocked: ${error.message}`)
  process.exit(1)
}
