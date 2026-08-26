// Сторож позиции верного ответа: распределение по всем курсам-сидам.
//
// ЗАЧЕМ. Хелпер `one(question, choices, correct)` почти везде звался как
// `one(..., [верный, ...обманки], 0)`, и по всем сидам верный ответ стоял
// первым в 52% вопросов — а в экзамене порции (vocabRecognition, ступень 4)
// в 100%. Ученик, который жмёт верхний вариант НЕ ЧИТАЯ, получал больше
// половины верных, и целевая проверка урока не измеряла ничего.
//
// ПОЧЕМУ НЕ «ДОЛЖНО БЫТЬ 25%». Вопросы разной ширины: у лестницы два варианта
// (случай даёт 50%), у экзамена четыре (25%). Поэтому сторож считает СЛУЧАЙ
// для конкретного набора вопросов — сумму 1/N по каждому — и смотрит, на
// сколько его перебирает КАЖДОЕ место. Ровно это и есть «сколько ученик
// получает сверх угадывания», а жать вслепую можно не только верхнюю строку.
//
// ЧТО ЕЩЁ СЮДА ВХОДИТ. Не только выбор из вариантов: тем же дефектом болеет
// пара на слух (ответ A/B — «A» выпадала в 56% из 6051 задания) и «отметьте
// всё верное» (верные шли первыми в 84 заданиях из 85). Считаем их одной
// меркой: сколько ученик получает сверх угадывания, ткнув не читая.
//
// ЧЕГО ЗДЕСЬ НЕТ. Сопоставление и «расставьте по порядку» хранят ответ в
// авторском порядке, но ученику показываются перемешанными (см. SequenceSolver
// в HomeworkFlow.tsx) — позиции в данных там не значат ничего.
//
// ТРИ РАЗДЕЛА. Курсы-сиды (место чинит placeCorrect в данных), диагностики и
// placement (место чинит displayOrder на показе) и банки вопросов вне того и
// другого — тексты, аудио, сцены, лента, справочник грамматики, тренажёр AP.
// Третьего раздела сторож не видел вовсе, и правило там было нарушено целиком:
// см. комментарий перед его блоком.
//
// Запуск: npm run check:choicepos   (--detail — разбивка по роду заданий)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { COURSE_SEEDS } from '../src/data/courseSeeds.ts'
import { DEFAULT_QUESTIONS } from '../src/data/diagnosticData.ts'
import { displayOrder } from '../src/data/taskTypes.ts'
import { READING_LIBRARY } from '../src/data/readingLibrary.ts'
import { LISTENING_LIBRARY } from '../src/data/listeningLibrary.ts'
import { EN_SCENES } from '../src/data/scenes/scenesEn.ts'
import { KO_SCENES } from '../src/data/scenes/scenesKo.ts'
import { JA_SCENES } from '../src/data/scenes/scenesJa.ts'
import { PT_SCENES } from '../src/data/scenes/scenesPt.ts'
import { DE_SCENES } from '../src/data/scenes/scenesDe.ts'
import { RU_SCENES } from '../src/data/scenes/scenesRu.ts'
import { EN_FEED } from '../src/data/feed/feedEn.ts'
import { KO_FEED } from '../src/data/feed/feedKo.ts'
import { JA_FEED } from '../src/data/feed/feedJa.ts'
import { PT_FEED } from '../src/data/feed/feedPt.ts'
import { RUSSIAN_GRAMMAR } from '../src/data/grammarRu.ts'
import { GERMAN_GRAMMAR } from '../src/data/grammarDe.ts'
import { ENGLISH_GRAMMAR } from '../src/data/grammar/grammarEn.ts'
import { KOREAN_GRAMMAR } from '../src/data/grammar/grammarKo.ts'
import { AP_CHEM_TRAINERS } from '../src/data/apChemistry.ts'

const detail = process.argv.includes('--detail')

