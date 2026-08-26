import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'fin-'))
const out = join(tmp, 'b.mjs')
await build({ stdin: { contents: `
  export { READING_LIBRARY } from './src/data/readingLibrary'
  export { languageTaxonomy } from './src/data/languageTaxonomy'
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const m = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })
const qs = m.READING_LIBRARY.flatMap(t => t.questions ?? [])
console.log(`тексты: ${m.READING_LIBRARY.length} · вопросы: ${qs.length} · с разбором: ${qs.filter(q=>q.why).length}`)
const by = {}
for (const t of m.READING_LIBRARY) (by[t.lang] ??= []).push(t)
for (const [l, list] of Object.entries(by))
  console.log(`  ${l.padEnd(6)} ${String(list.length).padStart(2)} текстов · ${new Set(list.map(x=>x.topic)).size} тем · без перевода ${list.filter(t=>!t.translation).length}`)
