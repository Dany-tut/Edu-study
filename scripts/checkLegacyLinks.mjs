// ─────────────────────────────────────────────────────────────────────────────
// Сверяет src/lib/legacyLinkIndex.ts с реальными данными.
//
// ЗАЧЕМ. Старые адреса тренажёра — `#/trainer/text/<id>` и
// `#/trainer/work/<id>` — не несут языка: его надо было доставать из реестров.
// Разбор адреса идёт СИНХРОННО, на уровне модуля, до первого кадра (см.
// bootTrainerLink), и ради двух полей — языка и предмета — во входной чанк
// уезжали WORKS (197 КБ) и READING_LIBRARY (127 КБ) целиком.
//
// Тот же приём, что у SCENE_COUNTS (см. checkScenes.mjs): нужное продублировано
// лёгкой таблицей, а эта проверка не даёт таблице разойтись с данными.
//
//   npm run check:links        — проверить (ненулевой код при расхождении)
//   npm run check:links -- --fix   — переписать таблицу по данным
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKS } from '../src/data/scenes/index.ts'
import { READING_LIBRARY } from '../src/data/readingLibrary.ts'

// cwd, а не import.meta.url: скрипт запускается собранным в node_modules/.cache
// (см. check:links в package.json), и путь модуля указывал бы туда.
const root = process.cwd()
const target = join(root, 'src/lib/legacyLinkIndex.ts')

/** id → 'lang' или 'lang|subject'. Предмет пишется только там, где он есть. */
const texts = {}
for (const t of READING_LIBRARY) texts[t.id] = t.subject ? `${t.lang}|${t.subject}` : t.lang
const works = {}
for (const w of WORKS) works[w.id] = w.lang

const HEAD = `// ─────────────────────────────────────────────────────────────────────────────
// Язык старых адресов тренажёра
//
// ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ. Руками не правится: \`npm run check:links -- --fix\`.
//
// ЗАЧЕМ. Адреса \`#/trainer/text/<id>\` и \`#/trainer/work/<id>\` разошлись по
// перепискам до того, как язык встал в адрес явно, и продолжают работать. Язык
// у них берётся из реестра — но разбор адреса идёт синхронно, до первого кадра,
// и импорт READING_LIBRARY с WORKS ради двух полей тащил во входной чанк 320 КБ
// данных: все сто двадцать произведений с аннотациями и вся библиотека чтения.
// Здесь лежит ровно то, что нужно разбору, — id, язык и предмет.
//
// Сторож (scripts/checkLegacyLinks.mjs) не даёт таблице разойтись с данными.
// ─────────────────────────────────────────────────────────────────────────────

/** id учебного текста → язык, или 'язык|предмет' там, где язык общий. */
export const TEXT_LANG: Record<string, string> = {`

function render() {
  const line = (o) => Object.entries(o)
    .map(([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: '${v}',`)
    .join('\n')
  return `${HEAD}
${line(texts)}
}

/** id произведения полки сцен → язык. */
export const WORK_LANG: Record<string, string> = {
${line(works)}
}
`
}

const next = render()
const now = (() => { try { return readFileSync(target, 'utf8') } catch { return '' } })()

if (now === next) {
  console.log(`✓ legacyLinkIndex.ts совпадает с данными (текстов ${Object.keys(texts).length}, произведений ${Object.keys(works).length}).`)
  process.exit(0)
}

if (process.argv.includes('--fix')) {
  writeFileSync(target, next)
  console.log(`legacyLinkIndex.ts переписан: текстов ${Object.keys(texts).length}, произведений ${Object.keys(works).length}.`)
  process.exit(0)
}

console.error('✗ legacyLinkIndex.ts разошёлся с данными. Почини: npm run check:links -- --fix')
process.exit(1)
