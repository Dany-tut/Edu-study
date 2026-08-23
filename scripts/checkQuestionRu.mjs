// Проверка перевода вопросов к тексту: у каждого вопроса переводятся И
// формулировка, И все варианты ответа.
//
// ЗАЧЕМ. Перевод вопроса лежит отдельно от самого вопроса (src/data/questionRu.ts
// против шести файлов с материалами) и связан с ним строкой оригинала. Связь по
// строке переживает перестановку вопросов, но не переживает правку формулировки:
// подправили запятую в вопросе — ключ больше не совпадает, кнопка перевода у
// вопроса молча исчезла. Сборка от этого не падает, видно это только тому, кто
// откроет именно этот текст. Поэтому сверяем скриптом.
//
// Перевод показывается по правилу «всё или ничего» (см. questionRu), поэтому
// вопрос с переведённой формулировкой и одним непереведённым вариантом здесь
// считается непереведённым — ученик увидит ровно это.
//
// ВТОРАЯ ПРОВЕРКА — ДУБЛИ КЛЮЧЕЙ. Словарь переводов это обычный объектный
// литерал, и повторный ключ в нём не ошибка, а тихая замена: вторая запись
// затирает первую, и один из двух переводов написан зря. Заметить это по
// собранному объекту невозможно — там уже остался один ключ, — поэтому дубли
// ищутся ПО ИСХОДНОМУ ТЕКСТУ файла, отдельно внутри каждого языкового блока.
// Одинаковый ключ в разных языках дублем не считается: «No» по-английски и
// «No» в португальском — разные слова.
//
// Запуск: npm run check:questions

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'qru-'))
const out = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { questionRu, isAlreadyRu } from './src/data/questionRu'
      export { READING_LIBRARY } from './src/data/readingLibrary'
      export { LISTENING_LIBRARY } from './src/data/listeningLibrary'
      export { EN_SCENES } from './src/data/scenes/scenesEn'
      export { KO_SCENES } from './src/data/scenes/scenesKo'
      export { JA_SCENES } from './src/data/scenes/scenesJa'
      export { PT_SCENES } from './src/data/scenes/scenesPt'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const {
  questionRu, isAlreadyRu, READING_LIBRARY, LISTENING_LIBRARY, EN_SCENES, KO_SCENES, JA_SCENES, PT_SCENES,
} = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

const docs = [
  ...[...EN_SCENES, ...KO_SCENES, ...JA_SCENES, ...PT_SCENES].map(s => ({ ...s, kind: 'сцена' })),
  ...READING_LIBRARY.map(t => ({ ...t, kind: 'текст' })),
  ...LISTENING_LIBRARY.map(t => ({ ...t, kind: 'аудио' })),
]

const perLang = {}
let bad = 0

for (const d of docs) {
  const st = (perLang[d.lang] ??= { total: 0, holes: 0 })
  const holes = []
  for (const q of d.questions ?? []) {
    // Вопрос, заданный по-русски (о грамматике, о регистре), перевода не
    // требует: считать его дырой значило бы держать список вечно красным.
    if (isAlreadyRu(q)) continue
    st.total++
    if (questionRu(d.lang, q)) continue
    st.holes++
    // Что именно не сошлось: сама формулировка или вариант ответа. Без этого
    // разбирать длинный список приходится, сверяя строки глазами.
    const missing = [q.q, ...q.options].filter(s => !questionRu(d.lang, { q: s, options: [], correct: 0 }))
    holes.push(missing.length ? missing : [q.q])
  }
  if (!holes.length) continue
  bad++
  console.log(`❌ ${d.lang} ${d.id} (${d.kind}): без перевода ${holes.length} из ${d.questions.length}`)
  for (const m of holes) console.log(`   ${m.join(' · ')}`)
  console.log()
}

// ─── Дубли ключей в самом словаре ────────────────────────────────────────────
//
// Ключи разбираются построчно: файл написан по одной записи в строке, и полный
// разбор TypeScript здесь был бы дороже задачи. Строка, не похожая на запись
// «'ключ': 'перевод',», просто пропускается — комментарии и переносы не мешают.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/data/questionRu.ts'), 'utf8').split('\n')

const LANG_OPEN = /^  ('?[\w-]+'?): \{$/
const ENTRY = /^    ('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"): /

let lang = null
const seen = new Map()
const dups = []
for (const [i, line] of src.entries()) {
  const open = line.match(LANG_OPEN)
  if (open) { lang = open[1].replace(/'/g, ''); seen.set(lang, new Map()); continue }
  if (line === '  },') { lang = null; continue }
  if (!lang) continue
  const entry = line.match(ENTRY)
  if (!entry) continue
  const key = entry[1]
  const keys = seen.get(lang)
  if (keys.has(key)) dups.push({ lang, key, first: keys.get(key), second: i + 1 })
  else keys.set(key, i + 1)
}

for (const d of dups) {
  bad++
  console.log(`❌ ${d.lang}: ключ ${d.key} записан дважды — строки ${d.first} и ${d.second}`)
  console.log('   Вторая запись затирает первую; оставить нужно одну.\n')
}

console.log('─'.repeat(60))
for (const [lang, st] of Object.entries(perLang).sort()) {
  const done = st.total - st.holes
  const pct = st.total ? Math.round((done / st.total) * 100) : 100
  console.log(`${st.holes ? '❌' : '✅'} ${lang}: переведено ${done} из ${st.total} вопросов (${pct}%)`)
}

console.log(dups.length ? `❌ дублей ключей: ${dups.length}` : '✅ дублей ключей нет')

process.exit(bad ? 1 : 0)
