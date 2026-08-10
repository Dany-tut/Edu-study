// Проверка словаря корней ханча: node scripts/checkHanja.mjs
//
// ЗАЧЕМ. Гнездо корня — это утверждение «все эти слова собраны вот из этого
// кирпича», и проверить его глазами нельзя: слов больше сотни, а ошибка выглядит
// правдоподобно. При первой же вычитке нашлись три слова, стоявшие под корнем,
// которого в них нет вообще: 공항 под 場, 지하철 под 電, 환자 под 病. Каждое из
// них учит ученика неверному разбору, то есть работает ровно против того, ради
// чего словарь написан.
//
// ЧТО ПРОВЕРЯЕТСЯ АВТОМАТИЧЕСКИ. Что слог корня действительно есть в слове —
// с поправкой на чередование чтения (поле alt: 년 → 연 по 두음법칙, 불 → 부
// перед ㄷ и ㅈ, 車 как 차 и как 거). Такие слова обязаны называть свой иероглиф
// в разборе, иначе пометка alt превращается в способ спрятать ошибку.
//
// ЧЕГО ПРОВЕРКА НЕ ЛОВИТ И ПОЧЕМУ. Этимологию. 안내 — это 案內, а не 安內, но
// слог 안 в слове есть, и машинально оно проходит. Такие места ловятся только
// вычиткой; скрипт снимает механический слой, чтобы вычитке осталось смысловое.

import { readFileSync } from 'node:fs'

const SRC = new URL('../src/data/koreanHanja.ts', import.meta.url).pathname
const src = readFileSync(SRC, 'utf8')

let bad = 0
const fail = msg => { console.log('❌', msg); bad++ }

// Разбираем файл текстом, а не импортом: скрипт запускается голым node, без
// сборщика, а тащить сюда tsx ради одного файла данных дороже, чем регулярка.
const roots = [...src.matchAll(/ko: '([^']+)', cn: '([^']+)', ru: '([^']+)', group: '([^']+)'/g)]
  .map(m => ({ ko: m[1], cn: m[2], ru: m[3], group: m[4], words: [] }))

const blocks = src.split(/\n  \{\n    ko: /).slice(1)
if (blocks.length !== roots.length) fail(`корней ${roots.length}, блоков ${blocks.length}`)

blocks.forEach((block, i) => {
  const root = roots[i]
  for (const m of block.matchAll(/w\('([^']+)', '([^']+)', '([^']+)', '([^']+)'(?:, '([^']+)')?\)/g)) {
    root.words.push({ term: m[1], reading: m[2], ru: m[3], parts: m[4], alt: m[5] })
  }
})

// 1. Корень обязан быть в слове — с поправкой на чередование чтения.
let alts = 0
for (const root of roots) {
  if (!root.words.length) fail(`${root.ko}: пустое гнездо`)
  for (const word of root.words) {
    const syllable = word.alt ?? root.ko
    if (!word.term.includes(syllable)) {
      fail(`${root.ko} (${root.cn}): в слове ${word.term} «${word.ru}» нет слога «${syllable}» — ${word.parts}`)
    } else if (word.alt) {
      alts++
      if (!word.parts.includes(root.cn)) {
        fail(`${word.term}: чередование ${root.ko} → ${word.alt} не объяснено, иероглиф ${root.cn} в разборе не назван`)
      }
    }
  }
}

// 2. Разбор обязан быть непустым и содержать плюс: «学 учёба» без второй части
//    не разбор, а перевод.
for (const root of roots) {
  for (const word of root.words) {
    if (!word.parts.includes('+')) fail(`${word.term}: разбор «${word.parts}» не разложен на части`)
  }
}

// 3. Корни не повторяются, романизация не пустая.
const seen = new Set()
for (const root of roots) {
  if (seen.has(root.ko)) fail(`корень ${root.ko} встречается дважды`)
  seen.add(root.ko)
  for (const word of root.words) {
    if (!/^[a-z]/.test(word.reading)) fail(`${word.term}: романизация «${word.reading}» выглядит неверно`)
  }
}

const total = roots.reduce((n, r) => n + r.words.length, 0)
console.log(`Корней: ${roots.length}, слов в гнёздах: ${total}, с чередованием чтения: ${alts}`)
console.log(bad === 0 ? '\n✅ всё сходится' : `\n❌ проблем: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
