import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'qmiss-'))
const out = join(tmp, 'b.mjs')
await build({ stdin: { contents: `
  export { questionRu } from './src/data/questionRu'
  export { READING_LIBRARY } from './src/data/readingLibrary'
  export { LISTENING_LIBRARY } from './src/data/listeningLibrary'
  export { EN_SCENES } from './src/data/scenes/scenesEn'
  export { KO_SCENES } from './src/data/scenes/scenesKo'
  export { JA_SCENES } from './src/data/scenes/scenesJa'
  export { PT_SCENES } from './src/data/scenes/scenesPt'
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const m = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })
const docs = [...m.EN_SCENES, ...m.KO_SCENES, ...m.JA_SCENES, ...m.PT_SCENES, ...m.READING_LIBRARY, ...m.LISTENING_LIBRARY]
const lang = process.argv[2]
const from = Number(process.argv[3] ?? 0), to = Number(process.argv[4] ?? 1e9)
let i = 0
for (const d of docs) {
  if (d.lang !== lang) continue
  for (const q of d.questions ?? []) {
    if (m.questionRu(lang, q)) continue
    if (i >= from && i < to) { console.log(`Q ${q.q}`); q.options.forEach(o => console.log(`  - ${o}`)) }
    i++
  }
}
console.error('missing', i)