/**
 * Насколько перевес ЛЮБОГО места над случаем считается поломкой.
 *
 * Считаем в процентных пунктах СВЕРХ случая, а не в процентах: 40% верных на
 * первом месте — это перекос там, где вопросы двухвариантные (случай 50%), и
 * норма там, где четырёхвариантные (случай 25%).
 */
const MAX_EXCESS = 6

const mk = () => ({ pos: new Map(), n: 0, chance: 0 })
const add = (acc, pos, count) => {
  acc.pos.set(pos, (acc.pos.get(pos) ?? 0) + 1)
  acc.n++
  acc.chance += 1 / count
}

const all = mk()
const perSeed = []
const byKind = new Map()
const kind = k => {
  if (!byKind.has(k)) byKind.set(k, mk())
  return byKind.get(k)
}
/** Хвост id без номера: `l` из `kotp-03-2-l7`. */
const idKind = id => (String(id ?? '?').match(/([a-z]+)\d*$/i)?.[1] ?? '?')

for (const seed of COURSE_SEEDS) {
  const course = await seed.build(`pos-${seed.key}`)
  const mine = mk()
  for (const lesson of course.lessons ?? []) {
    for (const task of lesson.hwTasks ?? []) {
      // Пара на слух: ответ — буква, но дефект тот же, и место у неё одно из
      // двух. Считаем «A» нулевым местом.
      if (task.type === 'minimalPair' && task.correctPair) {
        const pos = task.correctPair === 'A' ? 0 : 1
        add(mine, pos, 2); add(all, pos, 2); add(kind('pair'), pos, 2)
        continue
      }
      const count = task.choices?.length ?? 0
      if (count < 2) continue
      // «Отметьте всё верное»: место каждого верного варианта — своё
      // наблюдение. Случай для одного верного из N так и остаётся 1/N.
      if (task.type === 'multi') {
        for (const pos of task.correctChoices ?? []) {
          add(mine, pos, count); add(all, pos, count); add(kind('multi'), pos, count)
        }
        continue
      }
      if (task.type !== 'single') continue
      const pos = task.correctChoices?.[0]
      if (typeof pos !== 'number') continue
      add(mine, pos, count); add(all, pos, count)
      add(kind(idKind(task.id)), pos, count)
    }
  }
  perSeed.push({ key: seed.key, acc: mine })
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const first = acc => (acc.pos.get(0) ?? 0)
/** Перевес первого места над случаем, в процентных пунктах. */
const excess = acc => (acc.n ? ((first(acc) - acc.chance) / acc.n) * 100 : 0)
const spread = acc => [...acc.pos.keys()].sort((a, b) => a - b)
  .map(p => `место ${p + 1} — ${acc.pos.get(p)} (${pct(acc.pos.get(p), acc.n)})`).join(', ')

console.log(`Ответов, у которых есть место (выбор, пара на слух, «всё верное»): ${all.n}`)
console.log(spread(all))
console.log(`\nВерхний вариант: ${pct(first(all), all.n)} верных, не читая`)
console.log(`Случай на этом наборе: ${pct(all.chance, all.n)} — перевес ${excess(all).toFixed(1)} п.п.`)

console.log('\nПо курсам (столбец — перевес ПЕРВОГО места; сторож ниже смотрит все):')
for (const { key, acc } of perSeed) {
  console.log(`  ${key.padEnd(6)} ${String(acc.n).padStart(5)}  ${excess(acc).toFixed(1).padStart(6)} п.п.  ${spread(acc)}`)
}

if (detail) {
  console.log('\nПо роду заданий:')
  for (const [k, acc] of [...byKind].sort((a, b) => excess(b[1]) - excess(a[1]))) {
    console.log(`  ${k.padEnd(4)} ${String(acc.n).padStart(5)}  первых ${pct(first(acc), acc.n).padStart(4)}  случай ${pct(acc.chance, acc.n).padStart(4)}  перевес ${excess(acc).toFixed(1)} п.п.`)
  }
}

// Сторож. Порог по КУРСУ, а не только по сумме: перекос в одном курсе тонет
// в двенадцати тысячах вопросов остальных, а проходит его отдельный ученик.
//
// ПРОВЕРЯЕМ ВСЕ МЕСТА, А НЕ ТОЛЬКО ПЕРВОЕ. Ученик, который всегда жмёт вторую
// строку, читает ровно столько же, сколько тот, кто жмёт первую. Пока верный
// ответ раскладывали руками, второе место перебирало случай на 3.7 п.п. по
// всем курсам и на 17.8 в `ielt`: авторы ставят верный вторым чаще прочего
// («первый заведомо мимо, верный сразу за ним»). Теперь место считает
// `one()` для всех заданий разом, и держать порог только на первом месте
// значило бы охранять одну дверь из четырёх.
const at = (acc, p) => (acc.n ? (((acc.pos.get(p) ?? 0) - acc.chance) / acc.n) * 100 : 0)
const worst = acc => [...acc.pos.keys()]
  .map(p => [p, at(acc, p)])
  .sort((a, b) => b[1] - a[1])[0] ?? [0, 0]

// ПОРОГ ЕЩЁ И ПО РОДУ ЗАДАНИЙ. Курса и суммы мало: «отметьте всё верное» даёт
// 218 наблюдений из 19 тысяч, и его перекос — даже полный, все верные первыми —
// сдвигает общий счёт на полтора пункта и проходит незамеченным. Проверено: с
// выключенным spreadMulti сторож молчал. Род заданий сравнивается сам с собой,
// и там те же 218 наблюдений уже показывают перекос в полный рост.
const bad = [
  ['все курсы', all],
  ...perSeed.map(s => [s.key, s.acc]),
  ...[...byKind].map(([k, acc]) => [`род «${k}»`, acc]),
].filter(([, acc]) => acc.n >= 150 && worst(acc)[1] > MAX_EXCESS)
if (bad.length) {
  console.log('')
  for (const [where, acc] of bad) {
    const [p, e] = worst(acc)
    console.log(`  ✗ ${where}: место ${p + 1} на ${e.toFixed(1)} п.п. чаще случая (потолок ${MAX_EXCESS})`)
  }
  console.log('\nМесто верного ответа раскладывает `one()` через placeCorrect в src/data/taskTypes.ts (Р15).')
  console.log('Задание, собранное объектом в обход `one()`, туда не попадает — зовите placeCorrect/answerSide вручную.')
  process.exit(1)
}
// ── Диагностики и placement ─────────────────────────────────────────────────
//
// Они живут не в COURSE_SEEDS, а статикой в diagnosticData.ts/placementTests.ts,
// и перекос там был хуже, чем в курсах: у корейского placement верный ответ
// стоял первым во ВСЕХ 25 вопросах, у английского вторым в 73%, у биологии с
// химией третьим в половине.
//
// ПОЧЕМУ МЕРЯЕМ ПОКАЗ, А НЕ ДАННЫЕ. Переставить варианты в самих данных нельзя:
// ответ ученика сохраняется как НОМЕР выбранного варианта (diag_results.answers),
// и правка задним числом переврала бы все уже сданные тесты — верный ответ
// показался бы неверным, а рядом встал бы чужой текст. Поэтому порядок меняется
// на ПОКАЗЕ (displayOrder в DiagnosticTestPage), а хранимое остаётся прежним.
// Значит и мерить надо то, что видит ученик: где верный ответ окажется на
// экране, а не где он лежит в файле.
const shown = mk()
const perTest = []
/**
 * Порядок показа обязан быть ПОЛНОЙ перестановкой: каждый исходный номер ровно
 * один раз. Проверяем это отдельно от распределения, потому что поломка тут
 * куда хуже перекоса — потерянный номер убирает вариант с экрана, задвоенный
 * показывает его дважды, и оба раза ученик решает задание, которого нет.
 */
const brokenOrder = []
for (const [subject, qs] of Object.entries(DEFAULT_QUESTIONS)) {
  const acc = mk()
  for (const q of qs) {
    if (!Array.isArray(q.options) || q.options.length < 2) continue
    const order = displayOrder(q.options, q.text)
    const seen = [...order].sort((a, b) => a - b)
    if (seen.length !== q.options.length || seen.some((v, i) => v !== i)) {
      brokenOrder.push(`${subject} · ${q.id}: ${JSON.stringify(order)} при ${q.options.length} вариантах`)
      continue
    }
    const place = order.indexOf(q.correct)
    if (place < 0) continue
    add(acc, place, q.options.length); add(shown, place, q.options.length)
  }
  if (acc.n) perTest.push([subject, acc])
}
if (brokenOrder.length) {
  console.log('')
  for (const b of brokenOrder) console.log(`  ✗ порядок показа — не перестановка: ${b}`)
  process.exit(1)
}

console.log('\n── Диагностики и placement (как их видит ученик) ──')
for (const [subject, acc] of perTest) {
  const [p, e] = worst(acc)
  console.log(`  ${subject.padEnd(13)} ${String(acc.n).padStart(4)}  худшее место ${p + 1}: ${e >= 0 ? '+' : ''}${e.toFixed(1)} п.п.  ${spread(acc)}`)
}

// ПОЧЕМУ НЕ ПРОЦЕНТНЫЕ ПУНКТЫ, КАК У КУРСОВ. В самом большом банке 32 вопроса,
// в самом маленьком 18: один вопрос весит там три-пять пунктов, и порог «+20»
// одновременно пропускал настоящую привычку у мелкого банка и ловил чистый шум
// у среднего (ap-chem-en давал ровно +20.0 на разбросе, а не на перекосе).
// Поэтому перевес меряется в СИГМАХ биномиального разброса: сколько вопросов
// село бы на это место само по себе, ± сколько такой счёт гуляет.
//
// 2.5σ выбраны по данным: до правки корейский placement давал 8.6σ, английский
// 6.2σ, химия 3.3σ — то есть настоящая привычка автора уходит далеко за порог,
// а разброс на банке в двадцать вопросов до него не достаёт.
const SIGMAS = 2.5
/** На сколько сигм место перебирает свой ожидаемый счёт. */
const sigmaOver = (acc, place) => {
  const expect = acc.chance                       // сумма 1/N по вопросам банка
  const p = expect / acc.n
  const sd = Math.sqrt(acc.n * p * (1 - p))
  return sd > 0 ? ((acc.pos.get(place) ?? 0) - expect) / sd : 0
}
const worstSigma = acc => [...acc.pos.keys()]
  .map(p => [p, sigmaOver(acc, p)])
  .sort((a, b) => b[1] - a[1])[0] ?? [0, 0]

const badTests = [['все тесты', shown], ...perTest].filter(([, acc]) => worstSigma(acc)[1] > SIGMAS)
if (badTests.length) {
  console.log('')
  for (const [where, acc] of badTests) {
    const [p, sg] = worstSigma(acc)
    console.log(`  ✗ ${where}: место ${p + 1} перебирает случай на ${sg.toFixed(1)}σ (потолок ${SIGMAS}σ)`)
  }
  console.log('\nПорядок показа считает displayOrder из src/data/taskTypes.ts — его зовёт DiagnosticTestPage.')
  process.exit(1)
}

// ── Банки вопросов вне курсов и вне тестов ──────────────────────────────────
//
// ЧТО ЭТО. Вопросы к текстам и аудио, сцены, лента, викторина справочника
// грамматики, тренажёр AP Chemistry. Они не собираются `one()` — значит, мимо
// placeCorrect и мимо первого раздела; и не показываются через displayOrder —
// значит, мимо второго. Сторож не видел их вовсе, и правило там было нарушено
// целиком: замер 26.08.2026 — 2492 вопроса, верный ответ на ВТОРОМ месте в 83%,
// у русских сцен во всех 20 из 20. Проверка «не стоит первым» на таких данных
// была бы зелёной.
//
// ПОЧЕМУ ЗДЕСЬ ПРАВЯТСЯ ДАННЫЕ, А НЕ ПОКАЗ. Довод второго раздела —
// «сохранённый номер варианта» — сюда не переносится: ответы на эти вопросы
// живут в состоянии экрана и номером в БД не ложатся. Значит, чинится сам файл,
// и правка видна в дифе, а не только в рантайме.
//
// ЕДИНИЦА ИЗМЕРЕНИЯ — то, что ученик проходит за раз: тексты одного языка,
// справочник одного языка, один тренажёр. Мерить файлами нельзя: тексты четырёх
// языков лежат в одном readingLibrary, а перекос английского банка не лечится
// корейским.

/**
 * Все вопросы с ОДНИМ верным ответом внутри любой структуры данных.
 *
 * Обход общий, потому что форма записи у банков разная, и сводить их к одной
 * ради сторожа значило бы переписывать рабочие данные под проверку:
 *   { options, correct } — тексты, аудио, сцены, лента;
 *   { options, answer }  — викторина справочника грамматики;
 *   { answers: [{ correct }] } — вопрос тренажёра.
 * Вопрос с несколькими верными не в счёт: у него место не определено.
 */
function questionsIn(root) {
  const out = []
  const seen = new Set()
  const walk = v => {
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) { for (const x of v) walk(x); return }
    const opts = Array.isArray(v.options) ? v.options : Array.isArray(v.choices) ? v.choices : null
    if (opts && opts.length >= 2 && opts.every(x => typeof x === 'string')) {
      const place = typeof v.correct === 'number' ? v.correct
        : typeof v.answer === 'number' ? v.answer
        : null
      if (Number.isInteger(place) && place >= 0 && place < opts.length) out.push({ n: opts.length, place })
    }
    if (Array.isArray(v.answers) && v.answers.length >= 2 && v.answers.every(a => a && typeof a.correct === 'boolean')) {
      const right = v.answers.filter(a => a.correct)
      if (right.length === 1) out.push({ n: v.answers.length, place: v.answers.indexOf(right[0]) })
    }
    for (const k of Object.keys(v)) walk(v[k])
  }
  walk(root)
  return out
}

