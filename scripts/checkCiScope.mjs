import assert from 'node:assert/strict'
import { classify,scopeFromGit } from './ciScope.mjs'
const file='src/components/teacher/localTranscription.css',before='body { color: red }',rule='[data-platform="pc"] .chapter-header-modes { --segmented-track-radius:11px;--segmented-item-radius:7px }'
const input={files:[file,'public/version.json','docs/qa/check.md'],before,after:before+rule}
assert.equal(classify(input),'chapter-ui')
for(const change of [
 {manual:true},{files:[...input.files,'src/lib/supabase.ts']},{files:[...input.files,'.github/workflows/ci.yml']},
 {after:'body { color: blue }'+rule},{after:before+rule.replace('.chapter-header-modes','.other')},
 {after:before+rule.replace(' .chapter-header-modes',', body')},{after:before+rule.replace('11px','url(https://example.com)')},
 {after:before+'@media all {'+rule+'}'},{after:before+rule.replace('--segmented-track-radius','display')},{after:'invalid {'}
])assert.equal(classify({...input,...change}),'full',JSON.stringify(change))
assert.equal(scopeFromGit({eventName:'workflow_dispatch'}),'full')
assert.equal(scopeFromGit({eventName:'push',ref:'refs/heads/main',event:{before:'0'.repeat(40)}}),'full')
console.log('PASS CI scope: only isolated PC chapter cosmetics; unknown, logic, workflow, media and unsafe CSS use full suite')
// A safe last commit must not hide earlier logic edits on the same branch.
const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs')
const {tmpdir}=await import('node:os'),{join}=await import('node:path'),{execFileSync}=await import('node:child_process')
const cwd=process.cwd(),temp=mkdtempSync(join(tmpdir(),'iskra-ci-scope-'))
try {
 process.chdir(temp)
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 git('init','-b','main');git('config','user.name','CI Test');git('config','user.email','ci@example.test')
 mkdirSync('src/components/teacher',{recursive:true});writeFileSync(file,before)
 const commit=()=>{git('add','.');git('-c','core.hooksPath=/dev/null','commit','-m','fixture');return git('rev-parse','HEAD')}
 const base=commit();writeFileSync(file,before+rule);const cosmeticHead=commit()
 assert.equal(scopeFromGit({base,head:cosmeticHead}),'chapter-ui')
 writeFileSync('logic.ts','export const changed = true');commit();writeFileSync(file,before+rule.replace('11px','12px'));const head=commit()
 assert.equal(scopeFromGit({base,head}),'full')
}finally{process.chdir(cwd);rmSync(temp,{recursive:true,force:true})}
console.log('PASS whole-branch diff includes earlier code changes')
