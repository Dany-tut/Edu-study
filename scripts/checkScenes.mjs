#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Сверяет SCENE_COUNTS в src/data/scenes/counts.ts с тем, сколько сцен реально
// лежит в файлах-чанках.
//
// ЗАЧЕМ. Тексты сцен грузятся отдельным чанком, а «Чтение» в меню режимов
// должно показывать сумму «учебные тексты + сцены» ЕЩЁ ДО загрузки — иначе у
// корейского в меню стоит 3 при 3 текстах и 15 сценах на экране. Поэтому
// количество продублировано синхронной таблицей, а эта проверка не даёт ей
// разойтись с файлами.
//
//   node scripts/checkScenes.mjs        — проверить (ненулевой код при расхождении)
//   node scripts/checkScenes.mjs --fix  — переписать таблицу по файлам
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = join(root, 'src/data/scenes/index.ts')
// Счётчики живут отдельным лёгким модулем: index.ts весит 122 КБ (в нём WORKS),
// и импорт ради одного числа тащил его в главный чанк.
const countsPath = join(root, 'src/data/scenes/counts.ts')
const src = readFileSync(indexPath, 'utf8')

// Языки и их файлы берём из самих LOADERS: добавили язык — проверка подхватила.
const loaders = src.match(/const LOADERS: Record<string, Loader> = \{([\s\S]*?)\n\}/)
if (!loaders) {
  console.error('checkScenes: не нашёл LOADERS в data/scenes/index.ts')
  process.exit(1)
}

const real = {}
for (const [, lang, file] of loaders[1].matchAll(/(\w+): \(\) => import\('\.\/(\w+)'\)/g)) {
  const text = readFileSync(join(root, 'src/data/scenes', `${file}.ts`), 'utf8')
  // Одна сцена — одно поле workId на четырёх пробелах отступа.
  real[lang] = (text.match(/^ {4}workId:/gm) ?? []).length
}

const countsSrc = readFileSync(countsPath, 'utf8')
const block = countsSrc.match(/export const SCENE_COUNTS: Record<string, number> = \{([\s\S]*?)\n\}/)
if (!block) {
  console.error('checkScenes: не нашёл SCENE_COUNTS в data/scenes/counts.ts')
  process.exit(1)
}
const declared = {}
for (const [, lang, n] of block[1].matchAll(/(\w+): (\d+)/g)) declared[lang] = Number(n)

const bad = Object.keys(real).filter(l => declared[l] !== real[l])
for (const lang of Object.keys(real)) {
  const ok = declared[lang] === real[lang]
  console.log(`${ok ? '✓' : '✗'} ${lang}: в файле ${real[lang]}${ok ? '' : `, в SCENE_COUNTS ${declared[lang] ?? '—'}`}`)
}

if (!bad.length) {
  console.log('SCENE_COUNTS совпадает с файлами.')
  process.exit(0)
}

if (!process.argv.includes('--fix')) {
  console.error('\nРасхождение. Поправь SCENE_COUNTS или запусти: node scripts/checkScenes.mjs --fix')
  process.exit(1)
}

const body = Object.entries(real).map(([lang, n]) => `  ${lang}: ${n},`).join('\n')
writeFileSync(countsPath, countsSrc.replace(block[0], `export const SCENE_COUNTS: Record<string, number> = {\n${body}\n}`))
console.log('\nТаблица переписана по файлам.')