const byLang = (items, label) => [...new Set(items.map(i => i.lang))].sort()
  .map(lang => [`${label} · ${lang}`, items.filter(i => i.lang === lang)])

const BANKS = [
  ...byLang(READING_LIBRARY, 'тексты'),
  ...byLang(LISTENING_LIBRARY, 'аудио'),
  ...byLang([...EN_SCENES, ...KO_SCENES, ...JA_SCENES, ...PT_SCENES, ...DE_SCENES, ...RU_SCENES], 'сцены'),
  ...byLang([...EN_FEED, ...KO_FEED, ...JA_FEED, ...PT_FEED], 'лента'),
  ['грамматика · ru', RUSSIAN_GRAMMAR],
  ['грамматика · de', GERMAN_GRAMMAR],
  ['грамматика · en', ENGLISH_GRAMMAR],
  ['грамматика · ko', KOREAN_GRAMMAR],
  ['тренажёр · AP Chemistry', AP_CHEM_TRAINERS],
]

const banks = mk()
const perBank = []
for (const [name, root] of BANKS) {
  const acc = mk()
  for (const q of questionsIn(root)) { add(acc, q.place, q.n); add(banks, q.place, q.n) }
  if (acc.n) perBank.push([name, acc])
}

console.log('\n── Банки вне курсов и вне тестов ──')
for (const [name, acc] of perBank) {
  const [p, sg] = worstSigma(acc)
  console.log(`  ${name.padEnd(24)} ${String(acc.n).padStart(4)}  худшее место ${p + 1}: ${sg >= 0 ? '+' : ''}${sg.toFixed(1)}σ  ${spread(acc)}`)
}

