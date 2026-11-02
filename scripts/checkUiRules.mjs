import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {build} from 'esbuild'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const output = await build({entryPoints:['src/lib/useScrollFades.ts'],bundle:true,platform:'node',format:'esm',write:false,external:['react']})
// Load beside installed dependencies so React resolves without a browser.
const {writeFileSync,mkdirSync} = await import('node:fs')
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/ui-scroll-fades.mjs',output.outputFiles[0].text)
const {scrollFadeMask:mask} = await import('../node_modules/.cache/ui-scroll-fades.mjs')
assert.equal(mask(0,100,100),'none')
assert.match(mask(0,100,300),/to bottom, #000.*transparent\)$/)
assert.match(mask(100,100,300),/to bottom, transparent.*transparent\)$/)
assert.match(mask(200,100,300),/to bottom, transparent.*#000\)$/)
assert.match(mask(20,100,300,true),/to right, transparent.*transparent\)$/)
const hub=read('src/components/teacher/journalStand/HomeworkHub.tsx')
assert.match(hub,/useScrollFades\(body, active\)/,'Homework scroll regions must keep automatic fades')
const css=read('src/components/teacher/journalStand/homeworkReview.css')
assert.match(css,/height:auto; max-height:none/,'Mobile inspector must not trap the answer in a short viewport')
const rules=read('docs/ui-rules.md')
for(const id of ['SCROLL-01','MOBILE-01','ALERT-01','AI-01','BRAND-01']) assert.ok(rules.includes(id),`Missing UI rule ${id}`)
assert.ok(read('AGENTS.md').includes('docs/ui-rules.md'))
console.log('UI rules: scroll edges, mobile card integration and durable rule links passed')
