// ─────────────────────────────────────────────────────────────────────────────
// Сверяет лёгкие таблицы с реальными данными: src/lib/legacyLinkIndex.ts
// (язык старых адресов), src/data/readingCounts.ts (сколько текстов у языка) и
// src/data/feed/themes.ts (тема источника ленты).
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
//   npm run check:light            — проверить (ненулевой код при расхождении)
//   npm run check:light -- --fix   — переписать таблицы по данным
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKS } from '../src/data/scenes/index.ts'
import { READING_LIBRARY } from '../src/data/readingLibrary.ts'
import { OUTLETS } from '../src/data/feed/outlets.ts'

// cwd, а не import.meta.url: скрипт запускается собранным в node_modules/.cache
// (см. check:links в package.json), и путь модуля указывал бы туда.
const root = process.cwd()
const linkTarget = join(root, 'src/lib/legacyLinkIndex.ts')
const countsTarget = join(root, 'src/data/readingCounts.ts')
const themesTarget = join(root, 'src/data/feed/themes.ts')

/** id → 'lang' или 'lang|subject'. Предмет пишется только там, где он есть. */
const texts = {}
for (const t of READING_LIBRARY) texts[t.id] = t.subject ? `${t.lang}|${t.subject}` : t.lang
const works = {}
for (const w of WORKS) works[w.id] = w.lang

/** id источника → его тема. Всё, что от реестра нужно фильтрам ленты. */
const themes = {}
for (const o of OUTLETS) themes[o.id] = o.theme

/** Сколько учебных текстов у языка — для счётчиков меню (см. readingCounts). */
const counts = {}
for (const t of READING_LIBRARY) counts[t.lang] = (counts[t.lang] ?? 0) + 1

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

const COUNTS_HEAD = `// ─────────────────────────────────────────────────────────────────────────────
// Сколько учебных текстов у языка
//
// ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ. Руками не правится: \`npm run check:light -- --fix\`.
//
// ЗАЧЕМ. Меню режимов показывает у «Чтения» сумму «учебные тексты + сцены» ещё
// до того, как приедут сами тексты, — и ради одного числа тянуло во входной
// чанк READING_LIBRARY целиком (200 КБ вместе с телами текстов и словарями).
// Ровно тот же приём, что у SCENE_COUNTS в data/scenes/counts.ts.
//
// Сторож (scripts/checkLightData.mjs) не даёт таблице разойтись с библиотекой.
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_COUNTS: Record<string, number> = {`

function renderCounts() {
  const body = Object.entries(counts)
    .map(([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${v},`)
    .join('\n')
  return `${COUNTS_HEAD}\n${body}\n}\n\n/** Столько учебных текстов у языка. 0 — их нет. */\nexport const textCount = (lang: string | undefined): number =>\n  lang ? TEXT_COUNTS[lang] ?? TEXT_COUNTS[lang.split('-')[0].toLowerCase()] ?? 0 : 0\n`
}

const THEMES_HEAD = `// ─────────────────────────────────────────────────────────────────────────────
// Тема источника ленты
//
// ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ. Руками не правится: \`npm run check:light -- --fix\`.
//
// ЗАЧЕМ. Чипсы над лентой («Наука», «Техника») раскладывают материалы по теме
// ИСТОЧНИКА, и ради одного этого поля itemTheme() держал в модуле весь реестр
// изданий — шестьсот строк с лицензиями, аватарками и адресами RSS. Реестр
// нужен там, где рисуют пост; фильтрам довольно этой таблички, и с ней
// мобильная главная больше не тянет реестр во входной чанк.
//
// Сторож (scripts/checkLightData.mjs) не даёт таблице разойтись с реестром.
// ─────────────────────────────────────────────────────────────────────────────
import type { FeedTheme } from './index'

export const OUTLET_THEME: Record<string, FeedTheme> = {`

function renderThemes() {
  const body = Object.entries(themes)
    .map(([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: '${v}',`)
    .join('\n')
  return `${THEMES_HEAD}\n${body}\n}\n`
}

const read = (f) => { try { return readFileSync(f, 'utf8') } catch { return '' } }
const want = [[linkTarget, render()], [countsTarget, renderCounts()], [themesTarget, renderThemes()]]
const stale = want.filter(([f, next]) => read(f) !== next)

if (stale.length === 0) {
  console.log(`\u2713 лёгкие таблицы совпадают с данными (текстов ${Object.keys(texts).length}, произведений ${Object.keys(works).length}).`)
  process.exit(0)
}

if (process.argv.includes('--fix')) {
  for (const [f, next] of stale) { writeFileSync(f, next); console.log(`переписан ${f.slice(root.length + 1)}`) }
  process.exit(0)
}

console.error(`\u2717 разошлись с данными: ${stale.map(([f]) => f.slice(root.length + 1)).join(', ')}. Почини: npm run check:light -- --fix`)
process.exit(1)
