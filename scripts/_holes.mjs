import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'gloss-'))
const out = join(tmp, 'bundle.mjs')
await build({ stdin: { contents: `
  export { buildLexicon } from './src/lib/lexicon'
  export { READING_LIBRARY } from './src/data/readingLibrary'
  export { EN_SCENES } from './src/data/scenes/scenesEn'
  export { KO_SCENES } from './src/data/scenes/scenesKo'
  export { JA_SCENES } from './src/data/scenes/scenesJa'
  export { PT_SCENES } from './src/data/scenes/scenesPt'
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const M = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })
const only = process.argv.slice(2)
const all = [...M.EN_SCENES, ...M.KO_SCENES, ...M.JA_SCENES, ...M.PT_SCENES, ...M.READING_LIBRARY]
const mark = (segs) => segs.map(x => (x.word && !x.gloss) ? `«${x.text}»` : x.text).join('')
for (const d of all) {
  if (only.length && !only.includes(d.id)) continue
  const lex = M.buildLexicon(d.lang, d.glossary ?? [])
  const segs = lex.segment(d.body)
  const qbad = (d.questions ?? []).filter(q => q.q && lex.segment(q.q).some(x => x.word && !x.gloss))
  if (!segs.some(x => x.word && !x.gloss) && !qbad.length) continue
  console.log(`\n===== ${d.id} =====`)
  for (const line of mark(segs).split('\n')) if (line.trim()) console.log(line)
  for (const q of qbad) console.log('  ? ' + mark(lex.segment(q.q)))
}