// Порог в сигмах, как у тестов, и по той же причине: банки разного размера —
// от девяти вопросов у португальских текстов до тысячи у английских сцен, и
// один вопрос весит в них по-разному. Меньше восьми вопросов не проверяем
// вовсе: там любое место — это один вопрос туда-сюда.
const badBanks = [['все банки', banks], ...perBank]
  .filter(([, acc]) => acc.n >= 8 && worstSigma(acc)[1] > SIGMAS)
if (badBanks.length) {
  console.log('')
  for (const [where, acc] of badBanks) {
    const [p, sg] = worstSigma(acc)
    console.log(`  ✗ ${where}: место ${p + 1} перебирает случай на ${sg.toFixed(1)}σ (потолок ${SIGMAS}σ)`)
  }
  console.log('\nЗдесь место лежит в самих данных: переставьте варианты вместе с номером верного (Р15).')
  process.exit(1)
}

// ── Полнота реестра ─────────────────────────────────────────────────────────
//
// Файл с вопросами-выбора, которого нет ни в одном из трёх разделов, не
// проверяется вообще — ровно так правило и оказалось нарушено на шести
// поверхностях сразу, пока сторож смотрел только в сиды. Поэтому исходники
// сверяются со списком учтённых файлов.
const COVERED = new Set([
  'src/data/placementTests.ts', 'src/data/diagnosticData.ts',
  'src/data/readingLibrary.ts', 'src/data/readingEn.ts', 'src/data/readingKo.ts', 'src/data/readingJa.ts',
  'src/data/listeningLibrary.ts', 'src/data/listeningLibraryExtra.ts',
  'src/data/scenes/scenesEn.ts', 'src/data/scenes/scenesKo.ts', 'src/data/scenes/scenesJa.ts',
  'src/data/scenes/scenesPt.ts', 'src/data/scenes/scenesDe.ts', 'src/data/scenes/scenesRu.ts',
  'src/data/feed/feedEn.ts', 'src/data/feed/feedKo.ts', 'src/data/feed/feedJa.ts', 'src/data/feed/feedPt.ts',
  'src/data/grammarRu.ts', 'src/data/grammarDe.ts', 'src/data/grammar/grammarEn.ts', 'src/data/grammar/grammarKo.ts',
  'src/data/apChemistry.ts',
])

