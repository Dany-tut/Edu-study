// Проверка данных каны и курса «Японский с нуля: кана».
//   node scripts/checkKana.mjs
// 1) у каждого знака уроков есть черты (kanaStrokes.ts);
// 2) слова урока — только из знаков этого и прошлых уроков;
// 3) у вопросов «как читается» нет двух одинаковых вариантов.
import { build } from 'esbuild'
const r = await build({
  stdin: {
    contents: `export * from './src/data/kana'; export { KANA_STROKES } from './src/data/kanaStrokes'; export { KANA_UNITS } from './src/data/japaneseKana'`,
    resolveDir: '.', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error',
})
const m = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'))
let bad = 0
const fail = msg => { bad++; console.error('✗ ' + msg) }
const known = new Set()
for (const l of m.KANA_LESSONS) {
  for (const ch of l.kana) {
    if (!m.KANA[ch]) fail(`${l.id}: знака ${ch} нет в KANA`)
    if (!m.KANA_STROKES[ch]) fail(`${l.id}: у ${ch} нет черт`)
    known.add(ch)
  }
  for (const w of l.words) for (const ch of w.w) if (!known.has(ch)) fail(`${l.id}: в слове ${w.w} знак ${ch} ещё не пройден`)
  for (const c of l.combos ?? []) if (!m.COMBO_READING[c]) fail(`${l.id}: нет чтения слога ${c}`)
}
for (const u of m.KANA_UNITS) for (const t of u.tasks) {
  if (t.choices && new Set(t.choices).size !== t.choices.length) fail(`${u.shortId}: повтор вариантов в «${t.question}»: ${t.choices.join(', ')}`)
  if (t.type === 'trace' && !m.KANA_STROKES[t.chamo]) fail(`${u.shortId}: обводка без черт ${t.chamo}`)
}
const total = m.KANA_UNITS.reduce((n, u) => n + u.tasks.length, 0)
console.log(bad ? `ошибок: ${bad}` : `кана в порядке: ${known.size} знаков, ${m.KANA_UNITS.length} уроков, ${total} авторских заданий`)
process.exit(bad ? 1 : 0)
