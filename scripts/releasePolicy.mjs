import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

export const RELEASE = Object.freeze({
  repository: 'Dany-tut/Edu-study',
  remote: 'https://github.com/Dany-tut/Edu-study.git',
  branch: 'main',
  origin: 'https://edu-study-app.vercel.app',
  // Last verified production before release.json was introduced.
  bootstrap: { commit: '744b208fa31119c329e00595cb0eefdcacd1cae7', build: 1405 },
})

export function git(args, cwd = process.cwd(), env = undefined) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'], ...(env ? { env } : {}) }).trim()
}

/** Переменная окружения с GitHub-токеном (fine-grained, только Contents: read на
 * этот репозиторий). Нужна, когда репозиторий приватный: без неё ls-remote и
 * дозагрузка истории на Vercel идут анонимно и падают. */
export const RELEASE_TOKEN_ENV = 'GITHUB_RELEASE_GUARD_TOKEN'

/** Окружение git для запросов к GitHub. Токен идёт заголовком через
 * GIT_CONFIG_* — не в аргументах и не в URL, поэтому не попадает ни в текст
 * ошибки execFileSync, ни в лог сборки. Без токена — обычное окружение. */
export function remoteGitEnv(source = process.env) {
  const token = source[RELEASE_TOKEN_ENV]?.trim()
  if (!token) return undefined
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64')
  return {
    ...source,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
  }
}

/** Убирает токен (и его base64-заголовок) из текста перед выводом в лог. */
export function redactSecrets(text, source = process.env) {
  const token = source[RELEASE_TOKEN_ENV]?.trim()
  if (!token) return String(text)
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64')
  return String(text).split(token).join('***').split(basic).join('***')
}

/** git к удалённому репозиторию релиза: с токеном, если он задан. */
export function remoteGit(args, cwd = process.cwd()) {
  try { return git(args, cwd, remoteGitEnv()) }
  catch (error) { error.message = redactSecrets(error.message); if (error.stderr) error.stderr = redactSecrets(error.stderr); throw error }
}

/** Vercel removes .vercelignore matches after cloning, before running the build.
 * Only those unstaged deletions are expected; modified and staged files still reject the release.
 * Local preflight also rejects untracked files. */
export function releaseCheckoutChanges({ cwd = process.cwd(), allowVercelDeletions = false, allowVercelFormatting = false, includeUntracked = true } = {}) {
  const run = args => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
  const changes = run(['status', '--porcelain=v1', '-z', includeUntracked ? '--untracked-files=normal' : '--untracked-files=no']).split('\0').filter(Boolean)
  if ((!allowVercelDeletions && !allowVercelFormatting) || !changes.length) return changes
  // --exclude-from deliberately does not read .gitignore or global excludes.
  const excluded = new Set(allowVercelDeletions ? run(['ls-files', '--cached', '--ignored', '--exclude-from=.vercelignore', '-z']).split('\0').filter(Boolean) : [])
  return changes.filter(change => {
    if (allowVercelDeletions && change.slice(0, 2) === ' D' && excluded.has(change.slice(3))) return false
    // Services serializes the same JSON into one line. Permit formatting only,
    // never staged changes or altered routes, commands, headers or settings.
    if (allowVercelFormatting && change === ' M vercel.json') {
      try {
        return !isDeepStrictEqual(JSON.parse(run(['show', 'HEAD:vercel.json'])), JSON.parse(readFileSync(join(cwd, 'vercel.json'), 'utf8')))
      } catch { return true }
    }
    return true
  })
}

export function assertCommit(value) {
  if (!/^[a-f0-9]{40}$/.test(value ?? '')) throw new Error('Release commit must be a full Git SHA.')
  return value
}

export function validateProductionRelease({ head, main, live, version, contains, requireTip = true }) {
  assertCommit(head); assertCommit(main); assertCommit(live.commit)
  if (requireTip ? head !== main : !contains(main, head)) {
    throw new Error('Candidate is behind origin/main. Integrate the latest main in an isolated worktree first.')
  }
  if (!contains(live.commit, head)) throw new Error('Candidate does not contain the current production release. Release blocked.')
  if (!Number.isSafeInteger(live.build) || !Number.isSafeInteger(version.build) || version.build < 1) {
    throw new Error('Invalid release build number.')
  }
  if (version.version !== `1.0.${version.build}`) throw new Error('Release version and build number disagree.')
  if (version.build < live.build || (head !== live.commit && version.build === live.build)) {
    throw new Error('New source must have a newer build number than production.')
  }
}

export async function readProduction(fetcher = fetch) {
  const get = path => fetcher(`${RELEASE.origin}/${path}?release-check=${Date.now()}`, {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
  })
  const response = await get('release.json')
  if (!response.ok && response.status !== 404) throw new Error(`Cannot verify production release (HTTP ${response.status}).`)
  const body = await response.text()
  // The SPA returns index.html for missing files; JSON failures must not be
  // mistaken for permission to deploy an unknown production snapshot.
  if (response.ok && !body.trimStart().startsWith('<')) {
    const live = JSON.parse(body)
    if (live.repository !== RELEASE.repository || live.branch !== RELEASE.branch || live.environment !== 'production') {
      throw new Error('Production release metadata has an unexpected repository, branch or environment.')
    }
    assertCommit(live.commit)
    return live
  }
  const versionResponse = await get('version.json')
  if (!versionResponse.ok) throw new Error('Cannot verify production version.')
  const version = await versionResponse.json()
  if (version.build !== RELEASE.bootstrap.build || version.version !== `1.0.${RELEASE.bootstrap.build}`) {
    throw new Error('Production has no verifiable commit. Reconcile the deployed source before releasing.')
  }
  return RELEASE.bootstrap
}

export function containsCommit(base, head, cwd, remote = RELEASE.remote) {
  assertCommit(base); assertCommit(head)
  const contains = () => {
    try { git(['merge-base', '--is-ancestor', base, head], cwd); return true }
    catch (error) { if (error.status === 1 || error.status === 128) return false; throw error }
  }
  if (contains()) return true
  // Vercel clones only ten commits. Missing history is not proof of ancestry.
  if (git(['rev-parse', '--is-shallow-repository'], cwd) === 'true') {
    remoteGit(['fetch', '--unshallow', '--filter=blob:none', remote, RELEASE.branch], cwd)
    return contains()
  }
  return false
}