/** Записи вопроса с выбором в исходнике: объектом и вызовом-строителем. */
const SHAPES = [
  /(options|choices):\s*\[[\s\S]{0,4000}?\]\s*,?\s*\n?\s*(correct|answer):\s*\d/,
  /\]\s*,\s*\d+\s*,\s*$/m,
]

/**
 * Содержимое сида: варианты собирает `one()` из languageCourse, место им
 * раскладывает placeCorrect, а меряет их первый раздел. Литерал «список и
 * номер» там тоже есть (`one(вопрос, [...], 0)`), и без этой отсечки сторож
 * полноты указывал бы на уже проверенное.
 */
const SEED_CONTENT = /\bfrom '[^']*languageCourse'/

function* tsFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name)
    if (e.isDirectory()) yield* tsFiles(path)
    else if (e.name.endsWith('.ts')) yield path
  }
}

const uncovered = []
for (const dir of ['src/data', 'src/lib']) {
  for (const file of tsFiles(dir)) {
    if (COVERED.has(file)) continue
    const text = readFileSync(file, 'utf8')
    if (SEED_CONTENT.test(text)) continue
    if (SHAPES.some(re => re.test(text))) uncovered.push(file)
  }
}
if (uncovered.length) {
  console.log('')
  for (const file of uncovered) console.log(`  ✗ ${file}: вопросы с выбором, которых сторож не меряет`)
  console.log('\nЗаведите банк в BANKS (или впишите файл в COVERED, если его меряет другой раздел).')
  process.exit(1)
}

console.log(`\n✓ ни одно место не перебирает случай больше чем на ${MAX_EXCESS} п.п. — вслепую не пройти`)
