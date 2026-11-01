import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const workflow = readFileSync(new URL('../.github/workflows/feed.yml', import.meta.url), 'utf8')
assert.match(workflow, /actions: write/)
assert.match(workflow, /if: github.ref == 'refs\/heads\/main'/)
const marker = '        run: |\n'
const script = workflow.slice(workflow.lastIndexOf(marker) + marker.length).split('\n').map(line => line.slice(10)).join('\n')
assert.match(script, /gh workflow run ci.yml/)
const root = mkdtempSync(join(tmpdir(), 'iskra-feed-release-test-'))
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const write = (path, data) => { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, data) }
try {
  for (const mode of ['success', 'failed-ci', 'concurrent-main', 'unchanged']) {
    const dir = join(root, mode); mkdirSync(dir)
    const remote = join(dir, 'remote.git'); git(dir, ['init', '--bare', '--initial-branch=main', remote])
    const repo = join(dir, 'checkout'); git(dir, ['clone', remote, repo])
    git(repo, ['config', 'user.name', 'Feed release test']); git(repo, ['config', 'user.email', 'feed@example.test'])
    write(join(repo, 'src/data/feed/auto.ts'), 'old feed')
    write(join(repo, 'src/data/wordGlossAuto.ts'), 'existing glossary')
    write(join(repo, 'public/version.json'), JSON.stringify({ build: 1, version: '1.0.1' }))
    write(join(repo, 'scripts/stampVersion.mjs'), readFileSync(new URL('./stampVersion.mjs', import.meta.url)))
    write(join(repo, '.githooks/pre-commit'), '#!/bin/sh\nnode scripts/stampVersion.mjs --next --stage\n'); chmodSync(join(repo, '.githooks/pre-commit'), 0o755)
    write(join(repo, 'package.json'), JSON.stringify({ scripts: { 'release:check': 'node check-release.cjs' } }))
    write(join(repo, 'check-release.cjs'), `const {execFileSync:run}=require('node:child_process');run('git',['merge-base','--is-ancestor','origin/main','HEAD']);if(run('git',['status','--porcelain']).length)process.exit(1);`)
    git(repo, ['add', '.']); git(repo, ['commit', '-m', 'Base']); git(repo, ['push', 'origin', 'main'])
    const base = git(repo, ['rev-parse', 'HEAD'])
    if (mode !== 'unchanged') write(join(repo, 'src/data/feed/auto.ts'), 'fresh feed')
    const bin = join(dir, 'bin'); mkdirSync(bin)
    const fakeGh = `#!/usr/bin/env node
const fs=require('node:fs'),cp=require('node:child_process'),p=require('node:path');const args=process.argv.slice(2);fs.appendFileSync(process.env.FEED_TEST_LOG,JSON.stringify(args)+'\\n');
if(args[0]==='run'&&args[1]==='list')console.log('123');
if(args[0]==='run'&&args[1]==='watch'){
 if(process.env.FEED_TEST_MODE==='failed-ci')process.exit(1);
 if(process.env.FEED_TEST_MODE==='concurrent-main'){
  const peer=p.join(process.env.FEED_TEST_DIR,'peer'),run=(a)=>cp.execFileSync('git',a,{cwd:peer,stdio:'ignore'});
  cp.execFileSync('git',['clone',process.env.FEED_TEST_REMOTE,peer],{stdio:'ignore'});run(['config','user.name','Concurrent release']);run(['config','user.email','other@example.test']);fs.writeFileSync(p.join(peer,'concurrent.txt'),'keep this release');run(['add','.']);run(['commit','-m','Concurrent release']);run(['push','origin','main']);
 }
}
`
    write(join(bin, 'gh'), fakeGh); chmodSync(join(bin, 'gh'), 0o755)
    write(join(bin, 'timeout'), `#!/usr/bin/env node\nconst r=require('node:child_process').spawnSync(process.argv[3],process.argv.slice(4),{stdio:'inherit'});process.exit(r.status??1);\n`); chmodSync(join(bin, 'timeout'), 0o755)
    const path = join(dir, 'publish.sh'); write(path, script)
    const log = join(dir, 'gh.log')
    const result = spawnSync('bash', [path], { cwd: repo, encoding: 'utf8', timeout: 30000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GH_TOKEN: 'fixture', GITHUB_REPOSITORY: 'Dany-tut/Edu-study', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', FEED_TEST_MODE: mode, FEED_TEST_LOG: log, FEED_TEST_DIR: dir, FEED_TEST_REMOTE: remote } })
    const current = git(dir, ['--git-dir', remote, 'rev-parse', 'main'])
    if (mode === 'success') {
      assert.equal(result.status, 0, result.stderr)
      assert.notEqual(current, base)
      assert.equal(git(dir, ['--git-dir', remote, 'show', 'main:src/data/feed/auto.ts']), 'fresh feed')
      assert(JSON.parse(git(dir, ['--git-dir', remote, 'show', 'main:public/version.json'])).build > 1)
      const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse)
      assert(calls.some(args => args[0] === 'workflow' && args[1] === 'run'))
      assert(calls.some(args => args[0] === 'run' && args[1] === 'watch'))
      assert(calls.some(args => args.includes('--commit') && args[args.indexOf('--commit') + 1] === current))
    } else if (mode === 'unchanged') {
      assert.equal(result.status, 0, result.stderr); assert.equal(current, base)
    } else {
      assert.notEqual(result.status, 0)
      assert.equal(git(dir, ['--git-dir', remote, 'show', 'main:src/data/feed/auto.ts']), 'old feed')
      if (mode === 'failed-ci') assert.equal(current, base)
      else assert.equal(git(dir, ['--git-dir', remote, 'show', 'main:concurrent.txt']), 'keep this release')
    }
    console.log(`PASS: feed release ${mode}`)
  }
} finally { rmSync(root, { recursive: true, force: true }) }
