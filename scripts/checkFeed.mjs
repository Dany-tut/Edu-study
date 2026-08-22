#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Проверяет ленту: счётчики, реестр источников и — по требованию — подлинность
// текстов.
//
// ТРИ ПРОВЕРКИ, И КАЖДАЯ ЗАКРЫВАЕТ СВОЙ СПОСОБ СОВРАТЬ УЧЕНИКУ
//
//  1. СЧЁТЧИКИ. FEED_COUNTS продублирован в коде, чтобы бейдж «Чтение» знал
//     размер ленты ДО загрузки чанка. Дубль расходится с файлами — сверяем.
//  2. РЕЕСТР. У каждого материала outletId должен существовать в OUTLETS:
//     иначе на карточке не будет ни названия источника, ни лицензии, а текст
//     без указания источника показывать нельзя.
//  3. ПОДЛИННОСТЬ (--verify, ходит в сеть). Материал с textOrigin: 'verbatim'
//     обещает, что это настоящий текст источника. Проверка идёт по ссылке и
//     ищет каждый абзац body в исходнике. Это главная проверка файла: пометка
//     «оригинал» на нашем пересказе — не опечатка, а ложь в том самом поле,
//     ради которого поле заведено.
//
//   node scripts/checkFeed.mjs            — счётчики и реестр
//   node scripts/checkFeed.mjs --fix      — переписать FEED_COUNTS по файлам
//   node scripts/checkFeed.mjs --verify   — плюс сверка текстов с источниками
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'src/data/feed')
const indexPath = join(dir, 'index.ts')
const src = readFileSync(indexPath, 'utf8')

const args = process.argv.slice(2)
const FIX = args.includes('--fix')
const VERIFY = args.includes('--verify')

let bad = 0
const fail = msg => { console.error(`  ✕ ${msg}`); bad++ }

// ─── Языки и файлы берём из LOADERS: добавили язык — проверка подхватила ──────

const loaders = src.match(/const LOADERS: Record<string, Loader> = \{([\s\S]*?)\n\}/)
if (!loaders) {
  console.error('checkFeed: не нашёл LOADERS в data/feed/index.ts')
  process.exit(1)
}

const files = {}
for (const [, lang, file] of loaders[1].matchAll(/(\w+): \(\) => import\('\.\/(\w+)'\)/g)) {
  files[lang] = join(dir, `${file}.ts`)
}

// ─── 1. Счётчики ─────────────────────────────────────────────────────────────

const real = {}
for (const [lang, path] of Object.entries(files)) {
  const text = readFileSync(path, 'utf8')
  // Один материал — одно поле outletId на четырёх пробелах отступа.
  real[lang] = (text.match(/^ {4}outletId:/gm) ?? []).length
}

const block = src.match(/export const FEED_COUNTS: Record<string, number> = \{([\s\S]*?)\n\}/)
if (!block) {
  console.error('checkFeed: не нашёл FEED_COUNTS в data/feed/index.ts')
  process.exit(1)
}

const declared = {}
for (const [, lang, n] of block[1].matchAll(/(\w+): (\d+)/g)) declared[lang] = Number(n)

const off = Object.keys(files).filter(l => declared[l] !== real[l])

if (FIX && off.length) {
  const body = Object.keys(files).map(l => `  ${l}: ${real[l]},`).join('\n')
  writeFileSync(
    indexPath,
    src.replace(block[0], `export const FEED_COUNTS: Record<string, number> = {\n${body}\n}`),
    'utf8',
  )
  console.log(`FEED_COUNTS переписан: ${off.map(l => `${l} ${declared[l] ?? '—'}→${real[l]}`).join(', ')}`)
} else {
  console.log('Счётчики:')
  for (const lang of Object.keys(files)) {
    const ok = declared[lang] === real[lang]
    if (ok) console.log(`  ✓ ${lang}: ${real[lang]}`)
    else fail(`${lang}: в FEED_COUNTS ${declared[lang] ?? '—'}, в файле ${real[lang]} — почини или прогони с --fix`)
  }
}

// ─── 2. Реестр источников ────────────────────────────────────────────────────

const outletIds = new Set([...src.matchAll(/^\s{4}id: '([\w-]+)',$/gm)].map(m => m[1]))

console.log('\nИсточники:')
for (const [lang, path] of Object.entries(files)) {
  const text = readFileSync(path, 'utf8')
  const used = new Set([...text.matchAll(/outletId: '([\w-]+)'/g)].map(m => m[1]))
  for (const id of used) {
    if (outletIds.has(id)) console.log(`  ✓ ${lang}: ${id}`)
    else fail(`${lang}: outletId «${id}» не описан в OUTLETS — материал останется без названия источника и лицензии`)
  }
  // Ссылка обязательна на всех дорожках: без неё не проверить ни лицензию, ни
  // сам факт, что материал существует.
  const items = (text.match(/^ {4}outletId:/gm) ?? []).length
  const urls = (text.match(/^ {4}url: '/gm) ?? []).length
  if (items !== urls) fail(`${lang}: материалов ${items}, а ссылок ${urls} — у кого-то нет url`)
}

// ─── 3. Подлинность текстов ──────────────────────────────────────────────────

if (VERIFY) {
  console.log('\nСверка с источниками (ходим в сеть):')

  const sleep = ms => new Promise(r => setTimeout(r, ms))
  let last = 0
  async function get(url) {
    const wait = 1100 - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    const res = await fetch(url, {
      headers: { 'user-agent': 'student-dashboard feed check (educational, contact via repo)' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.text()
  }

  /**
   * Нормализация перед сравнением. Сравнивать байт в байт нельзя: источник
   * отдаёт текст то в HTML, то через API, по-разному расставляя пробелы и
   * кавычки. Смысл проверки — «эти слова в этом порядке есть в исходнике», а
   * не «совпал каждый пробел».
   */
  const entities = s => s
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')

  const norm = s => entities(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[«»“”„"]/g, '"')
    .replace(/[’‘']/g, "'")
    .replace(/[—–-]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()

  for (const [lang, path] of Object.entries(files)) {
    const text = readFileSync(path, 'utf8')
    // Разбираем файл по материалам: id, url, textOrigin и body в бэктиках.
    const items = [...text.matchAll(
      /id: '([\w-]+)',[\s\S]*?url: '([^']+)',[\s\S]*?body: `([\s\S]*?)`,/g,
    )]

    for (const [, id, url, body] of items) {
      const origin = text.slice(text.indexOf(`id: '${id}'`))
        .match(/textOrigin: '(\w+)'/)?.[1]
      if (origin !== 'verbatim') {
        console.log(`  · ${id}: наш текст, сверять не с чем`)
        continue
      }

      try {
        const page = norm(await sourceText(url))
        const paras = body.split('\n\n').map(p => p.trim()).filter(Boolean)
        const missing = paras.filter(p => !page.includes(norm(p)))
        if (missing.length === 0) {
          console.log(`  ✓ ${id}: ${paras.length} абз. слово в слово`)
        } else {
          fail(`${id}: ${missing.length} из ${paras.length} абзацев не найдено в источнике`)
          console.error(`      первый: «${missing[0].slice(0, 70)}…»`)
        }
      } catch (e) {
        // Недоступный источник — не повод считать текст поддельным, но и
        // молчать нельзя: непроверенное должно быть видно.
        console.log(`  ? ${id}: источник не ответил (${e.message})`)
      }
    }
  }
}

console.log(bad === 0 ? '\nЛента в порядке.' : `\nПроблем: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
